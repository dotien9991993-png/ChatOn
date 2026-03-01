const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');

/**
 * API Drip Campaigns (kịch bản chăm sóc tự động)
 */

// GET /api/drip-campaigns
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('drip_campaigns')
      .select('*')
      .eq('tenant_id', req.tenantId)
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/drip-campaigns
router.post('/', async (req, res) => {
  try {
    const { name, trigger_event, steps, is_active } = req.body;
    if (!name || !steps || steps.length === 0) {
      return res.status(400).json({ error: 'Thiếu name hoặc steps' });
    }

    const { data, error } = await supabaseAdmin
      .from('drip_campaigns')
      .insert({
        tenant_id: req.tenantId,
        name,
        trigger_event: trigger_event || 'order_created',
        steps,
        is_active: is_active !== false,
      })
      .select('*')
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/drip-campaigns/:id
router.put('/:id', async (req, res) => {
  try {
    const updates = {};
    ['name', 'trigger_event', 'steps', 'is_active'].forEach(f => {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    });

    const { data, error } = await supabaseAdmin
      .from('drip_campaigns')
      .update(updates)
      .eq('id', req.params.id)
      .eq('tenant_id', req.tenantId)
      .select('*')
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/drip-campaigns/:id
router.delete('/:id', async (req, res) => {
  try {
    await supabaseAdmin
      .from('drip_campaigns')
      .delete()
      .eq('id', req.params.id)
      .eq('tenant_id', req.tenantId);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/drip-campaigns/:id/enroll — Manually enroll customer
router.post('/:id/enroll', async (req, res) => {
  try {
    const { customer_id } = req.body;

    const { data: campaign } = await supabaseAdmin
      .from('drip_campaigns')
      .select('steps')
      .eq('id', req.params.id)
      .eq('tenant_id', req.tenantId)
      .single();

    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    const firstStep = campaign.steps[0];
    const nextSendAt = new Date(Date.now() + (firstStep?.delay_days || 0) * 86400000).toISOString();

    const { data, error } = await supabaseAdmin
      .from('drip_enrollments')
      .insert({
        drip_campaign_id: req.params.id,
        customer_id,
        current_step: 0,
        next_send_at: nextSendAt,
        status: 'active',
      })
      .select('*')
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
