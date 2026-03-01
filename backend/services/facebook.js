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

  try {
    const res = await axios.get(`${GRAPH}/${senderId}`, {
      params: {
        fields: 'first_name,last_name,profile_pic',
        access_token: accessToken,
      },
    });
    const profile = {
      name: `${res.data.first_name || ''} ${res.data.last_name || ''}`.trim(),
      avatar: res.data.profile_pic || null,
    };
    profileCache.set(senderId, { profile, ts: Date.now() });
    return profile;
  } catch (err) {
    console.error('[FB] Lỗi lấy profile:', err.response?.data || err.message);
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
 * Legacy sendMessage — kept for backwards compat
 */
async function sendMessage(recipientId, text) {
  return sendMessageWithToken(recipientId, text, config.fb.pageAccessToken);
}

// ========================
// OAUTH FLOW
// ========================

function getOAuthUrl(state) {
  const redirectUri = `${config.backendUrl}/auth/facebook/callback`;
  const scopes = 'pages_show_list,pages_messaging,pages_manage_metadata,pages_read_engagement,pages_manage_posts,pages_manage_engagement';
  const url = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${config.fb.appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes}&state=${state}`;

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

module.exports = {
  getUserProfile,
  sendMessage,
  sendMessageWithToken,
  getOAuthUrl,
  exchangeCodeForToken,
  exchangeLongLivedToken,
  getUserPages,
  subscribePageWebhook,
  unsubscribePageWebhook,
  debugToken,
};
