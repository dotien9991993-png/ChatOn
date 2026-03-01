const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');
const fbService = require('../services/facebook');

/**
 * Webhook nhận trạng thái đơn hàng từ OMS bên ngoài
 * POST /webhook/oms/:tenantSlug
 */

// Status → message mapping
const STATUS_MESSAGES = {
  confirmed: (code) => `✅ Đơn hàng ${code} đã được xác nhận! Đang chuẩn bị hàng cho anh/chị.`,
  packing: (code) => `📦 Đơn ${code} đang được đóng gói.`,
  shipping: (code, data) => {
    let msg = `🚚 Đơn ${code} đang giao!`;
    if (data.tracking_code) msg += ` Mã vận đơn: ${data.tracking_code}.`;
    if (data.tracking_url) msg += ` Theo dõi tại: ${data.tracking_url}`;
    return msg;
  },
  delivered: (code) => `🎉 Đơn ${code} đã giao thành công! Cảm ơn anh/chị đã mua hàng!`,
  cancelled: (code, data) => {
    let msg = `❌ Đơn ${code} đã bị hủy.`;
    if (data.hotline) msg += ` Liên hệ ${data.hotline} nếu cần hỗ trợ.`;
    return msg;
  },
};

router.post('/:tenantSlug', async (req, res) => {
  const { tenantSlug } = req.params;
  const body = req.body;

  // Respond immediately
  res.status(200).json({ received: true });

  try {
    // 1. Find tenant by slug
    const { data: tenant, error: tErr } = await supabaseAdmin
      .from('tenants')
      .select('id, shop_info')
      .eq('slug', tenantSlug)
      .single();

    if (tErr || !tenant) {
      console.warn(`[OMS Webhook] Tenant not found for slug: ${tenantSlug}`);
      return;
    }

    const tenantId = tenant.id;

    // 2. Find order
    const { data: order, error: oErr } = await supabaseAdmin
      .from('orders')
      .select('*, conversations(id, channel, customer_id, customers(external_id, name))')
      .eq('tenant_id', tenantId)
      .or(`order_code.eq.${body.source_order_id},oms_order_id.eq.${body.order_id}`)
      .single();

    if (oErr || !order) {
      console.warn(`[OMS Webhook] Order not found: source=${body.source_order_id}, oms=${body.order_id}`);
      return;
    }

    // 3. Update order status
    const updateData = {
      status: body.status,
      oms_last_status_update: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    if (body.tracking_code) {
      updateData.oms_response = {
        ...(order.oms_response || {}),
        tracking_code: body.tracking_code,
        shipping_provider: body.shipping_provider,
        tracking_url: body.tracking_url,
      };
    }

    await supabaseAdmin
      .from('orders')
      .update(updateData)
      .eq('id', order.id);

    // 4. Send status message to customer
    const statusFn = STATUS_MESSAGES[body.status];
    if (statusFn && order.conversation_id) {
      const hotline = tenant.shop_info?.hotline || '';
      const messageText = statusFn(order.order_code, { ...body, hotline });

      // Save system message
      await supabaseAdmin.from('messages').insert({
        conversation_id: order.conversation_id,
        sender: 'system',
        text: messageText,
        type: 'system',
      });

      // Send via channel (Facebook, etc.)
      const conv = order.conversations;
      if (conv?.channel === 'facebook' && conv?.customers?.external_id) {
        // Get page access token
        const { data: channel } = await supabaseAdmin
          .from('channels')
          .select('page_access_token')
          .eq('tenant_id', tenantId)
          .eq('type', 'facebook')
          .eq('connected', true)
          .single();

        if (channel?.page_access_token) {
          await fbService.sendMessageWithToken(
            conv.customers.external_id,
            messageText,
            channel.page_access_token
          );
        }
      }

      // Update conversation last message
      await supabaseAdmin
        .from('conversations')
        .update({
          last_message: messageText,
          last_message_at: new Date().toISOString(),
        })
        .eq('id', order.conversation_id);
    }

    // 5. Emit Socket.IO event
    const io = req.app.get('io');
    io.to(`tenant:${tenantId}`).emit('order_status_update', {
      orderId: order.id,
      orderCode: order.order_code,
      status: body.status,
      trackingCode: body.tracking_code,
    });

    console.log(`[OMS Webhook] Updated order ${order.order_code} → ${body.status}`);
  } catch (err) {
    console.error('[OMS Webhook] Error:', err.message);
  }
});

module.exports = router;
