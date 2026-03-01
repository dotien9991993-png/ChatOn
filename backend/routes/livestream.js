const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');
const { startPolling, stopPolling } = require('../services/livestream-service');

/**
 * API Livestream bán hàng (multi-tenant)
 */

// GET /api/livestream — Danh sách livestream sessions
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('livestreams')
      .select('*')
      .eq('tenant_id', req.tenantId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  } catch (err) {
    console.error('[Livestream] GET / error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/livestream/:id — Chi tiết + comments
router.get('/:id', async (req, res) => {
  try {
    const { data: ls, error } = await supabaseAdmin
      .from('livestreams')
      .select('*')
      .eq('id', req.params.id)
      .eq('tenant_id', req.tenantId)
      .single();

    if (error || !ls) return res.status(404).json({ error: 'Livestream not found' });

    const { data: comments } = await supabaseAdmin
      .from('livestream_comments')
      .select('*')
      .eq('livestream_id', ls.id)
      .order('created_at', { ascending: false })
      .limit(200);

    res.json({ ...ls, comments: comments || [] });
  } catch (err) {
    console.error('[Livestream] GET /:id error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/livestream/start — Bắt đầu theo dõi livestream
router.post('/start', async (req, res) => {
  try {
    const { fb_video_id, title, order_syntax } = req.body;

    if (!fb_video_id) {
      return res.status(400).json({ error: 'fb_video_id là bắt buộc' });
    }

    // Get channel
    const { data: ch } = await supabaseAdmin
      .from('channels')
      .select('id, page_access_token')
      .eq('tenant_id', req.tenantId)
      .eq('type', 'facebook')
      .eq('connected', true)
      .single();

    // Create livestream record
    const { data: ls, error } = await supabaseAdmin
      .from('livestreams')
      .insert({
        tenant_id: req.tenantId,
        channel_id: ch?.id,
        fb_video_id,
        title: title || 'Livestream',
        order_syntax: order_syntax || [],
        status: 'live',
      })
      .select('*')
      .single();

    if (error) return res.status(500).json({ error: error.message });

    // Start polling comments
    const io = req.app.get('io');
    const token = ch?.page_access_token;
    if (token && token.length > 30) {
      startPolling(ls.id, fb_video_id, token, req.tenantId, order_syntax || [], io);
    }

    res.json(ls);
  } catch (err) {
    console.error('[Livestream] POST /start error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/livestream/:id/stop — Kết thúc livestream
router.post('/:id/stop', async (req, res) => {
  try {
    stopPolling(req.params.id);

    const { data, error } = await supabaseAdmin
      .from('livestreams')
      .update({ status: 'ended', ended_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('tenant_id', req.tenantId)
      .select('*')
      .single();

    if (error) return res.status(500).json({ error: error.message });

    const io = req.app.get('io');
    io.to(`tenant:${req.tenantId}`).emit('livestream_ended', { id: req.params.id });

    res.json(data);
  } catch (err) {
    console.error('[Livestream] POST /:id/stop error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/livestream/:id/comments — Stream comments for a livestream
router.get('/:id/comments', async (req, res) => {
  try {
    const { after } = req.query;
    let query = supabaseAdmin
      .from('livestream_comments')
      .select('*')
      .eq('livestream_id', req.params.id)
      .eq('tenant_id', req.tenantId)
      .order('created_at', { ascending: true });

    if (after) {
      query = query.gt('created_at', after);
    }

    const { data, error } = await query.limit(100);
    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  } catch (err) {
    console.error('[Livestream] GET /:id/comments error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
