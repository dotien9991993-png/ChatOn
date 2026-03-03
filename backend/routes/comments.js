const express = require('express');
const router = express.Router();
const axios = require('axios');
const { supabaseAdmin } = require('../config/supabase');
const config = require('../config');

const GRAPH = config.fb.graphApiUrl;

/**
 * Helper: get page access token for tenant
 */
async function getPageToken(tenantId) {
  const { data } = await supabaseAdmin
    .from('channels')
    .select('page_access_token')
    .eq('tenant_id', tenantId)
    .eq('type', 'facebook')
    .eq('connected', true)
    .limit(1)
    .single();
  return data?.page_access_token;
}

// GET /api/comments — Danh sách comments (grouped by post)
router.get('/', async (req, res) => {
  try {
    const { post_id, is_replied, has_phone, is_hidden, page = 1, limit = 50, search } = req.query;

    let query = supabaseAdmin
      .from('comments')
      .select('*', { count: 'exact' })
      .eq('tenant_id', req.tenantId)
      .order('created_time', { ascending: false });

    if (post_id) query = query.eq('post_id', post_id);
    if (is_replied === 'true') query = query.eq('is_replied', true);
    if (is_replied === 'false') query = query.eq('is_replied', false);
    if (has_phone === 'true') query = query.eq('has_phone', true);
    if (is_hidden === 'true') query = query.eq('is_hidden', true);
    if (is_hidden === 'false') query = query.eq('is_hidden', false);
    if (search) query = query.ilike('message', `%${search}%`);

    const offset = (Number(page) - 1) * Number(limit);
    const { data, error, count } = await query.range(offset, offset + Number(limit) - 1);

    if (error) return res.status(500).json({ error: error.message });

    // Group by post
    const posts = {};
    for (const c of data || []) {
      if (!posts[c.post_id]) {
        posts[c.post_id] = {
          post_id: c.post_id,
          post_content: c.post_content,
          post_url: c.post_url,
          comments: [],
        };
      }
      posts[c.post_id].comments.push(c);
    }

    res.json({
      posts: Object.values(posts),
      comments: data || [],
      total: count || 0,
      page: Number(page),
      totalPages: Math.ceil((count || 0) / Number(limit)),
    });
  } catch (err) {
    console.error('[Comments] GET / error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/comments/posts — Unique posts list
router.get('/posts', async (req, res) => {
  try {
    const { data } = await supabaseAdmin
      .from('comments')
      .select('post_id, post_content, post_url')
      .eq('tenant_id', req.tenantId)
      .order('created_time', { ascending: false });

    const seen = new Set();
    const posts = [];
    for (const c of data || []) {
      if (!seen.has(c.post_id)) {
        seen.add(c.post_id);
        posts.push({ post_id: c.post_id, post_content: c.post_content, post_url: c.post_url });
      }
    }
    res.json(posts);
  } catch (err) {
    console.error('[Comments] GET /posts error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/comments/:commentId/reply — Reply to comment via Graph API
router.post('/:commentId/reply', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'message is required' });

    const token = await getPageToken(req.tenantId);
    if (!token || token.length < 30) {
      return res.status(400).json({ error: 'No valid Facebook token' });
    }

    // Reply via Graph API
    await axios.post(`${GRAPH}/${req.params.commentId}/comments`, {
      message,
    }, {
      params: { access_token: token },
    });

    // Update DB
    await supabaseAdmin
      .from('comments')
      .update({ is_replied: true, reply_sent: message })
      .eq('comment_id', req.params.commentId)
      .eq('tenant_id', req.tenantId);

    res.json({ success: true });
  } catch (err) {
    console.error('[Comments] Reply error:', err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data?.error?.message || err.message });
  }
});

// POST /api/comments/:commentId/hide — Hide comment
router.post('/:commentId/hide', async (req, res) => {
  try {
    const token = await getPageToken(req.tenantId);
    if (!token || token.length < 30) {
      return res.status(400).json({ error: 'No valid Facebook token' });
    }

    await axios.post(`${GRAPH}/${req.params.commentId}`, {
      is_hidden: true,
    }, {
      params: { access_token: token },
    });

    await supabaseAdmin
      .from('comments')
      .update({ is_hidden: true })
      .eq('comment_id', req.params.commentId)
      .eq('tenant_id', req.tenantId);

    res.json({ success: true });
  } catch (err) {
    console.error('[Comments] Hide error:', err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data?.error?.message || err.message });
  }
});

// POST /api/comments/:commentId/unhide — Unhide comment
router.post('/:commentId/unhide', async (req, res) => {
  try {
    const token = await getPageToken(req.tenantId);
    if (!token || token.length < 30) {
      return res.status(400).json({ error: 'No valid Facebook token' });
    }

    await axios.post(`${GRAPH}/${req.params.commentId}`, {
      is_hidden: false,
    }, {
      params: { access_token: token },
    });

    await supabaseAdmin
      .from('comments')
      .update({ is_hidden: false })
      .eq('comment_id', req.params.commentId)
      .eq('tenant_id', req.tenantId);

    res.json({ success: true });
  } catch (err) {
    console.error('[Comments] Unhide error:', err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data?.error?.message || err.message });
  }
});

// POST /api/comments/:commentId/private-reply — Send Private Reply via Messenger
router.post('/:commentId/private-reply', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'message is required' });

    const token = await getPageToken(req.tenantId);
    if (!token || token.length < 30) {
      return res.status(400).json({ error: 'No valid Facebook token' });
    }

    await axios.post(`${GRAPH}/${req.params.commentId}/private_replies`, {
      message,
    }, {
      params: { access_token: token },
    });

    await supabaseAdmin
      .from('comments')
      .update({ auto_inbox_sent: true })
      .eq('comment_id', req.params.commentId)
      .eq('tenant_id', req.tenantId);

    res.json({ success: true });
  } catch (err) {
    console.error('[Comments] Private reply error:', err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data?.error?.message || err.message });
  }
});

// POST /api/comments/sync — Sync all comments from a post via Graph API
router.post('/sync', async (req, res) => {
  try {
    const { post_id } = req.body;
    if (!post_id) return res.status(400).json({ error: 'post_id is required' });

    const token = await getPageToken(req.tenantId);
    if (!token || token.length < 30) {
      return res.status(400).json({ error: 'No valid Facebook token' });
    }

    // Get channel_id
    const { data: ch } = await supabaseAdmin
      .from('channels')
      .select('id')
      .eq('tenant_id', req.tenantId)
      .eq('type', 'facebook')
      .eq('connected', true)
      .limit(1)
      .single();

    // Fetch comments from Graph API
    const fbRes = await axios.get(`${GRAPH}/${post_id}/comments`, {
      params: {
        access_token: token,
        fields: 'id,message,from,created_time,attachment',
        limit: 100,
      },
    });

    const phoneRegex = /(0\d{9}|\+84\d{9})/;
    let synced = 0;

    for (const c of fbRes.data.data || []) {
      const phoneMatch = c.message?.match(phoneRegex);

      // Upsert comment
      await supabaseAdmin
        .from('comments')
        .upsert({
          tenant_id: req.tenantId,
          channel_id: ch?.id,
          post_id,
          comment_id: c.id,
          user_id: c.from?.id || '',
          user_name: c.from?.name || '',
          message: c.message || '',
          media_url: c.attachment?.media?.image?.src || null,
          has_phone: !!phoneMatch,
          extracted_phone: phoneMatch?.[1] || null,
          created_time: c.created_time,
        }, { onConflict: 'comment_id' });

      synced++;
    }

    res.json({ success: true, synced });
  } catch (err) {
    console.error('[Comments] Sync error:', err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data?.error?.message || err.message });
  }
});

module.exports = router;
