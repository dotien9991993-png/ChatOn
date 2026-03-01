const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');

/**
 * API Customer Segments (nhóm khách hàng)
 */

// GET /api/segments
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('customer_segments')
      .select('*')
      .eq('tenant_id', req.tenantId)
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/segments
router.post('/', async (req, res) => {
  try {
    const { name, description, conditions, match_type } = req.body;
    if (!name || !conditions) {
      return res.status(400).json({ error: 'Thiếu name hoặc conditions' });
    }

    // Count matching customers
    const count = await countSegmentCustomers(req.tenantId, conditions, match_type);

    const { data, error } = await supabaseAdmin
      .from('customer_segments')
      .insert({
        tenant_id: req.tenantId,
        name,
        description: description || '',
        conditions,
        match_type: match_type || 'all',
        customer_count: count,
      })
      .select('*')
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/segments/:id
router.put('/:id', async (req, res) => {
  try {
    const updates = {};
    if (req.body.name !== undefined) updates.name = req.body.name;
    if (req.body.description !== undefined) updates.description = req.body.description;
    if (req.body.match_type !== undefined) updates.match_type = req.body.match_type;
    if (req.body.conditions !== undefined) {
      updates.conditions = req.body.conditions;
      updates.customer_count = await countSegmentCustomers(req.tenantId, req.body.conditions, req.body.match_type);
    }
    if (req.body.is_active !== undefined) updates.is_active = req.body.is_active;

    const { data, error } = await supabaseAdmin
      .from('customer_segments')
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

// DELETE /api/segments/:id
router.delete('/:id', async (req, res) => {
  try {
    await supabaseAdmin
      .from('customer_segments')
      .delete()
      .eq('id', req.params.id)
      .eq('tenant_id', req.tenantId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/segments/:id/refresh — Recalculate count
router.post('/:id/refresh', async (req, res) => {
  try {
    const { data: seg } = await supabaseAdmin
      .from('customer_segments')
      .select('conditions, match_type')
      .eq('id', req.params.id)
      .eq('tenant_id', req.tenantId)
      .single();

    if (!seg) return res.status(404).json({ error: 'Segment not found' });

    const count = await countSegmentCustomers(req.tenantId, seg.conditions, seg.match_type);

    await supabaseAdmin
      .from('customer_segments')
      .update({ customer_count: count })
      .eq('id', req.params.id);

    res.json({ customer_count: count });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/segments/:id/customers — List matching customers
router.get('/:id/customers', async (req, res) => {
  try {
    const { data: seg } = await supabaseAdmin
      .from('customer_segments')
      .select('conditions, match_type')
      .eq('id', req.params.id)
      .eq('tenant_id', req.tenantId)
      .single();

    if (!seg) return res.status(404).json({ error: 'Segment not found' });

    const customers = await getSegmentCustomers(req.tenantId, seg.conditions, seg.match_type);
    res.json(customers);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Count customers matching segment conditions
 */
async function countSegmentCustomers(tenantId, conditions, matchType) {
  const customers = await getSegmentCustomers(tenantId, conditions, matchType);
  return customers.length;
}

async function getSegmentCustomers(tenantId, conditions, matchType) {
  try {
    // Get all customers for this tenant
    const { data: customers } = await supabaseAdmin
      .from('customers')
      .select('*')
      .eq('tenant_id', tenantId);

    if (!customers) return [];

    // Get order counts and totals
    const { data: orders } = await supabaseAdmin
      .from('orders')
      .select('customer_id, total, created_at, status')
      .eq('tenant_id', tenantId);

    const orderMap = {};
    for (const o of orders || []) {
      if (!orderMap[o.customer_id]) orderMap[o.customer_id] = { count: 0, total: 0, last_at: null };
      orderMap[o.customer_id].count++;
      orderMap[o.customer_id].total += Number(o.total) || 0;
      if (!orderMap[o.customer_id].last_at || o.created_at > orderMap[o.customer_id].last_at) {
        orderMap[o.customer_id].last_at = o.created_at;
      }
    }

    // conditions is an array: [{ field, operator, value }, ...]
    const rules = Array.isArray(conditions) ? conditions : [];
    const isOr = matchType === 'any';

    return customers.filter(c => {
      const orderData = orderMap[c.id] || { count: 0, total: 0, last_at: null };

      const results = rules.map(rule => {
        let fieldValue;
        switch (rule.field) {
          case 'total_spent': fieldValue = orderData.total; break;
          case 'orders_count': fieldValue = orderData.count; break;
          case 'has_phone': fieldValue = !!c.phone; break;
          case 'has_email': fieldValue = !!c.email; break;
          case 'tag': fieldValue = c.tags || []; break;
          case 'channel_type': fieldValue = c.channel_type || ''; break;
          case 'days_since_first_contact': {
            fieldValue = Math.floor((Date.now() - new Date(c.created_at).getTime()) / 86400000);
            break;
          }
          case 'days_since_last_order': {
            if (!orderData.last_at) fieldValue = 9999;
            else fieldValue = Math.floor((Date.now() - new Date(orderData.last_at).getTime()) / 86400000);
            break;
          }
          default: fieldValue = c[rule.field];
        }

        const op = rule.operator;
        const val = rule.value;
        const numVal = Number(val);

        switch (op) {
          case '>': return fieldValue > numVal;
          case '>=': return fieldValue >= numVal;
          case '<': return fieldValue < numVal;
          case '<=': return fieldValue <= numVal;
          case '=': case '==': return fieldValue == val;
          case '!=': return fieldValue != val;
          case 'contains': return Array.isArray(fieldValue) ? fieldValue.includes(val) : String(fieldValue).includes(val);
          case 'is_true': return !!fieldValue;
          case 'is_false': return !fieldValue;
          default: return false;
        }
      });

      return isOr ? results.some(Boolean) : results.every(Boolean);
    });
  } catch (err) {
    console.error('[Segments] getSegmentCustomers error:', err.message);
    return [];
  }
}

module.exports = router;
