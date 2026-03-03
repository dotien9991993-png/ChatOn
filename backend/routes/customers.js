const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');
const fbService = require('../services/facebook');

/**
 * API quản lý khách hàng CRM (multi-tenant via req.tenantId)
 */

// GET /api/customers — Danh sách khách hàng (search, filter, pagination)
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, search, tag, source, sort = 'last_message', order = 'desc' } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = supabaseAdmin
      .from('customers')
      .select('*, conversations!inner(id, last_message, last_message_at, status, channel, unread, ai_enabled)', { count: 'exact' })
      .eq('conversations.tenant_id', req.tenantId);

    // Search by name/phone
    if (search) {
      query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%,external_id.ilike.%${search}%`);
    }

    // Filter by tag
    if (tag) {
      query = query.contains('tags', [tag]);
    }

    // Filter by source
    if (source) {
      query = query.eq('source', source);
    }

    // Sorting
    const sortMap = {
      last_message: 'conversations.last_message_at',
      name: 'name',
      total_orders: 'total_orders',
      total_spent: 'total_spent',
      created: 'created_at',
    };

    // Execute query with pagination
    const { data, error, count } = await query
      .range(offset, offset + Number(limit) - 1)
      .order('created_at', { ascending: order === 'asc' });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    // Map to frontend shape
    const customers = (data || []).map((c) => {
      const conv = Array.isArray(c.conversations) ? c.conversations[0] : c.conversations;
      return {
        id: c.id,
        name: c.name || 'Khách hàng',
        avatar: c.avatar || null,
        phone: c.phone || '',
        address: c.address || '',
        notes: c.notes || '',
        tags: c.tags || [],
        totalOrders: c.total_orders || 0,
        totalSpent: c.total_spent || 0,
        lastOrderAt: c.last_order_at,
        source: c.source || 'facebook',
        externalId: c.external_id,
        createdAt: c.created_at,
        // From conversation
        conversationId: conv?.id,
        lastMessage: conv?.last_message || '',
        lastMessageAt: conv?.last_message_at,
        conversationStatus: conv?.status,
        channel: conv?.channel || 'facebook',
      };
    });

    // Sort in-memory for joined fields
    if (sort === 'last_message') {
      customers.sort((a, b) => {
        const da = new Date(a.lastMessageAt || 0);
        const db = new Date(b.lastMessageAt || 0);
        return order === 'desc' ? db - da : da - db;
      });
    } else if (sort === 'total_orders') {
      customers.sort((a, b) => order === 'desc' ? b.totalOrders - a.totalOrders : a.totalOrders - b.totalOrders);
    } else if (sort === 'total_spent') {
      customers.sort((a, b) => order === 'desc' ? b.totalSpent - a.totalSpent : a.totalSpent - b.totalSpent);
    }

    res.json({
      customers,
      total: count || 0,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil((count || 0) / Number(limit)),
    });
  } catch (err) {
    console.error('[Customers] GET / error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/customers/tags — Tất cả tags duy nhất
router.get('/tags', async (req, res) => {
  try {
    const { data } = await supabaseAdmin
      .from('customers')
      .select('tags, conversations!inner(tenant_id)')
      .eq('conversations.tenant_id', req.tenantId);

    const tagSet = new Set();
    for (const row of data || []) {
      for (const t of row.tags || []) tagSet.add(t);
    }
    res.json([...tagSet].sort());
  } catch (err) {
    console.error('[Customers] GET /tags error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/customers/:id — Chi tiết khách hàng
router.get('/:id', async (req, res) => {
  try {
    const { data: customer, error } = await supabaseAdmin
      .from('customers')
      .select('*, conversations!inner(id, last_message, last_message_at, status, channel, tenant_id)')
      .eq('id', req.params.id)
      .eq('conversations.tenant_id', req.tenantId)
      .single();

    if (error || !customer) {
      return res.status(404).json({ error: 'Không tìm thấy khách hàng' });
    }

    // Get orders for this customer
    const conv = Array.isArray(customer.conversations) ? customer.conversations[0] : customer.conversations;

    const { data: orders } = await supabaseAdmin
      .from('orders')
      .select('id, order_code, status, total, created_at')
      .eq('conversation_id', conv?.id)
      .order('created_at', { ascending: false })
      .limit(10);

    res.json({
      id: customer.id,
      name: customer.name || 'Khách hàng',
      avatar: customer.avatar || null,
      phone: customer.phone || '',
      address: customer.address || '',
      notes: customer.notes || '',
      tags: customer.tags || [],
      totalOrders: customer.total_orders || 0,
      totalSpent: customer.total_spent || 0,
      lastOrderAt: customer.last_order_at,
      source: customer.source || 'facebook',
      externalId: customer.external_id,
      createdAt: customer.created_at,
      conversationId: conv?.id,
      channel: conv?.channel || 'facebook',
      orders: orders || [],
    });
  } catch (err) {
    console.error('[Customers] GET /:id error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/customers/:id — Cập nhật khách hàng
router.put('/:id', async (req, res) => {
  try {
    const { name, phone, address, notes, tags } = req.body;

    // Verify this customer belongs to tenant
    const { data: check } = await supabaseAdmin
      .from('customers')
      .select('id, conversations!inner(tenant_id)')
      .eq('id', req.params.id)
      .eq('conversations.tenant_id', req.tenantId)
      .single();

    if (!check) {
      return res.status(404).json({ error: 'Không tìm thấy khách hàng' });
    }

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (phone !== undefined) updates.phone = phone;
    if (address !== undefined) updates.address = address;
    if (notes !== undefined) updates.notes = notes;
    if (tags !== undefined) updates.tags = tags;

    const { error } = await supabaseAdmin
      .from('customers')
      .update(updates)
      .eq('id', req.params.id);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  } catch (err) {
    console.error('[Customers] PUT /:id error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/customers/bulk-tag — Gắn tag hàng loạt
router.post('/bulk-tag', async (req, res) => {
  try {
    const { customerIds, tags, action = 'add' } = req.body;

    if (!Array.isArray(customerIds) || !Array.isArray(tags)) {
      return res.status(400).json({ error: 'customerIds và tags phải là mảng' });
    }

    for (const id of customerIds) {
      const { data: cust } = await supabaseAdmin
        .from('customers')
        .select('tags')
        .eq('id', id)
        .single();

      if (!cust) continue;

      let newTags;
      if (action === 'add') {
        newTags = [...new Set([...(cust.tags || []), ...tags])];
      } else {
        newTags = (cust.tags || []).filter((t) => !tags.includes(t));
      }

      await supabaseAdmin
        .from('customers')
        .update({ tags: newTags })
        .eq('id', id);
    }

    res.json({ success: true, count: customerIds.length });
  } catch (err) {
    console.error('[Customers] POST /bulk-tag error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/customers/merge — Gộp khách hàng trùng
router.post('/merge', async (req, res) => {
  try {
    const { primaryId, mergeIds } = req.body;

    if (!primaryId || !Array.isArray(mergeIds) || mergeIds.length === 0) {
      return res.status(400).json({ error: 'Cần primaryId và mergeIds' });
    }

    // Get primary customer
    const { data: primary } = await supabaseAdmin
      .from('customers')
      .select('*')
      .eq('id', primaryId)
      .single();

    if (!primary) {
      return res.status(404).json({ error: 'Không tìm thấy khách hàng chính' });
    }

    // Move conversations from merged customers to primary
    for (const mergeId of mergeIds) {
      await supabaseAdmin
        .from('conversations')
        .update({ customer_id: primaryId })
        .eq('customer_id', mergeId);

      // Delete merged customer
      await supabaseAdmin
        .from('customers')
        .delete()
        .eq('id', mergeId);
    }

    res.json({ success: true, mergedCount: mergeIds.length });
  } catch (err) {
    console.error('[Customers] POST /merge error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/customers/export — Export CSV
router.get('/export/csv', async (req, res) => {
  try {
    const { data } = await supabaseAdmin
      .from('customers')
      .select('*, conversations!inner(tenant_id, channel)')
      .eq('conversations.tenant_id', req.tenantId)
      .order('created_at', { ascending: false });

    const rows = [['Tên', 'SĐT', 'Địa chỉ', 'Kênh', 'Tags', 'Tổng đơn', 'Tổng chi', 'Ghi chú', 'Ngày tạo']];
    for (const c of data || []) {
      const conv = Array.isArray(c.conversations) ? c.conversations[0] : c.conversations;
      rows.push([
        c.name || '',
        c.phone || '',
        c.address || '',
        conv?.channel || '',
        (c.tags || []).join(', '),
        c.total_orders || 0,
        c.total_spent || 0,
        c.notes || '',
        c.created_at ? new Date(c.created_at).toLocaleDateString('vi-VN') : '',
      ]);
    }

    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=customers.csv');
    res.send('\uFEFF' + csv); // BOM for Excel UTF-8
  } catch (err) {
    console.error('[Customers] GET /export/csv error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/customers/update-names — Backfill Facebook profile names for customers with default name
router.post('/update-names', async (req, res) => {
  try {
    // Find all Facebook customers with missing/default names for this tenant
    const { data: customers, error } = await supabaseAdmin
      .from('customers')
      .select('id, external_id, tenant_id, name, avatar')
      .eq('tenant_id', req.tenantId)
      .eq('channel_type', 'facebook')
      .or('name.is.null,name.eq.Khách hàng');

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (!customers || customers.length === 0) {
      return res.json({ updated: 0, message: 'Không có khách hàng cần cập nhật' });
    }

    // Get Facebook channel token for this tenant
    const token = await fbService.getChannelToken(req.tenantId);
    if (!token) {
      return res.status(400).json({ error: 'Chưa kết nối Facebook Page' });
    }

    const results = [];
    for (const c of customers) {
      try {
        const profile = await fbService.getUserProfile(c.external_id, token);
        if (profile.name) {
          await supabaseAdmin
            .from('customers')
            .update({ name: profile.name, avatar: profile.avatar || c.avatar })
            .eq('id', c.id);
          results.push({ id: c.id, name: profile.name });
        }
      } catch (err) {
        console.error(`[Customers] Failed to update name for ${c.id}:`, err.message);
      }
    }

    console.log(`[Customers] Backfilled ${results.length}/${customers.length} customer names`);
    res.json({ updated: results.length, total: customers.length, results });
  } catch (err) {
    console.error('[Customers] POST /update-names error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
