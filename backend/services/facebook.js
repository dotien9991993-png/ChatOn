const axios = require('axios');
const config = require('../config');

const GRAPH = config.fb.graphApiUrl;

// Cache profile để không gọi Graph API mỗi tin nhắn (1-hour TTL)
const profileCache = new Map();
const PROFILE_CACHE_TTL = 60 * 60 * 1000; // 1 hour

// ========================
// MESSAGING
// ========================

/**
 * Lấy profile khách hàng (có cache)
 * Accepts optional token param for multi-tenant
 */
async function getUserProfile(senderId, token) {
  const cached = profileCache.get(senderId);
  if (cached && (Date.now() - cached.ts) < PROFILE_CACHE_TTL) return cached.profile;

  const accessToken = token || config.fb.pageAccessToken || '';

  if (!accessToken || accessToken.length < 30) {
    console.warn(`[FB] getUserProfile: No valid token for senderId ${senderId} (token length: ${accessToken.length})`);
    return { name: null, avatar: null };
  }

  try {
    const res = await axios.get(`${GRAPH}/${senderId}`, {
      params: {
        fields: 'first_name,last_name,profile_pic',
        access_token: accessToken,
      },
    });
    const profile = {
      name: `${res.data.first_name || ''} ${res.data.last_name || ''}`.trim() || null,
      avatar: res.data.profile_pic || null,
    };
    if (profile.name) {
      profileCache.set(senderId, { profile, ts: Date.now() });
    }
    console.log(`[FB] Profile fetched for ${senderId}: name="${profile.name}", avatar=${profile.avatar ? 'yes' : 'no'}`);
    return profile;
  } catch (err) {
    const errData = err.response?.data?.error;
    console.error(`[FB] Lỗi lấy profile ${senderId}:`, errData?.message || err.message, errData?.code ? `(code: ${errData.code})` : '');
    // Don't cache failures — allow retry on next message
    return { name: null, avatar: null };
  }
}

/**
 * Gửi tin nhắn text qua Send API — explicit token param (multi-tenant)
 */
async function sendMessageWithToken(recipientId, text, pageAccessToken) {
  const token = pageAccessToken || config.fb.pageAccessToken || '';
  try {
    const res = await axios.post(
      `${GRAPH}/me/messages`,
      { recipient: { id: recipientId }, message: { text }, messaging_type: 'RESPONSE' },
      { params: { access_token: token } }
    );
    return { success: true, messageId: res.data.message_id };
  } catch (err) {
    console.error('[FB] Lỗi gửi tin nhắn:', err.response?.data || err.message);
    return { success: false, error: err.response?.data?.error?.message || err.message };
  }
}

/**
 * Gửi ảnh qua Send API — explicit token param (multi-tenant)
 */
async function sendImageWithToken(recipientId, imageUrl, pageAccessToken) {
  const token = pageAccessToken || config.fb.pageAccessToken || '';
  try {
    const res = await axios.post(
      `${GRAPH}/me/messages`,
      {
        recipient: { id: recipientId },
        message: {
          attachment: {
            type: 'image',
            payload: { url: imageUrl, is_reusable: true },
          },
        },
        messaging_type: 'RESPONSE',
      },
      { params: { access_token: token } }
    );
    return { success: true, messageId: res.data.message_id };
  } catch (err) {
    console.error('[FB] Lỗi gửi ảnh:', err.response?.data || err.message);
    return { success: false, error: err.response?.data?.error?.message || err.message };
  }
}

/**
 * Legacy sendMessage — kept for backwards compat
 */
async function sendMessage(recipientId, text) {
  return sendMessageWithToken(recipientId, text, config.fb.pageAccessToken);
}

/**
 * Gửi Button Template qua Send API (cho welcome message, etc.)
 */
async function sendButtonTemplate(recipientId, text, buttons, pageAccessToken) {
  const token = pageAccessToken || config.fb.pageAccessToken || '';
  try {
    const fbButtons = (buttons || []).slice(0, 3).map((btn) => ({
      type: 'postback',
      title: btn.title,
      payload: btn.payload || btn.title,
    }));

    const payload = {
      recipient: { id: recipientId },
      message: {
        attachment: {
          type: 'template',
          payload: {
            template_type: 'button',
            text,
            buttons: fbButtons,
          },
        },
      },
      messaging_type: 'RESPONSE',
    };

    const res = await axios.post(`${GRAPH}/me/messages`, payload, {
      params: { access_token: token },
    });
    return { success: true, messageId: res.data.message_id };
  } catch (err) {
    console.error('[FB] Lỗi gửi button template:', err.response?.data || err.message);
    return { success: false, error: err.response?.data?.error?.message || err.message };
  }
}

/**
 * Gửi hóa đơn (invoice) qua Facebook Receipt Template hoặc fallback text
 */
async function sendInvoice(recipientId, order, pageAccessToken) {
  const token = pageAccessToken || config.fb.pageAccessToken || '';
  const items = order.items || [];

  // Try Facebook Receipt Template first
  try {
    const receiptElements = items.map((item) => ({
      title: item.product_name,
      quantity: item.quantity || 1,
      price: item.price || 0,
      currency: 'VND',
    }));

    const payload = {
      recipient: { id: recipientId },
      message: {
        attachment: {
          type: 'template',
          payload: {
            template_type: 'receipt',
            recipient_name: order.customer_name || 'Khách hàng',
            order_number: order.order_code,
            currency: 'VND',
            payment_method: 'COD',
            summary: { total_cost: order.total || 0 },
            elements: receiptElements,
            ...(order.customer_address ? {
              address: { street_1: order.customer_address, city: '', postal_code: '', state: '', country: 'VN' },
            } : {}),
          },
        },
      },
      messaging_type: 'UPDATE',
    };

    const res = await axios.post(`${GRAPH}/me/messages`, payload, {
      params: { access_token: token },
    });
    return { success: true, messageId: res.data.message_id };
  } catch (err) {
    console.warn('[FB] Receipt template failed, using text fallback:', err.response?.data?.error?.message || err.message);
  }

  // Fallback: formatted text invoice
  try {
    let text = `🧾 HÓA ĐƠN - ${order.order_code}\n`;
    text += `━━━━━━━━━━━━━━━\n`;
    items.forEach((item) => {
      text += `📦 ${item.product_name} x${item.quantity || 1} — ${((item.quantity || 1) * (item.price || 0)).toLocaleString('vi-VN')}đ\n`;
    });
    text += `━━━━━━━━━━━━━━━\n`;
    text += `💰 Tổng: ${(order.total || 0).toLocaleString('vi-VN')}đ\n`;
    if (order.customer_address) {
      text += `📍 Giao: ${order.customer_address}\n`;
    }
    text += `\nCảm ơn anh/chị đã đặt hàng!`;

    return await sendMessageWithToken(recipientId, text, token);
  } catch (fallbackErr) {
    console.error('[FB] Invoice fallback also failed:', fallbackErr.message);
    return { success: false, error: fallbackErr.message };
  }
}

// ========================
// OAUTH FLOW
// ========================

function getOAuthUrl(state) {
  const redirectUri = `${config.backendUrl}/auth/facebook/callback`;
  const scopes = 'pages_show_list,pages_messaging,pages_manage_metadata,pages_read_engagement,pages_manage_posts,pages_manage_engagement';
  const url = `https://www.facebook.com/v21.0/dialog/oauth?client_id=${config.fb.appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes}&state=${state}`;

  console.log('[FB Service] getOAuthUrl():');
  console.log('[FB Service]   appId:', config.fb.appId || '*** MISSING ***');
  console.log('[FB Service]   redirectUri:', redirectUri);
  console.log('[FB Service]   scopes:', scopes);
  console.log('[FB Service]   full URL:', url);

  return url;
}

async function exchangeCodeForToken(code) {
  const redirectUri = `${config.backendUrl}/auth/facebook/callback`;

  console.log('[FB Service] exchangeCodeForToken():');
  console.log('[FB Service]   code:', code ? `${code.substring(0, 20)}...` : 'MISSING');
  console.log('[FB Service]   appId:', config.fb.appId || '*** MISSING ***');
  console.log('[FB Service]   appSecret:', config.fb.appSecret ? '(set)' : '*** MISSING ***');
  console.log('[FB Service]   redirectUri:', redirectUri);

  try {
    const res = await axios.get(`${GRAPH}/oauth/access_token`, {
      params: {
        client_id: config.fb.appId,
        client_secret: config.fb.appSecret,
        redirect_uri: redirectUri,
        code,
      },
    });

    console.log('[FB Service] exchangeCodeForToken OK: got access_token');
    return res.data.access_token;
  } catch (err) {
    console.error('[FB Service] exchangeCodeForToken FAILED:');
    console.error('[FB Service]   status:', err.response?.status);
    console.error('[FB Service]   data:', JSON.stringify(err.response?.data, null, 2));
    throw err;
  }
}

async function exchangeLongLivedToken(shortToken) {
  console.log('[FB Service] exchangeLongLivedToken():');
  console.log('[FB Service]   shortToken:', shortToken ? `${shortToken.substring(0, 20)}...` : 'MISSING');

  try {
    const res = await axios.get(`${GRAPH}/oauth/access_token`, {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: config.fb.appId,
        client_secret: config.fb.appSecret,
        fb_exchange_token: shortToken,
      },
    });

    console.log('[FB Service] exchangeLongLivedToken OK: expires_in=', res.data.expires_in);
    return {
      token: res.data.access_token,
      expiresIn: res.data.expires_in,
    };
  } catch (err) {
    console.error('[FB Service] exchangeLongLivedToken FAILED:');
    console.error('[FB Service]   status:', err.response?.status);
    console.error('[FB Service]   data:', JSON.stringify(err.response?.data, null, 2));
    throw err;
  }
}

async function getUserPages(userToken) {
  console.log('[FB Service] getUserPages():');
  console.log('[FB Service]   userToken:', userToken ? `${userToken.substring(0, 20)}...` : 'MISSING');

  try {
    const res = await axios.get(`${GRAPH}/me/accounts`, {
      params: {
        access_token: userToken,
        fields: 'id,name,category,picture{url},access_token',
      },
    });

    const pages = (res.data.data || []).map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      picture: p.picture?.data?.url || null,
      accessToken: p.access_token,
    }));

    console.log('[FB Service] getUserPages OK: found', pages.length, 'pages');
    pages.forEach(p => console.log('[FB Service]   -', p.name, '(', p.id, ')'));

    return pages;
  } catch (err) {
    console.error('[FB Service] getUserPages FAILED:');
    console.error('[FB Service]   status:', err.response?.status);
    console.error('[FB Service]   data:', JSON.stringify(err.response?.data, null, 2));
    throw err;
  }
}

async function subscribePageWebhook(pageId, pageAccessToken) {
  console.log('[FB Service] subscribePageWebhook():');
  console.log('[FB Service]   pageId:', pageId);
  console.log('[FB Service]   token:', pageAccessToken ? `${pageAccessToken.substring(0, 20)}...` : 'MISSING');

  try {
    const res = await axios.post(
      `${GRAPH}/${pageId}/subscribed_apps`,
      null,
      {
        params: {
          subscribed_fields: 'messages,messaging_postbacks,feed',
          access_token: pageAccessToken,
        },
      }
    );

    console.log('[FB Service] subscribePageWebhook OK: success=', res.data.success);
    return res.data.success;
  } catch (err) {
    console.error('[FB Service] subscribePageWebhook FAILED:');
    console.error('[FB Service]   status:', err.response?.status);
    console.error('[FB Service]   data:', JSON.stringify(err.response?.data, null, 2));
    throw err;
  }
}

async function unsubscribePageWebhook(pageId, pageAccessToken) {
  console.log('[FB Service] unsubscribePageWebhook():', pageId);
  try {
    await axios.delete(`${GRAPH}/${pageId}/subscribed_apps`, {
      params: { access_token: pageAccessToken },
    });
    console.log('[FB Service] unsubscribePageWebhook OK');
    return true;
  } catch (err) {
    console.error('[FB Service] Lỗi unsubscribe webhook:', err.response?.data || err.message);
    return false;
  }
}

async function debugToken(token) {
  console.log('[FB Service] debugToken(): input_token=', token ? `${token.substring(0, 20)}...` : 'MISSING');
  try {
    const res = await axios.get(`${GRAPH}/debug_token`, {
      params: {
        input_token: token,
        access_token: `${config.fb.appId}|${config.fb.appSecret}`,
      },
    });
    console.log('[FB Service] debugToken OK:', JSON.stringify(res.data.data, null, 2));
    return res.data.data;
  } catch (err) {
    console.error('[FB Service] debugToken FAILED:', err.response?.data || err.message);
    return null;
  }
}

/**
 * Get the correct channel (page_access_token) for a tenant.
 * Prefers matching by page_id when available, falls back to first connected FB channel.
 */
async function getChannelToken(tenantId, pageId) {
  const { supabaseAdmin } = require('../config/supabase');
  if (pageId) {
    const { data } = await supabaseAdmin
      .from('channels')
      .select('page_access_token, page_id')
      .eq('page_id', pageId)
      .eq('connected', true)
      .single();
    if (data?.page_access_token) return data.page_access_token;
  }
  // Fallback: first connected facebook channel for tenant
  const { data } = await supabaseAdmin
    .from('channels')
    .select('page_access_token, page_id')
    .eq('tenant_id', tenantId)
    .eq('type', 'facebook')
    .eq('connected', true)
    .limit(1)
    .single();
  return data?.page_access_token || null;
}

/**
 * Get Facebook conversation ID for a page + PSID pair
 */
async function getConversation(pageId, psid, token) {
  try {
    const res = await axios.get(`${GRAPH}/${pageId}/conversations`, {
      params: {
        user_id: psid,
        access_token: token,
      },
    });
    const convs = res.data.data || [];
    return convs.length > 0 ? convs[0].id : null;
  } catch (err) {
    console.error('[FB] getConversation error:', err.response?.data?.error?.message || err.message);
    return null;
  }
}

/**
 * Get all messages from a Facebook conversation (with cursor pagination, max 2000)
 */
async function getConversationMessages(fbConvId, token) {
  const allMessages = [];
  let url = `${GRAPH}/${fbConvId}/messages`;
  let params = {
    fields: 'id,message,from,to,created_time,attachments',
    limit: 100,
    access_token: token,
  };
  const MAX_MESSAGES = 2000;

  try {
    while (allMessages.length < MAX_MESSAGES) {
      const res = await axios.get(url, { params });
      const messages = res.data.data || [];
      if (messages.length === 0) break;
      allMessages.push(...messages);

      const nextUrl = res.data.paging?.next;
      if (!nextUrl) break;

      // Use the full next URL directly (contains cursor)
      url = nextUrl;
      params = {}; // next URL already has all params
    }
  } catch (err) {
    console.error('[FB] getConversationMessages error:', err.response?.data?.error?.message || err.message);
  }

  return allMessages.slice(0, MAX_MESSAGES);
}

module.exports = {
  getUserProfile,
  sendMessage,
  sendMessageWithToken,
  sendImageWithToken,
  sendButtonTemplate,
  sendInvoice,
  getOAuthUrl,
  exchangeCodeForToken,
  exchangeLongLivedToken,
  getUserPages,
  subscribePageWebhook,
  unsubscribePageWebhook,
  debugToken,
  getChannelToken,
  getConversation,
  getConversationMessages,
};
