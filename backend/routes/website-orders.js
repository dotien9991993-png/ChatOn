const express = require('express');
const router = express.Router();
const { websiteSupabase, websiteTenantId } = require('../services/websiteSupabase');
const { supabaseAdmin } = require('../config/supabase');

/**
 * CRUD đơn hàng trên website DB
 * Đồng thời lưu bản copy vào ChatOn DB
 *
 * Website DB orders columns:
 * order_number, customer_name, customer_phone, shipping_address,
 * subtotal, total_amount, shipping_fee, discount_amount,
 * payment_method, payment_status, paid_amount,
 * note, source, channel, order_source, order_type, created_by, tenant_id
 */

// GET /api/website-orders — Danh sách đơn hàng
router.get('/', async (req, res) => {
  try {
    const { status, search, customer_phone, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = websiteSupabase
      .from('orders')
      .select('*', { count: 'exact' })
      .eq('tenant_id', websiteTenantId)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }
    if (customer_phone) {
      query = query.eq('customer_phone', customer_phone);
    }
    if (search) {
      query = query.or(`order_number.ilike.%${search}%,customer_name.ilike.%${search}%,customer_phone.ilike.%${search}%`);
    }

    query = query.range(offset, offset + parseInt(limit) - 1);

    const { data: orders, error, count } = await query;

    if (error) return res.status(500).json({ error: error.message });

    // Map to frontend format
    const mapped = (orders || []).map((o) => ({
      ...o,
      order_code: o.order_number,
      total: o.total_amount,
    }));

    res.json({
      orders: mapped,
      total: count || 0,
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (err) {
    console.error('[WebsiteOrders] GET / error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/website-orders/:id — Chi tiết đơn hàng
router.get('/:id', async (req, res) => {
  try {
    const { data: order, error } = await websiteSupabase
      .from('orders')
      .select('*')
      .eq('id', req.params.id)
      .eq('tenant_id', websiteTenantId)
      .single();

    if (error || !order) return res.status(404).json({ error: 'Không tìm thấy đơn hàng' });

    res.json({
      ...order,
      order_code: order.order_number,
      total: order.total_amount,
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/website-orders — Tạo đơn trong website DB
router.post('/', async (req, res) => {
  try {
    const { conversation_id, customer_name, customer_phone, customer_address, items, note } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Cần ít nhất 1 sản phẩm' });
    }
    if (!customer_phone) {
      return res.status(400).json({ error: 'Thiếu số điện thoại' });
    }

    // Generate order number
    const orderNumber = `CO-${Date.now().toString().slice(-6)}`;

    // Calculate items
    const orderItems = items.map((i) => ({
      product_name: i.product_name,
      product_id: i.product_id || null,
      quantity: i.quantity || 1,
      price: i.price || 0,
      subtotal: (i.quantity || 1) * (i.price || 0),
    }));
    const subtotal = orderItems.reduce((sum, i) => sum + i.subtotal, 0);

    // 1. Insert vào website DB (dùng đúng tên cột website)
    const { data: websiteOrder, error: wsError } = await websiteSupabase
      .from('orders')
      .insert({
        tenant_id: websiteTenantId,
        order_number: orderNumber,
        order_type: 'sale',
        customer_name: customer_name || '',
        customer_phone,
        shipping_address: customer_address || '',
        subtotal,
        total_amount: subtotal,
        shipping_fee: 0,
        discount_amount: 0,
        payment_method: 'cod',
        payment_status: 'unpaid',
        paid_amount: 0,
        note: note || '',
        source: 'chaton',
        order_source: 'chaton',
        channel: 'messenger',
        created_by: 'agent',
        status: 'pending',
      })
      .select('*')
      .single();

    if (wsError) {
      console.error('[WebsiteOrders] Website DB insert error:', wsError.message);
      return res.status(500).json({ error: 'Lỗi tạo đơn trên website: ' + wsError.message });
    }

    // 1b. Insert order items vào bảng order_items
    const orderItemRows = orderItems.map((i) => ({
      order_id: websiteOrder.id,
      tenant_id: websiteTenantId,
      product_id: i.product_id,
      product_name: i.product_name,
      quantity: i.quantity,
      unit_price: i.price,
      subtotal: i.subtotal,
    }));

    const { error: itemsError } = await websiteSupabase
      .from('order_items')
      .insert(orderItemRows);

    if (itemsError) {
      console.error('[WebsiteOrders] order_items insert error:', itemsError.message);
      // Đơn đã tạo nhưng items lỗi — log nhưng không fail
    }

    // 2. Lưu bản copy vào ChatOn DB
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

    await supabaseAdmin
      .from('orders')
      .insert({
        tenant_id: req.tenantId,
        order_code: orderNumber,
        conversation_id: conversation_id || null,
        customer_id: customerId,
        customer_name: customer_name || '',
        customer_phone,
        customer_address: customer_address || '',
        items: orderItems,
        total: subtotal,
        note: note || '',
        source: 'website',
        channel_type: channelType || 'facebook',
        created_by: 'agent',
        status: 'pending',
      })
      .select('*')
      .single();

    // 3. Gửi tin nhắn xác nhận trong chat
    if (conversation_id) {
      const itemsSummary = orderItems.map((i) => `${i.product_name} x${i.quantity}`).join(', ');
      const confirmText = `✅ Đơn ${orderNumber} đã tạo trên website!\n📦 ${itemsSummary}\n💰 Tổng: ${subtotal.toLocaleString('vi-VN')}đ\n📍 Giao: ${customer_address || 'Chưa có'}\nĐơn đã được đẩy sang website bán hàng 🎉`;

      await supabaseAdmin.from('messages').insert({
        conversation_id,
        sender: 'system',
        text: confirmText,
        type: 'system',
      });
    }

    // 4. Emit socket event
    const io = req.app.get('io');
    io.to(`tenant:${req.tenantId}`).emit('new_website_order', {
      id: websiteOrder.id,
      order_code: orderNumber,
      total: subtotal,
      items: orderItems,
      customer_name,
      customer_phone,
    });

    // Return with mapped fields for frontend
    res.json({
      ...websiteOrder,
      order_code: websiteOrder.order_number,
      total: websiteOrder.total_amount,
    });
  } catch (err) {
    console.error('[WebsiteOrders] POST / error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/website-orders/:id/cancel — Hủy đơn
router.post('/:id/cancel', async (req, res) => {
  try {
    const { error } = await websiteSupabase
      .from('orders')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', req.params.id)
      .eq('tenant_id', websiteTenantId);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
