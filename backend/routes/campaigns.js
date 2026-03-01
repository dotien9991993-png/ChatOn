const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');
const { executeCampaign } = require('../services/campaign-service');

/**
 * API chiến dịch gửi tin nhắn hàng loạt (multi-tenant)
 */

// GET /api/campaigns — Danh sách
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    let query = supabaseAdmin
      .from('campaigns')
      .select('*')
      .eq('tenant_id', req.tenantId)
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  } catch (err) {
    console.error('[Campaigns] GET / error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/campaigns/:id — Chi tiết + logs
router.get('/:id', async (req, res) => {
  try {
    const { data: campaign, error } = await supabaseAdmin
      .from('campaigns')
      .select('*')
      .eq('id', req.params.id)
      .eq('tenant_id', req.tenantId)
      .single();

    if (error || !campaign) return res.status(404).json({ error: 'Campaign not found' });

    const { data: logs } = await supabaseAdmin
      .from('campaign_logs')
      .select('*')
      .eq('campaign_id', campaign.id)
      .order('created_at', { ascending: false })
      .limit(200);

    res.json({ ...campaign, logs: logs || [] });
  } catch (err) {
    console.error('[Campaigns] GET /:id error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/campaigns — Tạo mới (draft)
router.post('/', async (req, res) => {
  try {
    const { name, description, target_type, target_tags, target_channel, target_customer_ids,
            message_type, message_text, message_image_url, message_buttons } = req.body;

    if (!name || !message_text) {
      return res.status(400).json({ error: 'name và message_text là bắt buộc' });
    }

    const { data, error } = await supabaseAdmin
      .from('campaigns')
      .insert({
        tenant_id: req.tenantId,
        name,
        description,
        target_type: target_type || 'all',
        target_tags: target_tags || [],
        target_channel,
        target_customer_ids: target_customer_ids || [],
        message_type: message_type || 'text',
        message_text,
        message_image_url,
        message_buttons: message_buttons || [],
        status: 'draft',
        created_by: req.user.id,
      })
      .select('*')
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) {
    console.error('[Campaigns] POST / error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/campaigns/:id — Cập nhật
router.put('/:id', async (req, res) => {
  try {
    const { data: existing } = await supabaseAdmin
      .from('campaigns')
      .select('status')
      .eq('id', req.params.id)
      .eq('tenant_id', req.tenantId)
      .single();

    if (!existing) return res.status(404).json({ error: 'Campaign not found' });
    if (existing.status !== 'draft' && existing.status !== 'scheduled') {
      return res.status(400).json({ error: 'Chỉ có thể sửa chiến dịch nháp hoặc đã lên lịch' });
    }

    const updates = { ...req.body, updated_at: new Date().toISOString() };
    delete updates.id;
    delete updates.tenant_id;
    delete updates.created_by;

    const { data, error } = await supabaseAdmin
      .from('campaigns')
      .update(updates)
      .eq('id', req.params.id)
      .eq('tenant_id', req.tenantId)
      .select('*')
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) {
    console.error('[Campaigns] PUT /:id error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/campaigns/:id/send — Gửi ngay
router.post('/:id/send', async (req, res) => {
  try {
    const { data: campaign } = await supabaseAdmin
      .from('campaigns')
      .select('*')
      .eq('id', req.params.id)
      .eq('tenant_id', req.tenantId)
      .single();

    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    if (campaign.status === 'sending' || campaign.status === 'sent') {
      return res.status(400).json({ error: 'Chiến dịch đang gửi hoặc đã gửi' });
    }

    // Mark as sending
    await supabaseAdmin
      .from('campaigns')
      .update({ status: 'sending' })
      .eq('id', campaign.id);

    res.json({ success: true, message: 'Đang bắt đầu gửi...' });

    // Execute async
    const io = req.app.get('io');
    executeCampaign(campaign.id, io).catch((err) => {
      console.error('[Campaigns] Execute error:', err.message);
    });
  } catch (err) {
    console.error('[Campaigns] POST /:id/send error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/campaigns/:id/schedule — Lên lịch
router.post('/:id/schedule', async (req, res) => {
  try {
    const { scheduled_at } = req.body;
    if (!scheduled_at) return res.status(400).json({ error: 'scheduled_at là bắt buộc' });

    const { data, error } = await supabaseAdmin
      .from('campaigns')
      .update({ status: 'scheduled', scheduled_at, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('tenant_id', req.tenantId)
      .select('*')
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) {
    console.error('[Campaigns] POST /:id/schedule error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/campaigns/:id/cancel — Hủy
router.post('/:id/cancel', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('campaigns')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('tenant_id', req.tenantId)
      .in('status', ['draft', 'scheduled'])
      .select('*')
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) {
    console.error('[Campaigns] POST /:id/cancel error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/campaigns/:id/preview — Preview eligible recipients
router.get('/:id/preview', async (req, res) => {
  try {
    const { data: campaign } = await supabaseAdmin
      .from('campaigns')
      .select('*')
      .eq('id', req.params.id)
      .eq('tenant_id', req.tenantId)
      .single();

    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    // Get recipients based on target
    let query = supabaseAdmin
      .from('conversations')
      .select('id, customer_id, last_message_at, channel, customers!inner(id, name, external_id, tags)')
      .eq('tenant_id', campaign.tenant_id);

    if (campaign.target_type === 'channel') {
      query = query.eq('channel', campaign.target_channel || 'facebook');
    }

    const { data: convs } = await query;

    // Filter by tags if needed
    let recipients = convs || [];
    if (campaign.target_type === 'tag' && campaign.target_tags?.length) {
      recipients = recipients.filter((c) => {
        const tags = c.customers?.tags || [];
        return campaign.target_tags.some((t) => tags.includes(t));
      });
    }
    if (campaign.target_type === 'custom' && campaign.target_customer_ids?.length) {
      recipients = recipients.filter((c) => campaign.target_customer_ids.includes(c.customer_id));
    }

    // 24h eligibility check
    const now = Date.now();
    const eligible = recipients.filter((c) => {
      const lastMsg = new Date(c.last_message_at).getTime();
      return (now - lastMsg) < 24 * 60 * 60 * 1000;
    });

    res.json({
      totalRecipients: recipients.length,
      eligibleRecipients: eligible.length,
      ineligibleRecipients: recipients.length - eligible.length,
      warning: eligible.length < recipients.length
        ? `Chỉ ${eligible.length}/${recipients.length} khách đủ điều kiện nhận tin (Facebook 24h policy)`
        : null,
    });
  } catch (err) {
    console.error('[Campaigns] GET /:id/preview error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
