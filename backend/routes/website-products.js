const express = require('express');
const router = express.Router();
const { websiteSupabase, websiteTenantId } = require('../services/websiteSupabase');

/**
 * API tìm sản phẩm từ website DB (scoped by WEBSITE_TENANT_ID)
 */

// GET /api/website-products/test — Debug: kiểm tra kết nối website DB
router.get('/test', async (req, res) => {
  try {
    console.log('=== WEBSITE PRODUCTS TEST ===');
    console.log('WEBSITE_SUPABASE_URL:', process.env.WEBSITE_SUPABASE_URL ? 'CÓ' : 'THIẾU');
    console.log('WEBSITE_SUPABASE_SERVICE_KEY:', process.env.WEBSITE_SUPABASE_SERVICE_KEY ? 'CÓ (' + process.env.WEBSITE_SUPABASE_SERVICE_KEY.length + ' chars)' : 'THIẾU');
    console.log('WEBSITE_TENANT_ID:', websiteTenantId);

    // Query without filtering is_active to see raw data
    const { data, error } = await websiteSupabase
      .from('products')
      .select('*')
      .eq('tenant_id', websiteTenantId)
      .limit(3);

    console.log('Test result:', { data, error });
    if (data && data.length > 0) {
      console.log('Column names:', Object.keys(data[0]));
    }
    res.json({ data, error, columns: data?.[0] ? Object.keys(data[0]) : [] });
  } catch (err) {
    console.error('Test error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/website-products/search — Quick search (autocomplete)
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json([]);

    console.log('[WebsiteProducts] Search query:', q, '| tenant:', websiteTenantId);

    const { data: products, error } = await websiteSupabase
      .from('products')
      .select('id, name, sku, price, stock, image_url, category')
      .eq('tenant_id', websiteTenantId)
      .eq('is_active', true)
      .ilike('name', `%${q}%`)
      .limit(10);

    console.log('[WebsiteProducts] Results:', products?.length || 0, '| Error:', error?.message || 'none');

    if (error) return res.status(500).json({ error: error.message });
    res.json(products || []);
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

    res.json({
      products: products || [],
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
