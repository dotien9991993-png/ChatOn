const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');
const fbService = require('../services/facebook');

/**
 * API gửi tin nhắn (multi-tenant)
 */

// POST /api/messages/send — Nhân viên gửi tin nhắn trả lời khách
router.post('/send', async (req, res) => {
  const { conversationId, text } = req.body;

  if (!conversationId || !text) {
    return res.status(400).json({ error: 'Thiếu conversationId hoặc text' });
  }

  try {
    // 1. Get conversation + customer (verify tenant ownership)
    console.log(`[Messages] Sending message to conversation ${conversationId} for tenant ${req.tenantId}`);
    const { data: conv, error: convErr } = await supabaseAdmin
      .from('conversations')
      .select('*, customers(*)')
      .eq('id', conversationId)
      .eq('tenant_id', req.tenantId)
      .single();

    if (convErr || !conv) {
      console.error('[Messages] Conversation not found:', convErr?.message);
      return res.status(404).json({ error: 'Không tìm thấy conversation' });
    }

    // 2. Get channel's page_access_token for this tenant
    const { data: channel, error: chErr } = await supabaseAdmin
      .from('channels')
      .select('page_access_token, page_id')
      .eq('tenant_id', req.tenantId)
      .eq('type', conv.channel)
      .eq('connected', true)
      .single();

    if (chErr) {
      console.error('[Messages] Channel query error:', chErr.message);
    }

    const pageAccessToken = channel?.page_access_token;
    const recipientId = conv.customers?.external_id;

    console.log(`[Messages] Channel: ${conv.channel} | token length: ${(pageAccessToken || '').length} | recipientId: ${recipientId}`);

    if (!recipientId) {
      return res.status(400).json({ error: 'Không tìm thấy external_id khách hàng' });
    }

    // 3. Send via Facebook API (skip if no valid token — still save message locally)
    let fbSent = false;
    if (pageAccessToken && pageAccessToken !== 'paste_your_token_here' && pageAccessToken.length > 30) {
      const fbResult = await fbService.sendMessageWithToken(recipientId, text, pageAccessToken);
      if (!fbResult.success) {
        console.error('[Messages] Facebook send failed:', fbResult.error);
        // Don't return error — still save message locally for testing
      } else {
        fbSent = true;
      }
    } else {
      console.log('[Messages] No valid Facebook token — saving message locally only (demo mode)');
    }

    // 4. Insert message into DB
    const { data: message, error: msgErr } = await supabaseAdmin
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender: 'agent',
        text,
        type: 'text',
      })
      .select('*')
      .single();

    if (msgErr) {
      console.error('[Messages] Insert message error:', msgErr.message);
      return res.status(500).json({ error: 'Lỗi lưu tin nhắn: ' + msgErr.message });
    }

    // 5. Update conversation last_message
    const { error: updateErr } = await supabaseAdmin
      .from('conversations')
      .update({
        last_message: text,
        last_message_at: message.created_at,
      })
      .eq('id', conversationId);

    if (updateErr) {
      console.error('[Messages] Update conversation error:', updateErr.message);
    }

    // 6. Map to frontend shape
    const mappedMessage = {
      id: message.id,
      from: message.sender,
      text: message.text,
      type: message.type,
      timestamp: message.created_at,
      status: fbSent ? 'sent' : 'saved',
    };

    // 7. Emit real-time event scoped to tenant
    const io = req.app.get('io');
    io.to(`tenant:${req.tenantId}`).emit('message_sent', {
      conversationId,
      message: mappedMessage,
    });

    res.json({ success: true, message: mappedMessage, fbSent });
  } catch (err) {
    console.error('[Messages] POST /send UNCAUGHT error:', err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// POST /api/messages/note — Ghi chú nội bộ (không gửi cho khách)
router.post('/note', async (req, res) => {
  const { conversationId, text } = req.body;

  if (!conversationId || !text) {
    return res.status(400).json({ error: 'Thiếu conversationId hoặc text' });
  }

  try {
    // Verify tenant ownership
    const { data: conv, error: convErr } = await supabaseAdmin
      .from('conversations')
      .select('id')
      .eq('id', conversationId)
      .eq('tenant_id', req.tenantId)
      .single();

    if (convErr || !conv) {
      return res.status(404).json({ error: 'Không tìm thấy conversation' });
    }

    const authorName = req.profile?.display_name || 'Agent';

    // Insert internal note — NOT sent to Facebook, NOT updating last_message
    const { data: message, error: msgErr } = await supabaseAdmin
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender: 'system',
        text,
        type: 'internal_note',
      })
      .select('*')
      .single();

    if (msgErr) {
      return res.status(500).json({ error: 'Lỗi lưu ghi chú: ' + msgErr.message });
    }

    const mappedMessage = {
      id: message.id,
      from: message.sender,
      text: message.text,
      type: message.type,
      timestamp: message.created_at,
      author: authorName,
    };

    // Emit real-time event so agents see it
    const io = req.app.get('io');
    io.to(`tenant:${req.tenantId}`).emit('new_message', {
      conversation: { id: conversationId },
      message: mappedMessage,
    });

    res.json({ success: true, message: mappedMessage });
  } catch (err) {
    console.error('[Messages] POST /note error:', err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

module.exports = router;
