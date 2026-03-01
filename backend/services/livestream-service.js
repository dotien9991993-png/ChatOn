const axios = require('axios');
const config = require('../config');
const { supabaseAdmin } = require('../config/supabase');

const GRAPH = config.fb.graphApiUrl;

// Active polling sessions: livestreamId -> intervalId
const activePolls = new Map();

/**
 * Start polling comments for a livestream video
 * Polls Facebook Graph API every 3 seconds for new comments
 */
function startPolling(livestreamId, fbVideoId, pageAccessToken, tenantId, orderSyntax, io) {
  if (activePolls.has(livestreamId)) {
    console.log(`[Livestream] Already polling ${livestreamId}`);
    return;
  }

  let lastTimestamp = null;
  let totalComments = 0;
  let totalOrders = 0;

  console.log(`[Livestream] Start polling ${fbVideoId} for livestream ${livestreamId}`);

  const interval = setInterval(async () => {
    try {
      const params = {
        access_token: pageAccessToken,
        fields: 'id,message,from,created_time',
        limit: 50,
        order: 'reverse_chronological',
      };

      if (lastTimestamp) {
        params.since = Math.floor(new Date(lastTimestamp).getTime() / 1000);
      }

      const res = await axios.get(`${GRAPH}/${fbVideoId}/comments`, { params });
      const comments = res.data.data || [];

      if (comments.length === 0) return;

      for (const c of comments) {
        // Check if already saved
        const { data: existing } = await supabaseAdmin
          .from('livestream_comments')
          .select('id')
          .eq('comment_id', c.id)
          .single();

        if (existing) continue;

        // Check if this is an order comment
        const orderMatch = matchOrderSyntax(c.message, orderSyntax);

        const commentData = {
          livestream_id: livestreamId,
          tenant_id: tenantId,
          comment_id: c.id,
          user_id: c.from?.id || '',
          user_name: c.from?.name || '',
          message: c.message || '',
          is_order: !!orderMatch,
          matched_keyword: orderMatch?.keyword || null,
          matched_product_name: orderMatch?.productName || null,
          quantity: orderMatch?.quantity || 1,
          created_time: c.created_time,
        };

        await supabaseAdmin
          .from('livestream_comments')
          .insert(commentData);

        totalComments++;

        if (orderMatch) {
          totalOrders++;
        }

        // Emit real-time comment
        io.to(`tenant:${tenantId}`).emit('livestream_comment', {
          livestreamId,
          comment: commentData,
        });
      }

      // Update last timestamp
      if (comments.length > 0) {
        lastTimestamp = comments[0].created_time;
      }

      // Update livestream stats
      await supabaseAdmin
        .from('livestreams')
        .update({
          total_comments: totalComments,
          total_orders: totalOrders,
        })
        .eq('id', livestreamId);
    } catch (err) {
      console.error(`[Livestream] Poll error for ${livestreamId}:`, err.response?.data || err.message);
    }
  }, 3000);

  activePolls.set(livestreamId, interval);
}

/**
 * Stop polling for a livestream
 */
function stopPolling(livestreamId) {
  const interval = activePolls.get(livestreamId);
  if (interval) {
    clearInterval(interval);
    activePolls.delete(livestreamId);
    console.log(`[Livestream] Stopped polling ${livestreamId}`);
  }
}

/**
 * Match comment against order syntax rules
 * orderSyntax example: [{ keyword: "SP01", product_name: "Loa Bluetooth X1", price: 500000 }]
 * Comment formats: "SP01", "SP01 x2", "SP01 2", "mua SP01"
 */
function matchOrderSyntax(message, orderSyntax) {
  if (!message || !orderSyntax?.length) return null;

  const msg = message.trim().toUpperCase();

  for (const rule of orderSyntax) {
    const keyword = (rule.keyword || '').toUpperCase();
    if (!keyword) continue;

    // Check if message contains the keyword
    if (msg.includes(keyword)) {
      // Try to extract quantity: "SP01 x2", "SP01 2", "SP01x3"
      const qtyRegex = new RegExp(`${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*[xX]?(\\d+)`, 'i');
      const match = message.match(qtyRegex);
      const quantity = match?.[1] ? parseInt(match[1], 10) : 1;

      return {
        keyword: rule.keyword,
        productName: rule.product_name || rule.keyword,
        price: rule.price || 0,
        quantity: Math.min(quantity, 99), // Cap at 99
      };
    }
  }

  return null;
}

module.exports = { startPolling, stopPolling };
