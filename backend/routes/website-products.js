const express = require('express');
const router = express.Router();
const { websiteSupabase, websiteTenantId } = require('../services/websiteSupabase');

/**
 * API tìm sản phẩm từ website DB (scoped by WEBSITE_TENANT_ID)
 */

// GET /api/website-products/search — Quick search (autocomplete)
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json([]);

    const { data: products, error } = await websiteSupabase
      .from('products')
      .select('id, name, sku, sell_price, stock_quantity, image_url, category')
      .eq('tenant_id', websiteTenantId)
      .eq('is_active', true)
      .ilike('name', `%${q}%`)
      .limit(10);

    if (error) return res.status(500).json({ error: error.message });

    // Map to frontend expected format
    const mapped = (products || []).map((p) => ({
      ...p,
      price: p.sell_price,
      stock: p.stock_quantity,
    }));
    res.json(mapped);
  } catch (err) {
    console.error('[WebsiteProducts] search error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/website-products — Danh sách sản phẩm
router.get('/', async (req, res) => {
  try {
    const { search, category, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = websiteSupabase
      .from('products')
      .select('*', { count: 'exact' })
      .eq('tenant_id', websiteTenantId)
      .order('created_at', { ascending: false });

    if (search) {
      query = query.ilike('name', `%${search}%`);
    }
    if (category) {
      query = query.eq('category', category);
    }

    query = query.range(offset, offset + parseInt(limit) - 1);

    const { data: products, error, count } = await query;

    if (error) return res.status(500).json({ error: error.message });

    // Map column names to frontend format
    const mapped = (products || []).map((p) => ({
      ...p,
      price: p.sell_price,
      stock: p.stock_quantity,
    }));

    res.json({
      products: mapped,
      total: count || 0,
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (err) {
    console.error('[WebsiteProducts] GET / error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
