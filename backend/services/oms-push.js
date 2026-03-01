const axios = require('axios');
const { supabaseAdmin } = require('../config/supabase');

/**
 * OMS Push Service — đẩy đơn hàng sang hệ thống OMS/kho bên ngoài
 */

async function pushOrderToOMS(tenantId, order) {
  try {
    // Get OMS config from tenant
    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('oms_config')
      .eq('id', tenantId)
      .single();

    const omsConfig = tenant?.oms_config || {};
    const apiUrl = omsConfig.apiUrl;
    const apiKey = omsConfig.apiKey;

    // If no OMS configured, skip
    if (!apiUrl) {
      return { success: false, skipped: true, message: 'OMS chưa cấu hình' };
    }

    // Build request body
    const fieldMapping = omsConfig.fieldMapping || {};
    const requestBody = buildOmsPayload(order, fieldMapping);

    // POST to OMS
    const headers = {
      'Content-Type': 'application/json',
    };
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const response = await axios.post(apiUrl, requestBody, {
      headers,
      timeout: 15000,
    });

    console.log(`[OMS] Pushed order ${order.order_code} → OMS response:`, response.status);

    return {
      success: true,
      oms_order_id: response.data?.id || response.data?.order_id || null,
      response: response.data,
      message: 'Đã đẩy sang OMS thành công',
    };
  } catch (err) {
    console.error(`[OMS] Push failed for ${order.order_code}:`, err.message);

    // Retry once after 5s on network errors
    if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT') {
      console.log('[OMS] Retrying in 5s...');
      await new Promise((r) => setTimeout(r, 5000));

      try {
        const { data: tenant } = await supabaseAdmin
          .from('tenants')
          .select('oms_config')
          .eq('id', tenantId)
          .single();

        const omsConfig = tenant?.oms_config || {};
        const headers = { 'Content-Type': 'application/json' };
        if (omsConfig.apiKey) headers['Authorization'] = `Bearer ${omsConfig.apiKey}`;

        const response = await axios.post(omsConfig.apiUrl, buildOmsPayload(order, omsConfig.fieldMapping || {}), {
          headers,
          timeout: 15000,
        });

        return {
          success: true,
          oms_order_id: response.data?.id || response.data?.order_id || null,
          response: response.data,
          message: 'Đã đẩy sang OMS thành công (retry)',
        };
      } catch (retryErr) {
        return {
          success: false,
          skipped: false,
          message: `Đẩy đơn thất bại sau retry: ${retryErr.message}`,
        };
      }
    }

    return {
      success: false,
      skipped: false,
      message: `Đẩy đơn thất bại: ${err.response?.data?.message || err.message}`,
    };
  }
}

// Build OMS payload with optional field mapping
function buildOmsPayload(order, fieldMapping) {
  // Default payload
  const payload = {
    customer_name: order.customer_name,
    customer_phone: order.customer_phone,
    customer_address: order.customer_address,
    items: (order.items || []).map((i) => ({
      name: i.product_name,
      sku: i.sku || '',
      quantity: i.quantity,
      price: i.price,
      subtotal: i.subtotal,
    })),
    total: order.total,
    note: order.note || '',
    source: 'SalesFlow AI',
    source_order_id: order.order_code,
    source_conversation_id: order.conversation_id,
  };

  // Apply custom field mapping if configured
  if (fieldMapping && Object.keys(fieldMapping).length > 0) {
    const mapped = {};
    for (const [targetField, sourceField] of Object.entries(fieldMapping)) {
      if (payload[sourceField] !== undefined) {
        mapped[targetField] = payload[sourceField];
      }
    }
    return { ...payload, ...mapped };
  }

  return payload;
}

module.exports = { pushOrderToOMS };
