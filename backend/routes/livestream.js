const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');
const { startPolling, stopPolling } = require('../services/livestream-service');
const fbService = require('../services/facebook');

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
      .limit(1)
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

    // === Livestream Reminder: find uncommitted orders ===
    try {
      const { data: lsComments } = await supabaseAdmin
        .from('livestream_comments')
        .select('user_id, user_name, order_detected, order_confirmed')
        .eq('livestream_id', req.params.id)
        .eq('order_detected', true)
        .eq('order_confirmed', false);

      if (lsComments && lsComments.length > 0) {
        // Get channel for sending messages
        const { data: channel } = await supabaseAdmin
          .from('channels')
          .select('page_access_token')
          .eq('tenant_id', req.tenantId)
          .eq('type', 'facebook')
          .eq('connected', true)
          .limit(1)
          .single();

        if (channel?.page_access_token) {
          const uniqueUsers = [...new Map(lsComments.map(c => [c.user_id, c])).values()];
          let remindersSent = 0;

          for (const user of uniqueUsers) {
            if (!user.user_id) continue;
            try {
              const reminderText = `Hi ${user.user_name || 'bạn'}! Bạn đã đặt hàng trong livestream nhưng chưa xác nhận. Vui lòng nhắn SĐT + địa chỉ để shop hoàn tất đơn hàng nhé!`;
              await fbService.sendMessageWithToken(user.user_id, reminderText, channel.page_access_token);
              remindersSent++;
            } catch (sendErr) {
              // Non-fatal: user may not have messaged the page
            }
          }

          console.log(`[Livestream] Sent ${remindersSent} reminders for livestream ${req.params.id}`);
          io.to(`tenant:${req.tenantId}`).emit('livestream_reminders_sent', {
            livestreamId: req.params.id,
            count: remindersSent,
          });
        }
      }
    } catch (reminderErr) {
      console.error('[Livestream] Reminder error (non-fatal):', reminderErr.message);
    }

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
