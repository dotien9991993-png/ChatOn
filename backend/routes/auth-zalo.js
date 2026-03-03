const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const config = require('../config');
const zaloService = require('../services/zalo');
const { supabaseAdmin } = require('../config/supabase');

// OAuth state + PKCE code_verifier keyed by state
const oauthStates = new Map(); // state → { tenantId, codeVerifier, createdAt }

// ========================
// 1. GET /connect (protected — needs req.tenantId)
// ========================
router.get('/connect', (req, res) => {
  console.log('[Zalo OAuth] === /connect called ===');
  console.log('[Zalo OAuth] tenantId:', req.tenantId);

  const tenantId = req.tenantId;
  if (!tenantId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (!config.zalo.appId) {
    return res.status(500).json({ error: 'ZALO_APP_ID chưa được cấu hình.' });
  }

  const state = crypto.randomBytes(16).toString('hex');
  const codeVerifier = crypto.randomBytes(32).toString('base64url');

  oauthStates.set(state, { tenantId, codeVerifier, createdAt: Date.now() });

  // Clean old states (> 10 min)
  for (const [s, v] of oauthStates) {
    if (Date.now() - v.createdAt > 10 * 60 * 1000) oauthStates.delete(s);
  }

  const url = zaloService.getOAuthUrl(state, codeVerifier);
  console.log('[Zalo OAuth] Generated state:', state, 'for tenant:', tenantId);
  res.json({ url, state });
});

// ========================
// 2. GET /callback (unprotected — Zalo redirects here)
// ========================
router.get('/callback', async (req, res) => {
  const { code, state, oa_id } = req.query;
  console.log('[Zalo OAuth] === /callback called ===');
  console.log('[Zalo OAuth] code:', code ? `${code.substring(0, 20)}...` : 'MISSING');
  console.log('[Zalo OAuth] state:', state);
  console.log('[Zalo OAuth] oa_id:', oa_id);

  if (!state || !oauthStates.has(state)) {
    console.error('[Zalo OAuth] Invalid state');
    return res.send(callbackHTML({ success: false, error: 'State không hợp lệ. Vui lòng thử lại.' }));
  }

  const { tenantId, codeVerifier } = oauthStates.get(state);
  oauthStates.delete(state);

  if (!code) {
    return res.send(callbackHTML({ success: false, error: 'Không nhận được authorization code.' }));
  }

  try {
    // Step 1: Exchange code for tokens
    console.log('[Zalo OAuth] Exchanging code for tokens...');
    const tokens = await zaloService.exchangeCodeForToken(code, codeVerifier);

    // Step 2: Get OA info
    console.log('[Zalo OAuth] Getting OA info...');
    const oaInfo = await zaloService.getOAInfo(tokens.access_token);

    const oaId = oaInfo.oa_id || oa_id;
    const oaName = oaInfo.name || 'Zalo OA';
    const expiresAt = new Date(Date.now() + (tokens.expires_in || 86400) * 1000).toISOString();

    // Step 3: Upsert channel
    console.log('[Zalo OAuth] Upserting channel...');
    const { data: existing } = await supabaseAdmin
      .from('channels')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('page_id', oaId)
      .eq('type', 'zalo')
      .single();

    const channelData = {
      tenant_id: tenantId,
      type: 'zalo',
      connected: true,
      connected_at: new Date().toISOString(),
      page_id: oaId,
      page_name: oaName,
      page_access_token: tokens.access_token,
      config: {
        refresh_token: tokens.refresh_token,
        token_expires_at: expiresAt,
        oa_id: oaId,
        oaAvatar: oaInfo.avatar || '',
        oauthConnected: true,
      },
    };

    if (existing) {
      const { error: updateError } = await supabaseAdmin
        .from('channels').update(channelData).eq('id', existing.id);
      if (updateError) throw new Error('Failed to update channel: ' + updateError.message);
    } else {
      const { error: insertError } = await supabaseAdmin
        .from('channels').insert(channelData);
      if (insertError) throw new Error('Failed to insert channel: ' + insertError.message);
    }

    console.log(`[Zalo OAuth] SUCCESS: Connected OA "${oaName}" (${oaId}) for tenant ${tenantId}`);
    return res.send(callbackHTML({ success: true }));
  } catch (err) {
    console.error('[Zalo OAuth] Callback error:', err.response?.data || err.message);
    return res.send(callbackHTML({
      success: false,
      error: err.response?.data?.error_description || err.message || 'Lỗi kết nối Zalo. Vui lòng thử lại.',
    }));
  }
});

// ========================
// 3. GET /status (protected)
// ========================
router.get('/status', async (req, res) => {
  console.log('[Zalo OAuth] === /status called ===');

  const { data: channels } = await supabaseAdmin
    .from('channels')
    .select('*')
    .eq('tenant_id', req.tenantId)
    .eq('type', 'zalo')
    .eq('connected', true);

  if (!channels || channels.length === 0) {
    return res.json({ channels: [] });
  }

  const result = channels.map((ch) => {
    const expiresAt = ch.config?.token_expires_at;
    const now = new Date();
    const expDate = expiresAt ? new Date(expiresAt) : null;
    const hoursLeft = expDate ? Math.floor((expDate - now) / (1000 * 60 * 60)) : null;

    return {
      id: ch.id,
      oaId: ch.page_id,
      oaName: ch.page_name,
      oaAvatar: ch.config?.oaAvatar || '',
      connectedAt: ch.connected_at,
      connected: true,
      tokenExpiresAt: expiresAt,
      hoursLeft,
      warning: hoursLeft !== null && hoursLeft < 12,
      critical: hoursLeft !== null && hoursLeft < 3,
      tokenError: ch.config?.token_error || false,
    };
  });

  res.json({ channels: result });
});

// ========================
// 4. POST /disconnect (protected)
// ========================
router.post('/disconnect', async (req, res) => {
  const { oaId } = req.body;
  console.log('[Zalo OAuth] === /disconnect called ===');
  console.log('[Zalo OAuth] tenantId:', req.tenantId, 'oaId:', oaId);

  if (!oaId) {
    return res.status(400).json({ error: 'Thiếu oaId' });
  }

  const { data: ch } = await supabaseAdmin
    .from('channels')
    .select('id')
    .eq('tenant_id', req.tenantId)
    .eq('page_id', oaId)
    .eq('type', 'zalo')
    .single();

  if (!ch) {
    return res.status(400).json({ error: 'Không tìm thấy OA này.' });
  }

  await supabaseAdmin
    .from('channels')
    .delete()
    .eq('id', ch.id);

  console.log(`[Zalo OAuth] Disconnected OA ${oaId} for tenant ${req.tenantId}`);
  res.json({ success: true });
});

// ========================
// Helper: callback HTML (same pattern as Facebook)
// ========================
function callbackHTML({ success, error }) {
  const message = JSON.stringify({ type: 'ZALO_OAUTH_CALLBACK', success, error });
  return `<!DOCTYPE html>
<html>
<head><title>Zalo OA - ChatOn</title></head>
<body style="background:#f8fafc;color:#1e293b;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">
  <div style="text-align:center;background:white;padding:40px;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
    <p style="font-size:18px;font-weight:600">${success ? 'Kết nối Zalo OA thành công!' : 'Kết nối thất bại'}</p>
    <p style="font-size:14px;color:#64748b;margin-top:8px">${success ? 'Đang đóng cửa sổ...' : (error || '')}</p>
  </div>
  <script>
    try {
      if (window.opener) {
        window.opener.postMessage(${message}, '*');
      }
    } catch (e) {
      console.error('[Zalo Callback] postMessage error:', e);
    }
    setTimeout(() => window.close(), 1500);
  </script>
</body>
</html>`;
}

module.exports = router;
