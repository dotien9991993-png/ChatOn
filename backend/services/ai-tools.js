const { supabaseAdmin } = require('../config/supabase');
const { pushOrderToOMS } = require('./oms-push');

/**
 * AI Tool implementations
 */

// === search_products ===
async function searchProducts(tenantId, input) {
  const { query, category, min_price, max_price } = input;

  let q = supabaseAdmin
    .from('products')
    .select('id, name, sku, category, price, stock, description, image_url')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .ilike('name', `%${query}%`);

  if (category) {
    q = q.ilike('category', `%${category}%`);
  }
  if (min_price) {
    q = q.gte('price', min_price);
  }
  if (max_price) {
    q = q.lte('price', max_price);
  }

  const { data: products, error } = await q.limit(5);

  if (error) {
    return { error: error.message };
  }

  if (!products || products.length === 0) {
    return { results: [], message: 'Không tìm thấy sản phẩm phù hợp.' };
  }

  return {
    results: products.map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      stock: p.stock,
      description: p.description || '',
      category: p.category || '',
    })),
  };
}

// === create_order ===
async function createOrder(tenantId, conversationId, input, io) {
  const { customer_name, customer_phone, customer_address, items, note } = input;

  try {
    // Generate order code
    const { data: seqData } = await supabaseAdmin.rpc('nextval', { seq_name: 'order_code_seq' }).single();
    // Fallback if rpc doesn't work
    const seq = seqData || Date.now().toString().slice(-6);
    const orderCode = `DH-${seq}`;

    // Calculate total
    const orderItems = items.map((i) => ({
      product_name: i.product_name,
      product_id: i.product_id || null,
      quantity: i.quantity || 1,
      price: i.price || 0,
      subtotal: (i.quantity || 1) * (i.price || 0),
    }));
    const total = orderItems.reduce((sum, i) => sum + i.subtotal, 0);

    // Get conversation info
    const { data: conv } = await supabaseAdmin
      .from('conversations')
      .select('customer_id, channel')
      .eq('id', conversationId)
      .single();

    // Save order to Supabase
    const { data: order, error: orderErr } = await supabaseAdmin
      .from('orders')
      .insert({
        tenant_id: tenantId,
        order_code: orderCode,
        conversation_id: conversationId,
        customer_id: conv?.customer_id,
        customer_name: customer_name || '',
        customer_phone: customer_phone,
        customer_address: customer_address,
        items: orderItems,
        total,
        note: note || '',
        source: 'chat',
        channel_type: conv?.channel || 'facebook',
        created_by: 'ai',
        status: 'draft',
      })
      .select('*')
      .single();

    if (orderErr) {
      return { success: false, error: orderErr.message };
    }

    // Update customer info if missing
    if (conv?.customer_id) {
      const updates = {};
      if (customer_name) updates.name = customer_name;
      if (customer_phone) updates.phone = customer_phone;
      if (customer_address) updates.address = customer_address;
      if (Object.keys(updates).length > 0) {
        await supabaseAdmin.from('customers').update(updates).eq('id', conv.customer_id);
      }
    }

    // Push to OMS
    const omsResult = await pushOrderToOMS(tenantId, order);

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

    // Emit new_order event
    if (io) {
      io.to(`tenant:${tenantId}`).emit('new_order', {
        id: order.id,
        order_code: orderCode,
        total,
        items: orderItems,
        customer_name,
        customer_phone,
        oms_synced: omsResult.success,
      });
    }

    return {
      success: true,
      order_code: orderCode,
      total,
      items_count: orderItems.length,
      oms_synced: omsResult.success,
      oms_message: omsResult.message || '',
    };
  } catch (err) {
    console.error('[AI Tools] create_order error:', err.message);
    return { success: false, error: err.message };
  }
}

// === handoff_to_agent ===
async function handoffToAgent(tenantId, conversationId, input, io) {
  const { reason } = input;

  try {
    // Disable AI for this conversation
    await supabaseAdmin
      .from('conversations')
      .update({ ai_enabled: false })
      .eq('id', conversationId);

    // Save system message
    await supabaseAdmin.from('messages').insert({
      conversation_id: conversationId,
      sender: 'system',
      text: `🔔 AI chuyển cho nhân viên. Lý do: ${reason}`,
      type: 'system',
    });

    // Emit event
    if (io) {
      io.to(`tenant:${tenantId}`).emit('agent_needed', {
        conversationId,
        reason,
      });
    }

    return { handoff: true, reason };
  } catch (err) {
    console.error('[AI Tools] handoff error:', err.message);
    return { handoff: false, error: err.message };
  }
}

module.exports = { searchProducts, createOrder, handoffToAgent };
