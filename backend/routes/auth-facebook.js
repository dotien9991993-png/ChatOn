const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const config = require('../config');
const fbService = require('../services/facebook');
const { supabaseAdmin } = require('../config/supabase');

// OAuth state + user tokens keyed by tenantId
const oauthStates = new Map();
const oauthUserTokens = new Map();

// ========================
// 1. GET /auth/facebook/connect (also /api/facebook/connect)
//    Protected route — tenantId from auth middleware
// ========================
router.get('/connect', (req, res) => {
  console.log('[OAuth] === /connect called ===');
  console.log('[OAuth] tenantId:', req.tenantId);
  console.log('[OAuth] user:', req.user?.email);
  console.log('[OAuth] FB_APP_ID:', config.fb.appId || '*** MISSING ***');
  console.log('[OAuth] FB_APP_SECRET:', config.fb.appSecret ? '(set)' : '*** MISSING ***');
  console.log('[OAuth] BACKEND_URL:', config.backendUrl);
  console.log('[OAuth] FRONTEND_URL:', config.frontendUrl);

  const tenantId = req.tenantId;
  if (!tenantId) {
    console.error('[OAuth] FAILED: No tenantId — user not authenticated');
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (!config.fb.appId) {
    console.error('[OAuth] FAILED: FB_APP_ID is not set in .env');
    return res.status(500).json({ error: 'FB_APP_ID chưa được cấu hình. Kiểm tra file .env' });
  }

  const state = crypto.randomBytes(16).toString('hex');
  oauthStates.set(state, { tenantId, createdAt: Date.now() });
  console.log('[OAuth] Generated state:', state, 'for tenant:', tenantId);

  // Clean old states (> 10 min)
  for (const [s, v] of oauthStates) {
    if (Date.now() - v.createdAt > 10 * 60 * 1000) oauthStates.delete(s);
  }

  const url = fbService.getOAuthUrl(state);
  console.log('[OAuth] OAuth URL:', url);
  res.json({ url, state });
});

// ========================
// 2. GET /auth/facebook/callback
//    Unprotected — Facebook redirects here
// ========================
router.get('/callback', async (req, res) => {
  const { code, state, error } = req.query;
  console.log('[OAuth] === /callback called ===');
  console.log('[OAuth] code:', code ? `${code.substring(0, 20)}...` : 'MISSING');
  console.log('[OAuth] state:', state);
  console.log('[OAuth] error:', error || 'none');

  if (error) {
    console.error('[OAuth] User cancelled:', error);
    return res.send(callbackHTML({ success: false, error: 'Bạn đã hủy kết nối Facebook.' }));
  }

  if (!state || !oauthStates.has(state)) {
    console.error('[OAuth] Invalid state. Known states:', [...oauthStates.keys()]);
    return res.send(callbackHTML({ success: false, error: 'State không hợp lệ. Vui lòng thử lại.' }));
  }

  const { tenantId } = oauthStates.get(state);
  oauthStates.delete(state);
  console.log('[OAuth] State valid for tenant:', tenantId);

  if (!code) {
    console.error('[OAuth] No authorization code received');
    return res.send(callbackHTML({ success: false, error: 'Không nhận được authorization code.' }));
  }

  try {
    console.log('[OAuth] Step 1: Exchanging code for short-lived token...');
    const shortToken = await fbService.exchangeCodeForToken(code);
    console.log('[OAuth] Step 1 OK: Got short-lived token:', shortToken ? `${shortToken.substring(0, 20)}...` : 'EMPTY');

    console.log('[OAuth] Step 2: Exchanging for long-lived token...');
    const { token: longToken, expiresIn } = await fbService.exchangeLongLivedToken(shortToken);
    console.log('[OAuth] Step 2 OK: Got long-lived token, expires in:', expiresIn, 'seconds');

    // Store user token keyed by tenantId
    oauthUserTokens.set(tenantId, {
      userToken: longToken,
      expiresIn,
      connectedAt: new Date().toISOString(),
    });
    console.log('[OAuth] Token stored for tenant:', tenantId);

    return res.send(callbackHTML({ success: true }));
  } catch (err) {
    console.error('[OAuth] Callback error:', err.response?.data || err.message);
    console.error('[OAuth] Full error:', err.response?.status, err.response?.statusText);
    return res.send(callbackHTML({
      success: false,
      error: err.response?.data?.error?.message || 'Lỗi kết nối Facebook. Vui lòng thử lại.',
    }));
  }
});

// ========================
// 3. GET /api/facebook/pages
//    Protected — read user token by tenantId
// ========================
router.get('/pages', async (req, res) => {
  console.log('[OAuth] === /pages called ===');
  console.log('[OAuth] tenantId:', req.tenantId);

  const session = oauthUserTokens.get(req.tenantId);
  if (!session?.userToken) {
    console.error('[OAuth] No user token found for tenant:', req.tenantId);
    console.error('[OAuth] Known tenants with tokens:', [...oauthUserTokens.keys()]);
    return res.status(401).json({ error: 'Chưa kết nối Facebook. Vui lòng đăng nhập lại.' });
  }

  console.log('[OAuth] Found user token, fetching pages...');

  try {
    const pages = await fbService.getUserPages(session.userToken);
    console.log('[OAuth] Got', pages.length, 'pages:', pages.map(p => `${p.name} (${p.id})`).join(', '));
    res.json({ pages });
  } catch (err) {
    console.error('[OAuth] Get pages error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Không lấy được danh sách Pages. Token có thể đã hết hạn.' });
  }
});

// ========================
// 4. POST /api/facebook/pages/connect
//    Protected — upsert channels table
// ========================
router.post('/pages/connect', async (req, res) => {
  const { pageId, pageName, pageAccessToken, pagePicture } = req.body;
  console.log('[OAuth] === /pages/connect called ===');
  console.log('[OAuth] tenantId:', req.tenantId);
  console.log('[OAuth] pageId:', pageId);
  console.log('[OAuth] pageName:', pageName);
  console.log('[OAuth] pageAccessToken:', pageAccessToken ? `${pageAccessToken.substring(0, 20)}...` : 'MISSING');

  if (!pageId || !pageAccessToken) {
    console.error('[OAuth] Missing pageId or pageAccessToken');
    return res.status(400).json({ error: 'Thiếu pageId hoặc pageAccessToken' });
  }

  try {
    console.log('[OAuth] Step 1: Subscribing webhook for page', pageId);
    await fbService.subscribePageWebhook(pageId, pageAccessToken);
    console.log('[OAuth] Step 1 OK: Webhook subscribed');

    console.log('[OAuth] Step 2: Debug token...');
    const tokenInfo = await fbService.debugToken(pageAccessToken);
    const expiresAt = tokenInfo?.expires_at
      ? new Date(tokenInfo.expires_at * 1000).toISOString()
      : null;
    console.log('[OAuth] Step 2 OK: Token expires at:', expiresAt || 'never');

    // Upsert channel row by tenant_id + page_id (supports multiple pages)
    console.log('[OAuth] Step 3: Upserting channel in Supabase...');
    const { data: existing } = await supabaseAdmin
      .from('channels')
      .select('id')
      .eq('tenant_id', req.tenantId)
      .eq('page_id', pageId)
      .single();

    const channelData = {
      tenant_id: req.tenantId,
      type: 'facebook',
      connected: true,
      connected_at: new Date().toISOString(),
      page_id: pageId,
      page_name: pageName || '',
      page_access_token: pageAccessToken,
      config: {
        pagePicture: pagePicture || '',
        tokenExpiresAt: expiresAt,
        oauthConnected: true,
      },
    };

    if (existing) {
      console.log('[OAuth] Updating existing channel:', existing.id);
      const { data: updateResult, error: updateError } = await supabaseAdmin
        .from('channels').update(channelData).eq('id', existing.id).select();
      if (updateError) {
        console.error('[OAuth] UPDATE ERROR:', updateError.message, updateError.details, updateError.hint, 'code:', updateError.code);
        throw new Error('Failed to update channel: ' + updateError.message);
      }
      console.log('[OAuth] Update result:', updateResult);
    } else {
      console.log('[OAuth] Inserting new channel for page:', pageId);
      const { data: insertResult, error: insertError } = await supabaseAdmin
        .from('channels').insert(channelData).select();
      if (insertError) {
        console.error('[OAuth] INSERT ERROR:', insertError.message, insertError.details, insertError.hint, 'code:', insertError.code);
        throw new Error('Failed to insert channel: ' + insertError.message);
      }
      console.log('[OAuth] Insert result:', insertResult);
    }

    console.log(`[OAuth] SUCCESS: Connected page: ${pageName} (${pageId}) for tenant ${req.tenantId}`);

    res.json({
      success: true,
      page: {
        id: pageId,
        name: pageName,
        picture: pagePicture,
        tokenExpiresAt: expiresAt,
      },
    });
  } catch (err) {
    console.error('[OAuth] Connect page error:', err.response?.data || err.message);
    console.error('[OAuth] Full error details:', JSON.stringify(err.response?.data, null, 2));
    res.status(500).json({
      error: err.response?.data?.error?.message || 'Lỗi kết nối Page. Vui lòng thử lại.',
    });
  }
});

// ========================
// 5. POST /api/facebook/pages/disconnect
//    Protected — update channels row
// ========================
router.post('/pages/disconnect', async (req, res) => {
  const { pageId } = req.body;
  console.log('[OAuth] === /pages/disconnect called ===');
  console.log('[OAuth] tenantId:', req.tenantId, 'pageId:', pageId);

  if (!pageId) {
    return res.status(400).json({ error: 'Thiếu pageId' });
  }

  const { data: ch } = await supabaseAdmin
    .from('channels')
    .select('*')
    .eq('tenant_id', req.tenantId)
    .eq('page_id', pageId)
    .single();

  if (!ch) {
    console.error('[OAuth] No connected page found for pageId:', pageId);
    return res.status(400).json({ error: 'Không tìm thấy Page này.' });
  }

  try {
    if (ch.page_access_token) {
      console.log('[OAuth] Unsubscribing webhook for page:', ch.page_id);
      await fbService.unsubscribePageWebhook(ch.page_id, ch.page_access_token);
      console.log('[OAuth] Webhook unsubscribed');
    }
  } catch (err) {
    console.error('[OAuth] Unsubscribe error (non-fatal):', err.message);
  }

  // Delete channel row (instead of clearing fields)
  await supabaseAdmin
    .from('channels')
    .delete()
    .eq('id', ch.id);

  console.log(`[OAuth] SUCCESS: Disconnected page ${pageId} for tenant ${req.tenantId}`);
  res.json({ success: true });
});

// ========================
// 6. GET /api/facebook/token-status
//    Protected
// ========================
router.get('/token-status', async (req, res) => {
  console.log('[OAuth] === /token-status called ===');
  console.log('[OAuth] tenantId:', req.tenantId);

  const { data: channels } = await supabaseAdmin
    .from('channels')
    .select('*')
    .eq('tenant_id', req.tenantId)
    .eq('type', 'facebook')
    .eq('connected', true);

  if (!channels || channels.length === 0) {
    console.log('[OAuth] No connected channels found');
    return res.json({ channels: [] });
  }

  // Check token status for each channel
  const result = [];
  for (const ch of channels) {
    const entry = {
      id: ch.id,
      pageId: ch.page_id,
      pageName: ch.page_name,
      pagePicture: ch.config?.pagePicture || '',
      connectedAt: ch.connected_at,
      connected: true,
      valid: true,
      daysLeft: null,
      warning: false,
      critical: false,
    };

    try {
      if (ch.page_access_token) {
        const tokenInfo = await fbService.debugToken(ch.page_access_token);
        if (tokenInfo) {
          const now = Math.floor(Date.now() / 1000);
          const expiresAt = tokenInfo.expires_at || 0;
          const daysLeft = expiresAt > 0 ? Math.floor((expiresAt - now) / 86400) : null;
          entry.valid = tokenInfo.is_valid !== false;
          entry.expiresAt = expiresAt > 0 ? new Date(expiresAt * 1000).toISOString() : null;
          entry.daysLeft = daysLeft;
          entry.warning = daysLeft !== null && daysLeft < 7;
          entry.critical = daysLeft !== null && daysLeft < 3;
        }
      }
    } catch (err) {
      entry.valid = false;
      entry.error = err.message;
    }

    result.push(entry);
  }

  console.log('[OAuth] Token status:', result.length, 'channels');
  res.json({ channels: result });
});

// ========================
// Helper: HTML trả về cho popup callback
// ========================
function callbackHTML({ success, error }) {
  const message = JSON.stringify({ type: 'FB_OAUTH_CALLBACK', success, error });
  // Use '*' for postMessage targetOrigin to avoid port mismatch in dev
  return `<!DOCTYPE html>
<html>
<head><title>Facebook - ChatOn</title></head>
<body style="background:#f8fafc;color:#1e293b;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">
  <div style="text-align:center;background:white;padding:40px;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
    <p style="font-size:18px;font-weight:600">${success ? 'Kết nối thành công!' : 'Kết nối thất bại'}</p>
    <p style="font-size:14px;color:#64748b;margin-top:8px">${success ? 'Đang đóng cửa sổ...' : (error || '')}</p>
  </div>
  <script>
    try {
      if (window.opener) {
        window.opener.postMessage(${message}, '*');
        console.log('[FB Callback] postMessage sent successfully');
      } else {
        console.warn('[FB Callback] No window.opener found');
      }
    } catch (e) {
      console.error('[FB Callback] postMessage error:', e);
    }
    setTimeout(() => window.close(), 1500);
  </script>
</body>
</html>`;
}

module.exports = router;
