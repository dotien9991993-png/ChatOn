const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');
const { processWithAI } = require('../services/ai-engine');

/**
 * Livechat API — Public routes (no auth middleware)
 * Used by the website widget to send/receive messages
 */

// GET /api/livechat/config/:tenantSlug — Widget config
router.get('/config/:tenantSlug', async (req, res) => {
  try {
    const { data: tenant, error } = await supabaseAdmin
      .from('tenants')
      .select('id, shop_info')
      .eq('slug', req.params.tenantSlug)
      .single();

    if (error || !tenant) {
      return res.status(404).json({ error: 'Shop not found' });
    }

    // Get widget config from livechat channel
    const { data: channel } = await supabaseAdmin
      .from('channels')
      .select('widget_config')
      .eq('tenant_id', tenant.id)
      .eq('type', 'livechat')
      .single();

    // Check if any agents are online (last seen within 5 min)
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { count: onlineCount } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenant.id)
      .gte('online_at', fiveMinAgo);

    res.json({
      tenantId: tenant.id,
      shopName: tenant.shop_info?.name || 'Shop',
      online: (onlineCount || 0) > 0,
      config: channel?.widget_config || {},
    });
  } catch (err) {
    console.error('[Livechat] GET /config error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/livechat/message — Send message from visitor
router.post('/message', async (req, res) => {
  try {
    const { tenantSlug, visitorId, text, name, email } = req.body;

    if (!tenantSlug || !visitorId || !text) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Find tenant
    const { data: tenant, error: tErr } = await supabaseAdmin
      .from('tenants')
      .select('id, ai_config')
      .eq('slug', tenantSlug)
      .single();

    if (tErr || !tenant) {
      return res.status(404).json({ error: 'Shop not found' });
    }

    const tenantId = tenant.id;

    // Upsert livechat visitor
    await supabaseAdmin
      .from('livechat_visitors')
      .upsert({
        tenant_id: tenantId,
        visitor_id: visitorId,
        name: name || null,
        email: email || null,
        last_seen_at: new Date().toISOString(),
      }, { onConflict: 'tenant_id,visitor_id' });

    // Find or create customer
    const { data: existingCustomer } = await supabaseAdmin
      .from('customers')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('channel_type', 'livechat')
      .eq('external_id', visitorId)
      .single();

    let customerId;
    if (existingCustomer) {
      customerId = existingCustomer.id;
      if (name || email) {
        const updates = {};
        if (name) updates.name = name;
        if (email) updates.email = email;
        await supabaseAdmin.from('customers').update(updates).eq('id', customerId);
      }
    } else {
      const { data: newCustomer, error: custErr } = await supabaseAdmin
        .from('customers')
        .insert({
          tenant_id: tenantId,
          channel_type: 'livechat',
          external_id: visitorId,
          name: name || 'Khách web',
          email: email || null,
        })
        .select('id')
        .single();

      if (custErr) {
        return res.status(500).json({ error: 'Error creating customer' });
      }
      customerId = newCustomer.id;
    }

    // Find or create conversation
    const { data: existingConv } = await supabaseAdmin
      .from('conversations')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('customer_id', customerId)
      .single();

    let conversationId;
    if (existingConv) {
      conversationId = existingConv.id;
      await supabaseAdmin
        .from('conversations')
        .update({
          last_message: text,
          last_message_at: new Date().toISOString(),
          status: 'active',
        })
        .eq('id', conversationId);
      await supabaseAdmin.rpc('increment_unread', { conv_id: conversationId });
    } else {
      const { data: newConv, error: convErr } = await supabaseAdmin
        .from('conversations')
        .insert({
          tenant_id: tenantId,
          customer_id: customerId,
          channel: 'livechat',
          status: 'active',
          last_message: text,
          last_message_at: new Date().toISOString(),
          unread: 1,
        })
        .select('id')
        .single();

      if (convErr) {
        return res.status(500).json({ error: 'Error creating conversation' });
      }
      conversationId = newConv.id;
    }

    // Insert message
    const { data: message, error: msgErr } = await supabaseAdmin
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender: 'customer',
        text,
        type: 'text',
      })
      .select('*')
      .single();

    if (msgErr) {
      return res.status(500).json({ error: 'Error saving message' });
    }

    // Get customer for emit
    const { data: customer } = await supabaseAdmin
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .single();

    const { data: conv } = await supabaseAdmin
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    // Emit to tenant room
    const io = req.app.get('io');
    io.to(`tenant:${tenantId}`).emit('new_message', {
      conversation: {
        id: conv.id,
        senderId: customer.external_id,
        name: customer.name,
        avatar: customer.avatar,
        channel: conv.channel,
        phone: customer.phone || '',
        notes: customer.notes || '',
        status: conv.status,
        lastMessage: conv.last_message,
        lastMessageAt: conv.last_message_at,
        unread: conv.unread,
        createdAt: conv.created_at,
      },
      message: {
        id: message.id,
        from: message.sender,
        text: message.text,
        type: message.type,
        timestamp: message.created_at,
      },
    });

    // AI auto-reply if enabled
    let aiReply = null;
    try {
      const aiConfig = tenant.ai_config || {};
      const tenantAiEnabled = aiConfig.enabled !== false;
      const convAiEnabled = conv.ai_enabled !== false;
      const hasApiKey = !!aiConfig.apiKey;

      if (tenantAiEnabled && convAiEnabled && hasApiKey) {
        const aiResult = await Promise.race([
          processWithAI({ tenantId, conversationId, customerMessage: text, io }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('AI timeout')), 15000)),
        ]);

        if (aiResult.reply && !aiResult.handoff) {
          // Save AI reply
          const { data: aiMsg } = await supabaseAdmin
            .from('messages')
            .insert({
              conversation_id: conversationId,
              sender: 'ai',
              text: aiResult.reply,
              type: 'text',
              ai_generated: true,
            })
            .select('*')
            .single();

          await supabaseAdmin
            .from('conversations')
            .update({
              last_message: aiResult.reply,
              last_message_at: new Date().toISOString(),
            })
            .eq('id', conversationId);

          if (aiMsg) {
            io.to(`tenant:${tenantId}`).emit('new_message', {
              conversation: { id: conversationId },
              message: {
                id: aiMsg.id,
                from: 'ai',
                text: aiMsg.text,
                type: aiMsg.type,
                timestamp: aiMsg.created_at,
                ai_generated: true,
              },
            });
          }

          aiReply = aiResult.reply;
        }
      }
    } catch (aiErr) {
      console.error('[Livechat] AI error (non-fatal):', aiErr.message);
    }

    res.json({
      messageId: message.id,
      conversationId,
      aiReply,
    });
  } catch (err) {
    console.error('[Livechat] POST /message error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/livechat/messages/:visitorId — Message history
router.get('/messages/:visitorId', async (req, res) => {
  try {
    const { tenantSlug } = req.query;
    if (!tenantSlug) {
      return res.status(400).json({ error: 'Missing tenantSlug' });
    }

    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('id')
      .eq('slug', tenantSlug)
      .single();

    if (!tenant) {
      return res.status(404).json({ error: 'Shop not found' });
    }

    // Find customer by visitor_id
    const { data: customer } = await supabaseAdmin
      .from('customers')
      .select('id')
      .eq('tenant_id', tenant.id)
      .eq('channel_type', 'livechat')
      .eq('external_id', req.params.visitorId)
      .single();

    if (!customer) {
      return res.json([]);
    }

    // Find conversation
    const { data: conv } = await supabaseAdmin
      .from('conversations')
      .select('id')
      .eq('tenant_id', tenant.id)
      .eq('customer_id', customer.id)
      .single();

    if (!conv) {
      return res.json([]);
    }

    // Get messages (exclude internal notes)
    const { data: messages } = await supabaseAdmin
      .from('messages')
      .select('id, sender, text, type, created_at, ai_generated')
      .eq('conversation_id', conv.id)
      .neq('type', 'internal_note')
      .order('created_at', { ascending: true });

    res.json(
      (messages || []).map((m) => ({
        id: m.id,
        from: m.sender,
        text: m.text,
        type: m.type,
        timestamp: m.created_at,
        ai_generated: m.ai_generated || false,
      }))
    );
  } catch (err) {
    console.error('[Livechat] GET /messages error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
