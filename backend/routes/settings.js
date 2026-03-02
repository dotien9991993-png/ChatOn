const express = require('express');
const router = express.Router();
const axios = require('axios');
const { supabaseAdmin } = require('../config/supabase');
const config = require('../config');

/**
 * API quản lý settings (multi-tenant via req.tenantId)
 */

// GET /api/settings — Trả về toàn bộ settings
router.get('/', async (req, res) => {
  try {
    // Get tenant row
    const { data: tenant, error: tErr } = await supabaseAdmin
      .from('tenants')
      .select('*')
      .eq('id', req.tenantId)
      .single();

    if (tErr || !tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    // Get channels
    const { data: channels } = await supabaseAdmin
      .from('channels')
      .select('*')
      .eq('tenant_id', req.tenantId);

    // Build channels object
    const channelsObj = {
      facebook: { connected: false, pageAccessToken: '', appSecret: '', verifyToken: config.fb.verifyToken, pageId: '', pageName: '', pagePicture: '', webhookUrl: '', messageCount: 0, connectedAt: null, tokenExpiresAt: null, oauthConnected: false },
      zalo: { connected: false, oaAccessToken: '', oaSecretKey: '', webhookUrl: '', oaName: '', connectedAt: null },
      tiktok: { connected: false, clientKey: '', clientSecret: '', webhookUrl: '', connectedAt: null },
      instagram: { connected: false, pageAccessToken: '', businessAccountId: '', webhookUrl: '', connectedAt: null },
    };

    for (const ch of channels || []) {
      const cfg = ch.config || {};
      if (ch.type === 'facebook') {
        channelsObj.facebook = {
          connected: ch.connected,
          pageAccessToken: ch.page_access_token || '',
          appSecret: cfg.appSecret || '',
          verifyToken: cfg.verifyToken || config.fb.verifyToken,
          pageId: ch.page_id || '',
          pageName: ch.page_name || '',
          pagePicture: cfg.pagePicture || '',
          webhookUrl: cfg.webhookUrl || '',
          messageCount: cfg.messageCount || 0,
          connectedAt: ch.connected_at,
          tokenExpiresAt: cfg.tokenExpiresAt || null,
          oauthConnected: cfg.oauthConnected || false,
        };
      } else if (channelsObj[ch.type]) {
        channelsObj[ch.type] = { ...channelsObj[ch.type], ...cfg, connected: ch.connected, connectedAt: ch.connected_at };
      }
    }

    const accountCfg = tenant.account_config || {};

    // Mask tokens
    const result = {
      channels: channelsObj,
      ai: tenant.ai_config || {},
      oms: tenant.oms_config || {},
      shop: tenant.shop_info || {},
      account: accountCfg,
      notifications: accountCfg.notifications || {},
      billing: accountCfg.billing || { plan: 'free', usage: { messages: 0, messageLimit: 500, agents: 1, agentLimit: 1 } },
      products: tenant.products || [],
      quick_replies: tenant.quick_replies || [],
      slug: tenant.slug || '',
    };

    maskTokens(result);
    res.json(result);
  } catch (err) {
    console.error('[Settings] GET / error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/settings/channels/:channel — Cập nhật config kênh
router.put('/channels/:channel', async (req, res) => {
  try {
    const { channel } = req.params;
    const data = req.body;

    // Upsert channel row
    const { data: existing } = await supabaseAdmin
      .from('channels')
      .select('id')
      .eq('tenant_id', req.tenantId)
      .eq('type', channel)
      .single();

    const channelData = {
      tenant_id: req.tenantId,
      type: channel,
      connected: true,
      connected_at: new Date().toISOString(),
      page_id: data.pageId || null,
      page_name: data.pageName || null,
      page_access_token: data.pageAccessToken || null,
      config: data,
    };

    let result;
    if (existing) {
      const { data: updated, error } = await supabaseAdmin
        .from('channels')
        .update(channelData)
        .eq('id', existing.id)
        .select('*')
        .single();
      if (error) return res.status(500).json({ error: error.message });
      result = updated;
    } else {
      const { data: created, error } = await supabaseAdmin
        .from('channels')
        .insert(channelData)
        .select('*')
        .single();
      if (error) return res.status(500).json({ error: error.message });
      result = created;
    }

    res.json({ success: true, channel: maskChannelTokens(channel, data) });
  } catch (err) {
    console.error('[Settings] PUT /channels/:channel error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/settings/channels/:channel/test — Test kết nối kênh
router.post('/channels/:channel/test', async (req, res) => {
  const { channel } = req.params;
  const start = Date.now();

  if (channel === 'facebook') {
    try {
      // Get token from channels table
      const { data: ch } = await supabaseAdmin
        .from('channels')
        .select('page_access_token')
        .eq('tenant_id', req.tenantId)
        .eq('type', 'facebook')
        .single();

      const token = ch?.page_access_token || config.fb.pageAccessToken;
      if (!token) {
        return res.json({ success: false, error: 'Chưa có Page Access Token' });
      }

      const fbRes = await axios.get(`${config.fb.graphApiUrl}/me`, {
        params: { access_token: token, fields: 'id,name' },
        timeout: 10000,
      });
      return res.json({
        success: true,
        latency: Date.now() - start,
        pageInfo: { id: fbRes.data.id, name: fbRes.data.name },
      });
    } catch (err) {
      return res.json({
        success: false,
        error: err.response?.data?.error?.message || err.message,
        latency: Date.now() - start,
      });
    }
  }

  res.json({ success: false, error: `Kênh ${channel} chưa được hỗ trợ test` });
});

// DELETE /api/settings/channels/:channel — Ngắt kết nối kênh
router.delete('/channels/:channel', async (req, res) => {
  try {
    const { channel } = req.params;
    const { error } = await supabaseAdmin
      .from('channels')
      .update({ connected: false, page_access_token: null, page_id: null, page_name: null })
      .eq('tenant_id', req.tenantId)
      .eq('type', channel);

    if (error) {
      return res.status(500).json({ error: error.message });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('[Settings] DELETE /channels/:channel error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/settings/ai — Cập nhật AI config
router.put('/ai', async (req, res) => {
  try {
    const { error } = await supabaseAdmin
      .from('tenants')
      .update({ ai_config: req.body })
      .eq('id', req.tenantId);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, ai: maskField({ ...req.body }, 'apiKey') });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/settings/ai/test — Test API key AI
router.post('/ai/test', async (req, res) => {
  const start = Date.now();

  try {
    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('ai_config')
      .eq('id', req.tenantId)
      .single();

    const aiSettings = tenant?.ai_config || {};

    if (!aiSettings.apiKey) {
      return res.json({ success: false, error: 'Chưa có API Key' });
    }

    if (aiSettings.provider === 'anthropic') {
      const response = await axios.post(
        'https://api.anthropic.com/v1/messages',
        {
          model: aiSettings.model || 'claude-sonnet-4-20250514',
          max_tokens: 50,
          messages: [{ role: 'user', content: 'Trả lời ngắn gọn: 1+1=?' }],
        },
        {
          headers: {
            'x-api-key': aiSettings.apiKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
          },
          timeout: 15000,
        }
      );
      return res.json({
        success: true,
        latency: Date.now() - start,
        response: response.data.content?.[0]?.text || 'OK',
      });
    }

    if (aiSettings.provider === 'openai') {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: aiSettings.model || 'gpt-4o-mini',
          max_tokens: 50,
          messages: [{ role: 'user', content: 'Trả lời ngắn gọn: 1+1=?' }],
        },
        {
          headers: {
            Authorization: `Bearer ${aiSettings.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        }
      );
      return res.json({
        success: true,
        latency: Date.now() - start,
        response: response.data.choices?.[0]?.message?.content || 'OK',
      });
    }

    res.json({ success: false, error: `Provider ${aiSettings.provider} không hỗ trợ` });
  } catch (err) {
    res.json({
      success: false,
      error: err.response?.data?.error?.message || err.message,
      latency: Date.now() - start,
    });
  }
});

// PUT /api/settings/oms — Cập nhật OMS config
router.put('/oms', async (req, res) => {
  try {
    const { error } = await supabaseAdmin
      .from('tenants')
      .update({ oms_config: req.body })
      .eq('id', req.tenantId);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, oms: maskField({ ...req.body }, 'apiKey') });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/settings/oms/test — Test kết nối OMS
router.post('/oms/test', async (req, res) => {
  const start = Date.now();

  try {
    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('oms_config')
      .eq('id', req.tenantId)
      .single();

    const oms = tenant?.oms_config || {};

    if (!oms.apiUrl) {
      return res.json({ success: false, error: 'Chưa có API URL' });
    }

    await axios.get(oms.apiUrl, {
      headers: oms.apiKey ? { Authorization: `Bearer ${oms.apiKey}` } : {},
      timeout: 10000,
    });
    res.json({ success: true, latency: Date.now() - start });
  } catch (err) {
    res.json({
      success: false,
      error: err.message,
      latency: Date.now() - start,
    });
  }
});

// PUT /api/settings/shop — Cập nhật thông tin shop
router.put('/shop', async (req, res) => {
  try {
    const { error } = await supabaseAdmin
      .from('tenants')
      .update({ shop_info: req.body })
      .eq('id', req.tenantId);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, shop: req.body });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/settings/account — Cập nhật account
router.put('/account', async (req, res) => {
  try {
    const { error } = await supabaseAdmin
      .from('tenants')
      .update({ account_config: req.body })
      .eq('id', req.tenantId);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, account: req.body });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/settings/notifications — Cập nhật notification preferences
router.put('/notifications', async (req, res) => {
  try {
    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('account_config')
      .eq('id', req.tenantId)
      .single();

    const existing = tenant?.account_config || {};
    const updated = { ...existing, notifications: req.body };

    const { error } = await supabaseAdmin
      .from('tenants')
      .update({ account_config: updated })
      .eq('id', req.tenantId);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/settings/products — Danh sách sản phẩm
router.get('/products', async (req, res) => {
  try {
    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('products')
      .eq('id', req.tenantId)
      .single();

    res.json(tenant?.products || []);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/settings/products/upload — Upload sản phẩm mới
router.post('/products/upload', async (req, res) => {
  const { products } = req.body;

  if (!Array.isArray(products)) {
    return res.status(400).json({ error: 'products phải là mảng' });
  }

  try {
    const { error } = await supabaseAdmin
      .from('tenants')
      .update({ products })
      .eq('id', req.tenantId);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, productCount: products.length });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/settings/quick-replies — Danh sách quick replies
router.get('/quick-replies', async (req, res) => {
  try {
    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('quick_replies')
      .eq('id', req.tenantId)
      .single();

    res.json(tenant?.quick_replies || []);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/settings/quick-replies — Cập nhật quick replies
router.put('/quick-replies', async (req, res) => {
  try {
    const { quick_replies } = req.body;
    if (!Array.isArray(quick_replies)) {
      return res.status(400).json({ error: 'quick_replies phải là mảng' });
    }

    const { error } = await supabaseAdmin
      .from('tenants')
      .update({ quick_replies })
      .eq('id', req.tenantId);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/settings/comments — Comment settings
router.get('/comments', async (req, res) => {
  try {
    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('comment_settings')
      .eq('id', req.tenantId)
      .single();

    res.json(tenant?.comment_settings || {
      auto_hide_phone: true,
      auto_hide_keywords: [],
      auto_reply_enabled: false,
      auto_reply_message: 'Shop da inbox cho anh/chi a!',
      auto_inbox_enabled: false,
      auto_inbox_message: 'Chao anh/chi! De em tu van chi tiet a',
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/settings/comments — Update comment settings
router.put('/comments', async (req, res) => {
  try {
    const { error } = await supabaseAdmin
      .from('tenants')
      .update({ comment_settings: req.body })
      .eq('id', req.tenantId);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, comment_settings: req.body });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// === Helpers mask tokens ===

function maskToken(token) {
  if (!token || token.length < 10) return token ? '●'.repeat(8) : '';
  return token.slice(0, 6) + '●'.repeat(16) + token.slice(-4);
}

function maskField(obj, field) {
  const copy = { ...obj };
  if (copy[field]) copy[field] = maskToken(copy[field]);
  return copy;
}

function maskChannelTokens(channel, data) {
  const copy = { ...data };
  const sensitiveFields = ['pageAccessToken', 'appSecret', 'oaAccessToken', 'oaSecretKey', 'clientKey', 'clientSecret'];
  for (const f of sensitiveFields) {
    if (copy[f]) copy[f] = maskToken(copy[f]);
  }
  return copy;
}

function maskTokens(settings) {
  for (const [ch, data] of Object.entries(settings.channels || {})) {
    settings.channels[ch] = maskChannelTokens(ch, data);
  }
  if (settings.ai?.apiKey) settings.ai.apiKey = maskToken(settings.ai.apiKey);
  if (settings.oms?.apiKey) settings.oms.apiKey = maskToken(settings.oms.apiKey);
}

module.exports = router;
