const axios = require('axios');
const crypto = require('crypto');
const config = require('../config');

const OAUTH_BASE = 'https://oauth.zaloapp.com/v4';
const API_BASE = 'https://openapi.zalo.me/v3.0';
const API_V2 = 'https://openapi.zalo.me/v2.0';

// ========================
// OAUTH (PKCE)
// ========================

/**
 * Generate PKCE code_challenge from code_verifier (SHA256 + base64url)
 */
function generateCodeChallenge(codeVerifier) {
  const hash = crypto.createHash('sha256').update(codeVerifier).digest();
  return hash.toString('base64url');
}

/**
 * Build Zalo OAuth URL with PKCE
 */
function getOAuthUrl(state, codeVerifier) {
  const redirectUri = `${config.backendUrl}/auth/zalo/callback`;
  const codeChallenge = generateCodeChallenge(codeVerifier);

  const url = `${OAUTH_BASE}/oa/permission`
    + `?app_id=${config.zalo.appId}`
    + `&redirect_uri=${encodeURIComponent(redirectUri)}`
    + `&code_challenge=${codeChallenge}`
    + `&state=${state}`;

  console.log('[Zalo] getOAuthUrl():');
  console.log('[Zalo]   appId:', config.zalo.appId || '*** MISSING ***');
  console.log('[Zalo]   redirectUri:', redirectUri);

  return url;
}

/**
 * Exchange authorization code for tokens (with PKCE code_verifier)
 */
async function exchangeCodeForToken(code, codeVerifier) {
  console.log('[Zalo] exchangeCodeForToken():');
  console.log('[Zalo]   code:', code ? `${code.substring(0, 20)}...` : 'MISSING');

  try {
    const res = await axios.post(
      `${OAUTH_BASE}/oa/access_token`,
      new URLSearchParams({
        app_id: config.zalo.appId,
        code,
        code_verifier: codeVerifier,
        grant_type: 'authorization_code',
      }).toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          secret_key: config.zalo.appSecret,
        },
      }
    );

    const { access_token, refresh_token, expires_in } = res.data;

    if (!access_token) {
      console.error('[Zalo] exchangeCodeForToken: no access_token in response:', res.data);
      throw new Error(res.data.error_description || res.data.error_name || 'No access_token');
    }

    console.log('[Zalo] exchangeCodeForToken OK: expires_in=', expires_in);
    return { access_token, refresh_token, expires_in };
  } catch (err) {
    console.error('[Zalo] exchangeCodeForToken FAILED:', err.response?.data || err.message);
    throw err;
  }
}

/**
 * Refresh access token using refresh_token
 */
async function refreshAccessToken(refreshToken) {
  console.log('[Zalo] refreshAccessToken()');

  try {
    const res = await axios.post(
      `${OAUTH_BASE}/oa/access_token`,
      new URLSearchParams({
        app_id: config.zalo.appId,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }).toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          secret_key: config.zalo.appSecret,
        },
      }
    );

    const { access_token, refresh_token, expires_in } = res.data;

    if (!access_token) {
      console.error('[Zalo] refreshAccessToken: no access_token in response:', res.data);
      throw new Error(res.data.error_description || res.data.error_name || 'Refresh failed');
    }

    console.log('[Zalo] refreshAccessToken OK: expires_in=', expires_in);
    return { access_token, refresh_token, expires_in };
  } catch (err) {
    console.error('[Zalo] refreshAccessToken FAILED:', err.response?.data || err.message);
    throw err;
  }
}

// ========================
// MESSAGING
// ========================

/**
 * Send text message via Zalo OA Customer Service API
 */
async function sendMessage(recipientId, text, accessToken) {
  try {
    const res = await axios.post(
      `${API_BASE}/oa/message/cs`,
      {
        recipient: { user_id: recipientId },
        message: { text },
      },
      {
        headers: { access_token: accessToken },
      }
    );

    if (res.data.error !== 0) {
      console.error('[Zalo] sendMessage error:', res.data);
      return { success: false, error: res.data.message || `Error code: ${res.data.error}` };
    }

    return { success: true, messageId: res.data.data?.message_id };
  } catch (err) {
    console.error('[Zalo] sendMessage FAILED:', err.response?.data || err.message);
    return { success: false, error: err.response?.data?.message || err.message };
  }
}

/**
 * Send image via Zalo OA
 */
async function sendImage(recipientId, imageUrl, accessToken) {
  try {
    const res = await axios.post(
      `${API_BASE}/oa/message/cs`,
      {
        recipient: { user_id: recipientId },
        message: {
          attachment: {
            type: 'template',
            payload: {
              template_type: 'media',
              elements: [{ media_type: 'image', url: imageUrl }],
            },
          },
        },
      },
      {
        headers: { access_token: accessToken },
      }
    );

    if (res.data.error !== 0) {
      return { success: false, error: res.data.message || `Error code: ${res.data.error}` };
    }

    return { success: true, messageId: res.data.data?.message_id };
  } catch (err) {
    console.error('[Zalo] sendImage FAILED:', err.response?.data || err.message);
    return { success: false, error: err.message };
  }
}

// ========================
// OA INFO
// ========================

/**
 * Get OA info (name, id) to verify token
 */
async function getOAInfo(accessToken) {
  try {
    const res = await axios.get(`${API_V2}/oa/getoa`, {
      headers: { access_token: accessToken },
    });

    if (res.data.error !== 0) {
      console.error('[Zalo] getOAInfo error:', res.data);
      throw new Error(res.data.message || 'Failed to get OA info');
    }

    const { oa_id, name, description, avatar } = res.data.data || {};
    console.log('[Zalo] getOAInfo OK:', name, '(', oa_id, ')');
    return { oa_id, name, description, avatar };
  } catch (err) {
    console.error('[Zalo] getOAInfo FAILED:', err.response?.data || err.message);
    throw err;
  }
}

/**
 * Get user profile from Zalo
 */
async function getUserProfile(userId, accessToken) {
  try {
    const res = await axios.get(`${API_V2}/oa/getprofile`, {
      headers: { access_token: accessToken },
      params: { data: JSON.stringify({ user_id: userId }) },
    });

    if (res.data.error !== 0) {
      return { name: null, avatar: null };
    }

    const data = res.data.data || {};
    return {
      name: data.display_name || null,
      avatar: data.avatars?.['240'] || data.avatar || null,
    };
  } catch (err) {
    console.error('[Zalo] getUserProfile error:', err.message);
    return { name: null, avatar: null };
  }
}

// ========================
// TOKEN HELPER
// ========================

/**
 * Get Zalo channel token for a tenant (same pattern as fbService.getChannelToken)
 */
async function getChannelToken(tenantId, oaId) {
  const { supabaseAdmin } = require('../config/supabase');

  if (oaId) {
    const { data } = await supabaseAdmin
      .from('channels')
      .select('id, page_access_token, page_id, config')
      .eq('page_id', oaId)
      .eq('type', 'zalo')
      .eq('connected', true)
      .single();
    if (data) {
      return {
        channelId: data.id,
        accessToken: data.page_access_token,
        refreshToken: data.config?.refresh_token,
      };
    }
  }

  // Fallback: first connected Zalo channel for tenant
  const { data } = await supabaseAdmin
    .from('channels')
    .select('id, page_access_token, page_id, config')
    .eq('tenant_id', tenantId)
    .eq('type', 'zalo')
    .eq('connected', true)
    .limit(1)
    .single();

  if (data) {
    return {
      channelId: data.id,
      accessToken: data.page_access_token,
      refreshToken: data.config?.refresh_token,
    };
  }

  return null;
}

module.exports = {
  generateCodeChallenge,
  getOAuthUrl,
  exchangeCodeForToken,
  refreshAccessToken,
  sendMessage,
  sendImage,
  getOAInfo,
  getUserProfile,
  getChannelToken,
};
