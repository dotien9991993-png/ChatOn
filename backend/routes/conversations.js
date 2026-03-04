const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');
const fbService = require('../services/facebook');

// Sync cache: 5-minute TTL per conversation
const syncCache = new Map();
const SYNC_CACHE_TTL = 5 * 60 * 1000;

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

// GET /api/conversations/:id/sync-messages — Sync messages from Facebook Conversation API
router.get('/:id/sync-messages', async (req, res) => {
  try {
    const convId = req.params.id;

    // Check cache — skip if synced within 5 minutes
    const cached = syncCache.get(convId);
    if (cached && (Date.now() - cached) < SYNC_CACHE_TTL) {
      return res.json({ success: true, newMessages: 0, total: 0, cached: true });
    }

    // Get conversation
    const { data: conv, error: convErr } = await supabaseAdmin
      .from('conversations')
      .select('*, customers(*)')
      .eq('id', convId)
      .eq('tenant_id', req.tenantId)
      .single();

    if (convErr || !conv) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Only sync Facebook conversations
    if (conv.channel !== 'facebook') {
      return res.json({ success: true, newMessages: 0, total: 0, skipped: 'not_facebook' });
    }

    const pageId = conv.page_id;
    const psid = conv.customers?.external_id;
    if (!pageId || !psid) {
      return res.json({ success: true, newMessages: 0, total: 0, skipped: 'missing_page_or_psid' });
    }

    // Get page access token
    const token = await fbService.getChannelToken(req.tenantId, pageId);
    if (!token) {
      return res.json({ success: true, newMessages: 0, total: 0, skipped: 'no_token' });
    }

    // Get Facebook conversation ID
    const fbConvId = await fbService.getConversation(pageId, psid, token);
    if (!fbConvId) {
      syncCache.set(convId, Date.now());
      return res.json({ success: true, newMessages: 0, total: 0, skipped: 'no_fb_conversation' });
    }

    // Fetch messages from Facebook
    const fbMessages = await fbService.getConversationMessages(fbConvId, token);
    if (!fbMessages.length) {
      syncCache.set(convId, Date.now());
      return res.json({ success: true, newMessages: 0, total: 0 });
    }

    // Get existing facebook_mids for dedup
    const { data: existingMsgs } = await supabaseAdmin
      .from('messages')
      .select('facebook_mid')
      .eq('conversation_id', convId)
      .not('facebook_mid', 'is', null);

    const existingMids = new Set((existingMsgs || []).map((m) => m.facebook_mid));

    // Filter new messages
    const newFbMessages = fbMessages.filter((m) => m.id && !existingMids.has(m.id));

    if (!newFbMessages.length) {
      syncCache.set(convId, Date.now());
      return res.json({ success: true, newMessages: 0, total: fbMessages.length });
    }

    // Map and batch insert
    const toInsert = newFbMessages.map((m) => {
      const sender = m.from?.id === pageId ? 'agent' : 'customer';
      let text = m.message || null;
      let mediaUrl = null;
      let type = 'text';

      if (m.attachments?.data?.length) {
        const imgAttach = m.attachments.data.find((a) => a.mime_type?.startsWith('image') || a.type === 'image');
        if (imgAttach) {
          mediaUrl = imgAttach.image_data?.url || imgAttach.file_url || null;
          type = 'image';
        }
        if (!text) {
          text = type === 'image' ? '[Hình ảnh]' : '[Đính kèm]';
        }
      }

      return {
        conversation_id: convId,
        sender,
        text,
        type,
        media_url: mediaUrl,
        facebook_mid: m.id,
        created_at: m.created_time || new Date().toISOString(),
      };
    });

    // Batch insert 100 at a time
    let inserted = 0;
    for (let i = 0; i < toInsert.length; i += 100) {
      const batch = toInsert.slice(i, i + 100);
      const { error: insertErr } = await supabaseAdmin
        .from('messages')
        .insert(batch);
      if (insertErr) {
        console.error('[Sync] Batch insert error:', insertErr.message);
      } else {
        inserted += batch.length;
      }
    }

    syncCache.set(convId, Date.now());
    console.log(`[Sync] Conversation ${convId}: ${inserted} new messages from Facebook`);

    res.json({ success: true, newMessages: inserted, total: fbMessages.length });
  } catch (err) {
    console.error('[Sync] GET /:id/sync-messages error:', err.message);
    res.status(500).json({ error: 'Sync failed' });
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
