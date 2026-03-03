const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');

/**
 * API quản lý conversations (multi-tenant via req.tenantId)
 */

// GET /api/conversations — Danh sách tất cả conversations của tenant
router.get('/', async (req, res) => {
  try {
    const { data: conversations, error } = await supabaseAdmin
      .from('conversations')
      .select('*, customers(*), assigned_profile:profiles!conversations_assigned_to_fkey(id, display_name)')
      .eq('tenant_id', req.tenantId)
      .order('last_message_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    // Count messages for each conversation
    const result = await Promise.all(
      conversations.map(async (conv) => {
        const { count } = await supabaseAdmin
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', conv.id);

        const customer = conv.customers;
        return {
          id: conv.id,
          senderId: customer?.external_id || '',
          name: customer?.name || 'Khách hàng',
          avatar: customer?.avatar || null,
          channel: conv.channel,
          page_id: conv.page_id || null,
          phone: customer?.phone || '',
          notes: customer?.notes || '',
          address: customer?.address || '',
          status: conv.status,
          ai_enabled: conv.ai_enabled !== false,
          assigned_to: conv.assigned_to || null,
          assigned_name: conv.assigned_profile?.display_name || null,
          lastMessage: conv.last_message || '',
          lastMessageAt: conv.last_message_at,
          unread: conv.unread || 0,
          messageCount: count || 0,
          createdAt: conv.created_at,
        };
      })
    );

    res.json(result);
  } catch (err) {
    console.error('[Conversations] GET / error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/conversations/:id — Chi tiết 1 conversation + messages
router.get('/:id', async (req, res) => {
  try {
    const { data: conv, error: convError } = await supabaseAdmin
      .from('conversations')
      .select('*, customers(*), assigned_profile:profiles!conversations_assigned_to_fkey(id, display_name)')
      .eq('id', req.params.id)
      .eq('tenant_id', req.tenantId)
      .single();

    if (convError || !conv) {
      return res.status(404).json({ error: 'Không tìm thấy conversation' });
    }

    const { data: messages, error: msgError } = await supabaseAdmin
      .from('messages')
      .select('*')
      .eq('conversation_id', conv.id)
      .order('created_at', { ascending: true });

    if (msgError) {
      return res.status(500).json({ error: msgError.message });
    }

    const customer = conv.customers;
    res.json({
      id: conv.id,
      senderId: customer?.external_id || '',
      name: customer?.name || 'Khách hàng',
      avatar: customer?.avatar || null,
      channel: conv.channel,
      phone: customer?.phone || '',
      notes: customer?.notes || '',
      address: customer?.address || '',
      status: conv.status,
      ai_enabled: conv.ai_enabled !== false,
      assigned_to: conv.assigned_to || null,
      assigned_name: conv.assigned_profile?.display_name || null,
      lastMessage: conv.last_message || '',
      lastMessageAt: conv.last_message_at,
      unread: conv.unread || 0,
      messageCount: messages.length,
      createdAt: conv.created_at,
      messages: messages.map((m) => ({
        id: m.id,
        from: m.sender,
        text: m.text,
        type: m.type,
        media_url: m.media_url || null,
        timestamp: m.created_at,
        ai_generated: m.ai_generated || false,
        status: (m.sender === 'agent' || m.sender === 'ai') ? 'sent' : undefined,
      })),
    });
  } catch (err) {
    console.error('[Conversations] GET /:id error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/conversations/:id — Cập nhật thông tin (phone, notes, status)
router.put('/:id', async (req, res) => {
  try {
    const { phone, notes, status, ai_enabled, assigned_to } = req.body;

    // Verify ownership
    const { data: conv, error: findErr } = await supabaseAdmin
      .from('conversations')
      .select('id, customer_id')
      .eq('id', req.params.id)
      .eq('tenant_id', req.tenantId)
      .single();

    if (findErr || !conv) {
      return res.status(404).json({ error: 'Không tìm thấy conversation' });
    }

    // Update customer phone/notes
    if (phone !== undefined || notes !== undefined) {
      const customerUpdate = {};
      if (phone !== undefined) customerUpdate.phone = phone;
      if (notes !== undefined) customerUpdate.notes = notes;
      await supabaseAdmin
        .from('customers')
        .update(customerUpdate)
        .eq('id', conv.customer_id);
    }

    // Update conversation fields
    const convUpdate = {};
    if (status !== undefined) convUpdate.status = status;
    if (ai_enabled !== undefined) convUpdate.ai_enabled = ai_enabled;
    if (assigned_to !== undefined) convUpdate.assigned_to = assigned_to || null;
    if (Object.keys(convUpdate).length > 0) {
      await supabaseAdmin
        .from('conversations')
        .update(convUpdate)
        .eq('id', conv.id);
    }

    // If status changed to 'resolved', insert system message
    if (status === 'resolved') {
      const agentName = req.profile?.display_name || 'Agent';
      const sysText = `Hội thoại đã được đánh dấu hoàn thành bởi ${agentName}`;
      const { data: sysMsg } = await supabaseAdmin
        .from('messages')
        .insert({
          conversation_id: conv.id,
          sender: 'system',
          text: sysText,
          type: 'system',
        })
        .select('*')
        .single();

      const io = req.app.get('io');
      if (sysMsg) {
        io.to(`tenant:${req.tenantId}`).emit('new_message', {
          conversation: { id: conv.id },
          message: {
            id: sysMsg.id,
            from: sysMsg.sender,
            text: sysMsg.text,
            type: sysMsg.type,
            timestamp: sysMsg.created_at,
          },
        });
      }
      io.to(`tenant:${req.tenantId}`).emit('conversation_updated', {
        id: conv.id, phone, notes, status, ai_enabled, assigned_to,
      });
    } else {
      // Emit to tenant room
      const io = req.app.get('io');
      io.to(`tenant:${req.tenantId}`).emit('conversation_updated', {
        id: conv.id, phone, notes, status, ai_enabled, assigned_to,
      });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[Conversations] PUT /:id error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/conversations/:id/read — Đánh dấu đã đọc
router.put('/:id/read', async (req, res) => {
  try {
    const { error } = await supabaseAdmin
      .from('conversations')
      .update({ unread: 0 })
      .eq('id', req.params.id)
      .eq('tenant_id', req.tenantId);

    if (error) {
      return res.status(404).json({ error: 'Không tìm thấy conversation' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[Conversations] PUT /:id/read error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
