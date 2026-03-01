const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const config = require('../config');
const fbService = require('../services/facebook');
const { supabaseAdmin } = require('../config/supabase');
const { processWithAI } = require('../services/ai-engine');
const { matchChatbotRule } = require('../services/chatbot-matcher');

// Dedup: track processed message IDs to handle Facebook retries
const processedMids = new Map();
const DEDUP_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Facebook Webhook Routes
 * - GET: Xác minh webhook (Facebook gửi khi đăng ký)
 * - POST: Nhận tin nhắn từ Facebook Messenger (multi-tenant)
 */

/**
 * Verify Facebook webhook signature (X-Hub-Signature-256)
 */
function verifyWebhookSignature(req, res, next) {
  if (!config.fb.appSecret) {
    console.error('[Webhook] appSecret not configured — rejecting request');
    return res.sendStatus(403);
  }

  const signature = req.headers['x-hub-signature-256'];
  if (!signature) {
    console.warn('[Webhook] Missing X-Hub-Signature-256 header');
    return res.sendStatus(403);
  }

  const expected = 'sha256=' + crypto
    .createHmac('sha256', config.fb.appSecret)
    .update(req.rawBody || '')
    .digest('hex');

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    console.warn('[Webhook] Invalid signature');
    return res.sendStatus(403);
  }

  next();
}

// GET /webhook/facebook — Xác minh webhook
router.get('/', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === config.fb.verifyToken) {
    console.log('[Webhook] Verified successfully');
    return res.status(200).send(challenge);
  }

  console.warn('[Webhook] Verification failed — token mismatch');
  return res.sendStatus(403);
});

// POST /webhook/facebook — Nhận tin nhắn (multi-tenant via pageId lookup)
router.post('/', verifyWebhookSignature, async (req, res) => {
  const body = req.body;

  // Facebook yêu cầu trả 200 ngay lập tức
  res.status(200).send('EVENT_RECEIVED');

  if (body.object !== 'page') return;

  const io = req.app.get('io');

  for (const entry of body.entry || []) {
    const pageId = entry.id;

    // Look up which tenant owns this page
    const { data: channel, error: chErr } = await supabaseAdmin
      .from('channels')
      .select('id, tenant_id, page_access_token')
      .eq('page_id', pageId)
      .eq('connected', true)
      .single();

    if (chErr || !channel) {
      console.warn(`[Webhook] No tenant found for pageId ${pageId}`);
      continue;
    }

    const { id: channelId, tenant_id: tenantId, page_access_token: pageAccessToken } = channel;

    // === Handle feed/comment events ===
    if (entry.changes) {
      for (const change of entry.changes) {
        if (change.field === 'feed' && change.value?.item === 'comment') {
          await handleCommentEvent(change.value, channelId, tenantId, pageAccessToken, io);
        }
      }
    }

    for (const event of entry.messaging || []) {
      // Handle postback events (from button template)
      if (event.postback && !event.message) {
        event.message = { text: event.postback.title || event.postback.payload };
      }
      if (!event.message) continue;

      // Fix 2: Skip echo messages (page's own sent messages)
      if (event.message.is_echo) continue;

      // Fix 3: Dedup — skip already-processed message IDs
      const mid = event.message.mid;
      if (mid && processedMids.has(mid)) continue;
      if (mid) {
        processedMids.set(mid, Date.now());
        setTimeout(() => processedMids.delete(mid), DEDUP_TTL);
      }

      // Fix 4: Handle text or attachments
      let text = event.message.text;
      if (!text && event.message.attachments) {
        const typeMap = { image: '[Hinh anh]', video: '[Video]', audio: '[Audio]', file: '[File]' };
        const types = event.message.attachments.map(a => typeMap[a.type] || '[Dinh kem]');
        text = types.join(' ');
      }
      if (!text) continue;

      const senderId = event.sender.id;

      console.log(`[Webhook] Message from ${senderId} (tenant: ${tenantId}): "${text}"`);

      try {
        // 1. Get customer profile from Facebook
        const profile = await fbService.getUserProfile(senderId, pageAccessToken);

        // 2. Find or create customer
        const { data: existingCustomer } = await supabaseAdmin
          .from('customers')
          .select('id')
          .eq('tenant_id', tenantId)
          .eq('channel_type', 'facebook')
          .eq('external_id', senderId)
          .single();

        let customerId;
        if (existingCustomer) {
          customerId = existingCustomer.id;
          // Update profile if available
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
              channel_type: 'facebook',
              external_id: senderId,
              name: profile.name || 'Khách hàng',
              avatar: profile.avatar,
            })
            .select('id')
            .single();

          if (custErr) {
            console.error('[Webhook] Error creating customer:', custErr.message);
            continue;
          }
          customerId = newCustomer.id;
        }

        // 3. Find or create conversation
        const { data: existingConv } = await supabaseAdmin
          .from('conversations')
          .select('id')
          .eq('tenant_id', tenantId)
          .eq('customer_id', customerId)
          .single();

        let conversationId;
        if (existingConv) {
          conversationId = existingConv.id;
          // Update last message + atomically increment unread
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
              channel: 'facebook',
              status: 'active',
              last_message: text,
              last_message_at: new Date().toISOString(),
              unread: 1,
            })
            .select('id')
            .single();

          if (convErr) {
            console.error('[Webhook] Error creating conversation:', convErr.message);
            continue;
          }
          conversationId = newConv.id;

          // === Welcome Message for NEW conversations ===
          try {
            const { data: welcomeTenant } = await supabaseAdmin
              .from('tenants')
              .select('ai_config')
              .eq('id', tenantId)
              .single();

            const welcomeConfig = welcomeTenant?.ai_config || {};
            if (welcomeConfig.welcome_message_enabled && welcomeConfig.welcome_message_text) {
              const welcomeText = welcomeConfig.welcome_message_text;
              const welcomeButtons = welcomeConfig.welcome_message_buttons || [];

              // Send via Facebook
              if (welcomeButtons.length > 0) {
                await fbService.sendButtonTemplate(senderId, welcomeText, welcomeButtons, pageAccessToken);
              } else {
                await fbService.sendMessageWithToken(senderId, welcomeText, pageAccessToken);
              }

              // Insert welcome system message
              await supabaseAdmin.from('messages').insert({
                conversation_id: conversationId,
                sender: 'system',
                text: welcomeText,
                type: 'welcome',
              });
            }
          } catch (welcomeErr) {
            console.error('[Webhook] Welcome message error (non-fatal):', welcomeErr.message);
          }
        }

        // 4. Insert message
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
          console.error('[Webhook] Error inserting message:', msgErr.message);
          continue;
        }

        // 5. Get full customer + conversation for the emit
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

        // 6. Emit real-time event scoped to tenant room
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
            status: undefined,
          },
        });

        console.log(`[Webhook] Processed -> conversation ${conversationId}`);

        // === Chatbot Rule-based matching (BEFORE AI) ===
        let ruleMatched = false;
        try {
          const ruleResult = await matchChatbotRule(tenantId, text);
          if (ruleResult) {
            ruleMatched = true;
            console.log(`[Webhook] Rule matched: "${ruleResult.ruleName}" for conversation ${conversationId}`);

            // Send rule response via Facebook
            if (ruleResult.responseButtons?.length > 0) {
              await fbService.sendButtonTemplate(senderId, ruleResult.responseText, ruleResult.responseButtons, pageAccessToken);
            } else {
              await fbService.sendMessageWithToken(senderId, ruleResult.responseText, pageAccessToken);
            }

            // Save rule response as message
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

            // Update conversation last message
            await supabaseAdmin
              .from('conversations')
              .update({
                last_message: ruleResult.responseText,
                last_message_at: new Date().toISOString(),
              })
              .eq('id', conversationId);

            // Emit rule response
            if (ruleMsg) {
              const { data: updatedConv } = await supabaseAdmin
                .from('conversations')
                .select('*')
                .eq('id', conversationId)
                .single();

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
          console.error('[Webhook] Rule matching error (non-fatal):', ruleErr.message);
        }

        // === AI Auto-reply (skip if rule already matched) ===
        if (!ruleMatched) try {
          // Get tenant AI config
          const { data: tenant } = await supabaseAdmin
            .from('tenants')
            .select('ai_config')
            .eq('id', tenantId)
            .single();

          const aiConfig = tenant?.ai_config || {};

          // Check 3 conditions: tenant AI on, conversation AI on, API key exists
          const tenantAiEnabled = aiConfig.enabled !== false;
          const convAiEnabled = conv.ai_enabled !== false;
          const hasApiKey = !!aiConfig.apiKey;

          if (tenantAiEnabled && convAiEnabled && hasApiKey) {
            console.log(`[Webhook] AI processing for conversation ${conversationId}...`);

            const aiResult = await Promise.race([
              processWithAI({ tenantId, conversationId, customerMessage: text, io }),
              new Promise((_, reject) => setTimeout(() => reject(new Error('AI timeout')), 30000)),
            ]);

            if (aiResult.reply && !aiResult.handoff) {
              // Save AI reply as message
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

              // Send AI reply to customer via Facebook
              const sendResult = await fbService.sendMessageWithToken(senderId, aiResult.reply, pageAccessToken);
              if (!sendResult.success) {
                console.error(`[Webhook] AI reply failed to send for conversation ${conversationId}:`, sendResult.error);
              }

              // Update conversation last message
              await supabaseAdmin
                .from('conversations')
                .update({
                  last_message: aiResult.reply,
                  last_message_at: new Date().toISOString(),
                })
                .eq('id', conversationId);

              // Emit AI message
              if (aiMessage) {
                const { data: updatedConv } = await supabaseAdmin
                  .from('conversations')
                  .select('*')
                  .eq('id', conversationId)
                  .single();

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

              console.log(`[Webhook] AI replied to conversation ${conversationId}`);
            }
          }
        } catch (aiErr) {
          // AI failure is non-fatal — conversation stays in inbox for agent
          console.error('[Webhook] AI error (non-fatal):', aiErr.message);
        }
      } catch (err) {
        console.error('[Webhook] Processing error:', err.message);
      }
    }
  }
});

/**
 * Handle Facebook feed comment events (from webhook changes)
 */
async function handleCommentEvent(value, channelId, tenantId, pageAccessToken, io) {
  try {
    const { comment_id, post_id, parent_id, from, message, created_time, verb } = value;

    if (verb === 'remove') {
      // Comment deleted — optionally handle
      return;
    }

    if (!comment_id || !message) return;

    console.log(`[Webhook] Comment on post ${post_id} from ${from?.name}: "${message}"`);

    const phoneRegex = /(0\d{9}|\+84\d{9})/;
    const phoneMatch = message.match(phoneRegex);

    // Upsert comment
    await supabaseAdmin
      .from('comments')
      .upsert({
        tenant_id: tenantId,
        channel_id: channelId,
        post_id: post_id || '',
        comment_id,
        parent_comment_id: parent_id || null,
        user_id: from?.id || '',
        user_name: from?.name || '',
        message,
        has_phone: !!phoneMatch,
        extracted_phone: phoneMatch?.[1] || null,
        created_time: created_time ? new Date(created_time * 1000).toISOString() : new Date().toISOString(),
      }, { onConflict: 'comment_id' });

    // Get tenant comment_settings for auto-actions
    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('comment_settings')
      .eq('id', tenantId)
      .single();

    const settings = tenant?.comment_settings || {};

    // Auto-hide phone numbers
    if (settings.auto_hide_phone && phoneMatch && pageAccessToken && pageAccessToken.length > 30) {
      try {
        const axios = require('axios');
        await axios.post(`${config.fb.graphApiUrl}/${comment_id}`, {
          is_hidden: true,
        }, {
          params: { access_token: pageAccessToken },
        });
        await supabaseAdmin
          .from('comments')
          .update({ is_hidden: true, auto_hidden: true })
          .eq('comment_id', comment_id);
        console.log(`[Webhook] Auto-hidden comment with phone: ${comment_id}`);
      } catch (hideErr) {
        console.error('[Webhook] Auto-hide error:', hideErr.message);
      }
    }

    // Auto-hide keywords
    if (settings.auto_hide_keywords?.length && pageAccessToken && pageAccessToken.length > 30) {
      const msgLower = message.toLowerCase();
      const shouldHide = settings.auto_hide_keywords.some((kw) => msgLower.includes(kw.toLowerCase()));
      if (shouldHide) {
        try {
          const axios = require('axios');
          await axios.post(`${config.fb.graphApiUrl}/${comment_id}`, {
            is_hidden: true,
          }, {
            params: { access_token: pageAccessToken },
          });
          await supabaseAdmin
            .from('comments')
            .update({ is_hidden: true, auto_hidden: true })
            .eq('comment_id', comment_id);
        } catch (hideErr) {
          console.error('[Webhook] Auto-hide keyword error:', hideErr.message);
        }
      }
    }

    // Emit real-time event
    io.to(`tenant:${tenantId}`).emit('new_comment', {
      comment_id,
      post_id,
      user_name: from?.name,
      message,
      has_phone: !!phoneMatch,
    });
  } catch (err) {
    console.error('[Webhook] Comment event error:', err.message);
  }
}

module.exports = router;
