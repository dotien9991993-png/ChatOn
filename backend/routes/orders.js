const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');
const { pushOrderToOMS } = require('../services/oms-push');
const fbService = require('../services/facebook');

/**
 * API quản lý đơn hàng (multi-tenant via req.tenantId)
 * Orders are LOG + TRACKING only — OMS handles fulfillment
 */

// GET /api/orders — Danh sách đơn hàng
router.get('/', async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = supabaseAdmin
      .from('orders')
      .select('*', { count: 'exact' })
      .eq('tenant_id', req.tenantId)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }
    if (search) {
      query = query.or(`order_code.ilike.%${search}%,customer_name.ilike.%${search}%,customer_phone.ilike.%${search}%`);
    }

    query = query.range(offset, offset + parseInt(limit) - 1);

    const { data: orders, error, count } = await query;

    if (error) return res.status(500).json({ error: error.message });

    res.json({
      orders: orders || [],
      total: count || 0,
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (err) {
    console.error('[Orders] GET / error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/orders/:id — Chi tiết đơn hàng
router.get('/:id', async (req, res) => {
  try {
    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', req.params.id)
      .eq('tenant_id', req.tenantId)
      .single();

    if (error || !order) return res.status(404).json({ error: 'Không tìm thấy đơn hàng' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/orders — Tạo đơn thủ công (nhân viên tạo từ chat)
router.post('/', async (req, res) => {
  try {
    const { conversation_id, customer_name, customer_phone, customer_address, items, note } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Cần ít nhất 1 sản phẩm' });
    }
    if (!customer_phone) {
      return res.status(400).json({ error: 'Thiếu số điện thoại' });
    }

    // Generate order code
    const orderCode = `DH-${Date.now().toString().slice(-6)}`;

    // Calculate items
    const orderItems = items.map((i) => ({
      product_name: i.product_name,
      product_id: i.product_id || null,
      quantity: i.quantity || 1,
      price: i.price || 0,
      subtotal: (i.quantity || 1) * (i.price || 0),
    }));
    const total = orderItems.reduce((sum, i) => sum + i.subtotal, 0);

    // Get conversation info if provided
    let customerId = null;
    let channelType = null;
    if (conversation_id) {
      const { data: conv } = await supabaseAdmin
        .from('conversations')
        .select('customer_id, channel')
        .eq('id', conversation_id)
        .eq('tenant_id', req.tenantId)
        .single();
      customerId = conv?.customer_id;
      channelType = conv?.channel;

      // Update customer info
      if (customerId) {
        const updates = {};
        if (customer_name) updates.name = customer_name;
        if (customer_phone) updates.phone = customer_phone;
        if (customer_address) updates.address = customer_address;
        if (Object.keys(updates).length > 0) {
          await supabaseAdmin.from('customers').update(updates).eq('id', customerId);
        }
      }
    }

    // Save order
    const { data: order, error: orderErr } = await supabaseAdmin
      .from('orders')
      .insert({
        tenant_id: req.tenantId,
        order_code: orderCode,
        conversation_id: conversation_id || null,
        customer_id: customerId,
        customer_name: customer_name || '',
        customer_phone,
        customer_address: customer_address || '',
        items: orderItems,
        total,
        note: note || '',
        source: 'chat',
        channel_type: channelType || 'facebook',
        created_by: 'agent',
        status: 'draft',
      })
      .select('*')
      .single();

    if (orderErr) return res.status(500).json({ error: orderErr.message });

    // Push to OMS
    const omsResult = await pushOrderToOMS(req.tenantId, order);

    // Update order with OMS result
    await supabaseAdmin
      .from('orders')
      .update({
        oms_synced: omsResult.success,
        oms_order_id: omsResult.oms_order_id || null,
        oms_response: omsResult.response || null,
        oms_pushed_at: omsResult.success ? new Date().toISOString() : null,
        status: omsResult.success ? 'pushed' : (omsResult.skipped ? 'draft' : 'push_failed'),
      })
      .eq('id', order.id);

    // Send confirmation message in chat
    if (conversation_id) {
      const itemsSummary = orderItems.map((i) => `${i.product_name} x${i.quantity}`).join(', ');
      const confirmText = `✅ Đơn ${orderCode} đã tạo!\n📦 ${itemsSummary}\n💰 Tổng: ${total.toLocaleString('vi-VN')}đ\n📍 Giao: ${customer_address || 'Chưa có'}\nĐơn đang được xử lý, em sẽ cập nhật sớm ạ! 🎉`;

      await supabaseAdmin.from('messages').insert({
        conversation_id,
        sender: 'system',
        text: confirmText,
        type: 'system',
      });

      // Send invoice to customer via Facebook
      try {
        const { data: channel } = await supabaseAdmin
          .from('channels')
          .select('page_access_token')
          .eq('tenant_id', req.tenantId)
          .eq('type', channelType || 'facebook')
          .eq('connected', true)
          .single();

        const { data: customer } = await supabaseAdmin
          .from('customers')
          .select('external_id')
          .eq('id', customerId)
          .single();

        if (channel?.page_access_token && customer?.external_id) {
          await fbService.sendInvoice(customer.external_id, {
            order_code: orderCode,
            customer_name,
            customer_address,
            items: orderItems,
            total,
          }, channel.page_access_token);
        }
      } catch (invoiceErr) {
        console.error('[Orders] Invoice send error (non-fatal):', invoiceErr.message);
      }

      // Emit events
      const io = req.app.get('io');
      io.to(`tenant:${req.tenantId}`).emit('new_order', {
        id: order.id,
        order_code: orderCode,
        total,
        items: orderItems,
        customer_name,
        customer_phone,
        oms_synced: omsResult.success,
      });
    }

    res.json({
      ...order,
      oms_synced: omsResult.success,
      oms_message: omsResult.message,
    });
  } catch (err) {
    console.error('[Orders] POST / error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/orders/:id/retry-push — Đẩy lại sang OMS
router.post('/:id/retry-push', async (req, res) => {
  try {
    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', req.params.id)
      .eq('tenant_id', req.tenantId)
      .single();

    if (error || !order) return res.status(404).json({ error: 'Không tìm thấy đơn hàng' });

    const omsResult = await pushOrderToOMS(req.tenantId, order);

    await supabaseAdmin
      .from('orders')
      .update({
        oms_synced: omsResult.success,
        oms_order_id: omsResult.oms_order_id || order.oms_order_id,
        oms_response: omsResult.response || null,
        oms_pushed_at: omsResult.success ? new Date().toISOString() : order.oms_pushed_at,
        status: omsResult.success ? 'pushed' : 'push_failed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id);

    res.json({
      success: omsResult.success,
      message: omsResult.message,
    });
  } catch (err) {
    console.error('[Orders] POST /:id/retry-push error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/orders/:id/cancel — Hủy đơn
router.post('/:id/cancel', async (req, res) => {
  try {
    const { error } = await supabaseAdmin
      .from('orders')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', req.params.id)
      .eq('tenant_id', req.tenantId);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
