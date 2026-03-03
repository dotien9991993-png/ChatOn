const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const config = require('../config');
const zaloService = require('../services/zalo');
const { supabaseAdmin } = require('../config/supabase');
const { processWithAI } = require('../services/ai-engine');
const { matchChatbotRule } = require('../services/chatbot-matcher');

// Dedup: track processed message IDs
const processedMsgIds = new Map();
const DEDUP_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Verify Zalo webhook signature (mac field in body)
 * Zalo signs: HMAC-SHA256(oa_secret, app_id + JSON.stringify(data) + timestamp)
 */
function verifyZaloSignature(req, res, next) {
  if (!config.zalo.oaSecret) {
    console.warn('[Zalo Webhook] oaSecret not configured — skipping signature verification');
    return next();
  }

  const mac = req.body?.mac;
  if (!mac) {
    console.warn('[Zalo Webhook] Missing mac in body');
    return res.sendStatus(403);
  }

  // Zalo signature: HMAC-SHA256(oaSecret, appId + data + timestamp)
  const { app_id, timestamp } = req.body;
  const data = JSON.stringify(req.body.data || {});
  const rawData = `${app_id}${data}${timestamp}`;

  const expected = crypto
    .createHmac('sha256', config.zalo.oaSecret)
    .update(rawData)
    .digest('hex');

  if (mac !== expected) {
    console.warn('[Zalo Webhook] Invalid signature');
    return res.sendStatus(403);
  }

  next();
}

// GET /webhook/zalo — Health check for Zalo webhook verification
router.get('/', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

// POST /webhook/zalo — Receive Zalo events
router.post('/', verifyZaloSignature, async (req, res) => {
  // Respond 200 immediately (same pattern as Facebook)
  res.status(200).json({ status: 'ok' });

  const body = req.body;
  const eventName = body.event_name;
  const appId = body.app_id;
  const timestamp = body.timestamp;
  const data = body.data || {};

  console.log(`[Zalo Webhook] Event: ${eventName} | app_id: ${appId} | ts: ${timestamp}`);

  // Only handle message events
  if (eventName === 'follow' || eventName === 'unfollow') {
    console.log(`[Zalo Webhook] ${eventName} event — logged, no action`);
    return;
  }

  // Message events: user_send_text, user_send_image, user_send_file, user_send_sticker, etc.
  if (!eventName?.startsWith('user_send_')) return;

  const io = req.app.get('io');
  const oaId = body.oa_id || data.oa_id;
  const senderId = body.user_id_by_app || data.user_id_by_app;
  const msgId = data.msg_id;

  if (!oaId || !senderId) {
    console.warn('[Zalo Webhook] Missing oa_id or user_id_by_app');
    return;
  }

  // Dedup
  if (msgId && processedMsgIds.has(msgId)) return;
  if (msgId) {
    processedMsgIds.set(msgId, Date.now());
    setTimeout(() => processedMsgIds.delete(msgId), DEDUP_TTL);
  }

  // Determine message text based on event type
  let text;
  if (eventName === 'user_send_text') {
    text = data.content || data.text || '';
  } else if (eventName === 'user_send_image') {
    text = '[Hinh anh]';
  } else if (eventName === 'user_send_file') {
    text = '[File]';
  } else if (eventName === 'user_send_sticker') {
    text = '[Sticker]';
  } else if (eventName === 'user_send_gif') {
    text = '[GIF]';
  } else if (eventName === 'user_send_audio') {
    text = '[Audio]';
  } else if (eventName === 'user_send_video') {
    text = '[Video]';
  } else if (eventName === 'user_send_location') {
    text = '[Vi tri]';
  } else {
    text = '[Tin nhan]';
  }

  if (!text) return;

  try {
    // 1. Look up channel by oa_id
    const { data: channel, error: chErr } = await supabaseAdmin
      .from('channels')
      .select('id, tenant_id, page_access_token, config')
      .eq('page_id', oaId)
      .eq('type', 'zalo')
      .eq('connected', true)
      .limit(1)
      .single();

    if (chErr || !channel) {
      console.warn(`[Zalo Webhook] No tenant found for oa_id ${oaId}`);
      return;
    }

    const { id: channelId, tenant_id: tenantId, page_access_token: accessToken } = channel;
    console.log(`[Zalo Webhook] Message from ${senderId} (tenant: ${tenantId}): "${text}"`);

    // 2. Get user profile from Zalo
    const profile = await zaloService.getUserProfile(senderId, accessToken);

    // 3. Find or create customer
    const { data: existingCustomer } = await supabaseAdmin
      .from('customers')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('channel_type', 'zalo')
      .eq('external_id', senderId)
      .limit(1)
      .single();

    let customerId;
    if (existingCustomer) {
      customerId = existingCustomer.id;
      if (profile.name) {
        await supabaseAdmin
          .from('customers')
          .update({ name: profile.name, avatar: profile.avatar })
          .eq('id', customerId);
      }
    } else {
      const { data: newCustomer, error: custErr } = await supabaseAdmin
        .from('customers')
        .insert({
          tenant_id: tenantId,
          channel_type: 'zalo',
          external_id: senderId,
          name: profile.name || 'Khach hang Zalo',
          avatar: profile.avatar,
        })
        .select('id')
        .single();

      if (custErr) {
        console.error('[Zalo Webhook] Error creating customer:', custErr.message);
        return;
      }
      customerId = newCustomer.id;
    }

    // 4. Find or create conversation
    const { data: existingConv } = await supabaseAdmin
      .from('conversations')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('customer_id', customerId)
      .limit(1)
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
          page_id: oaId,
        })
        .eq('id', conversationId);
      await supabaseAdmin.rpc('increment_unread', { conv_id: conversationId });
    } else {
      const { data: newConv, error: convErr } = await supabaseAdmin
        .from('conversations')
        .insert({
          tenant_id: tenantId,
          customer_id: customerId,
          channel: 'zalo',
          page_id: oaId,
          status: 'active',
          last_message: text,
          last_message_at: new Date().toISOString(),
          unread: 1,
        })
        .select('id')
        .single();

      if (convErr) {
        console.error('[Zalo Webhook] Error creating conversation:', convErr.message);
        return;
      }
      conversationId = newConv.id;

      // Welcome message for NEW conversations
      try {
        const { data: welcomeTenant } = await supabaseAdmin
          .from('tenants')
          .select('ai_config')
          .eq('id', tenantId)
          .single();

        const welcomeConfig = welcomeTenant?.ai_config || {};
        if (welcomeConfig.welcome_message_enabled && welcomeConfig.welcome_message_text) {
          const welcomeText = welcomeConfig.welcome_message_text;

          await zaloService.sendMessage(senderId, welcomeText, accessToken);

          await supabaseAdmin.from('messages').insert({
            conversation_id: conversationId,
            sender: 'system',
            text: welcomeText,
            type: 'welcome',
          });
        }
      } catch (welcomeErr) {
        console.error('[Zalo Webhook] Welcome message error (non-fatal):', welcomeErr.message);
      }
    }

    // 5. Insert message
    const { data: message, error: msgErr } = await supabaseAdmin
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender: 'customer',
        text,
        type: eventName === 'user_send_text' ? 'text' : 'attachment',
      })
      .select('*')
      .single();

    if (msgErr) {
      console.error('[Zalo Webhook] Error inserting message:', msgErr.message);
      return;
    }

    // 6. Get full customer + conversation for emit
    const { data: customer } = await supabaseAdmin
      .from('customers').select('*').eq('id', customerId).single();

    const { data: conv } = await supabaseAdmin
      .from('conversations').select('*').eq('id', conversationId).single();

    // 7. Emit real-time event
    io.to(`tenant:${tenantId}`).emit('new_message', {
      conversation: {
        id: conv.id,
        senderId: customer.external_id,
        name: customer.name,
        avatar: customer.avatar,
        channel: conv.channel,
        page_id: conv.page_id || oaId,
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

    console.log(`[Zalo Webhook] Processed -> conversation ${conversationId}`);

    // 8. Chatbot rule matching (BEFORE AI)
    let ruleMatched = false;
    try {
      const ruleResult = await matchChatbotRule(tenantId, text);
      if (ruleResult) {
        ruleMatched = true;
        console.log(`[Zalo Webhook] Rule matched: "${ruleResult.ruleName}"`);

        await zaloService.sendMessage(senderId, ruleResult.responseText, accessToken);

        const { data: ruleMsg } = await supabaseAdmin
          .from('messages')
          .insert({
            conversation_id: conversationId,
            sender: 'ai',
            text: ruleResult.responseText,
            type: 'chatbot_rule',
          })
          .select('*')
          .single();

        await supabaseAdmin
          .from('conversations')
          .update({
            last_message: ruleResult.responseText,
            last_message_at: new Date().toISOString(),
          })
          .eq('id', conversationId);

        if (ruleMsg) {
          const { data: updatedConv } = await supabaseAdmin
            .from('conversations').select('*').eq('id', conversationId).single();

          io.to(`tenant:${tenantId}`).emit('new_message', {
            conversation: {
              id: updatedConv.id,
              senderId: customer.external_id,
              name: customer.name,
              avatar: customer.avatar,
              channel: updatedConv.channel,
              phone: customer.phone || '',
              notes: customer.notes || '',
              status: updatedConv.status,
              lastMessage: updatedConv.last_message,
              lastMessageAt: updatedConv.last_message_at,
              unread: updatedConv.unread,
              createdAt: updatedConv.created_at,
            },
            message: {
              id: ruleMsg.id,
              from: 'ai',
              text: ruleMsg.text,
              type: ruleMsg.type,
              timestamp: ruleMsg.created_at,
            },
          });
        }
      }
    } catch (ruleErr) {
      console.error('[Zalo Webhook] Rule matching error (non-fatal):', ruleErr.message);
    }

    // 9. AI Auto-reply (skip if rule matched)
    if (!ruleMatched) try {
      const { data: tenant } = await supabaseAdmin
        .from('tenants')
        .select('ai_config')
        .eq('id', tenantId)
        .single();

      const aiConfig = tenant?.ai_config || {};
      const tenantAiEnabled = aiConfig.enabled !== false;
      const convAiEnabled = conv.ai_enabled !== false;
      const hasApiKey = !!aiConfig.apiKey;

      if (tenantAiEnabled && convAiEnabled && hasApiKey) {
        console.log(`[Zalo Webhook] AI processing for conversation ${conversationId}...`);

        const aiResult = await Promise.race([
          processWithAI({ tenantId, conversationId, customerMessage: text, io }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('AI timeout')), 30000)),
        ]);

        if (aiResult.reply && !aiResult.handoff) {
          const { data: aiMessage } = await supabaseAdmin
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

          const sendResult = await zaloService.sendMessage(senderId, aiResult.reply, accessToken);
          if (!sendResult.success) {
            console.error(`[Zalo Webhook] AI reply failed to send:`, sendResult.error);
          }

          await supabaseAdmin
            .from('conversations')
            .update({
              last_message: aiResult.reply,
              last_message_at: new Date().toISOString(),
            })
            .eq('id', conversationId);

          if (aiMessage) {
            const { data: updatedConv } = await supabaseAdmin
              .from('conversations').select('*').eq('id', conversationId).single();

            io.to(`tenant:${tenantId}`).emit('new_message', {
              conversation: {
                id: updatedConv.id,
                senderId: customer.external_id,
                name: customer.name,
                avatar: customer.avatar,
                channel: updatedConv.channel,
                phone: customer.phone || '',
                notes: customer.notes || '',
                status: updatedConv.status,
                lastMessage: updatedConv.last_message,
                lastMessageAt: updatedConv.last_message_at,
                unread: updatedConv.unread,
                createdAt: updatedConv.created_at,
              },
              message: {
                id: aiMessage.id,
                from: 'ai',
                text: aiMessage.text,
                type: aiMessage.type,
                timestamp: aiMessage.created_at,
                ai_generated: true,
              },
            });
          }

          console.log(`[Zalo Webhook] AI replied to conversation ${conversationId}`);
        }
      }
    } catch (aiErr) {
      console.error('[Zalo Webhook] AI error (non-fatal):', aiErr.message);
    }
  } catch (err) {
    console.error('[Zalo Webhook] Processing error:', err.message);
  }
});

module.exports = router;
