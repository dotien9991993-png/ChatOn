const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');

/**
 * API quản lý sản phẩm (multi-tenant via req.tenantId)
 */

// GET /api/products — Danh sách sản phẩm
router.get('/', async (req, res) => {
  try {
    const { search, category, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = supabaseAdmin
      .from('products')
      .select('*', { count: 'exact' })
      .eq('tenant_id', req.tenantId)
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
    console.error('[Products] GET / error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/products/search — Quick search (autocomplete)
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json([]);

    const { data: products } = await supabaseAdmin
      .from('products')
      .select('id, name, sku, price, stock, image_url, category')
      .eq('tenant_id', req.tenantId)
      .eq('is_active', true)
      .ilike('name', `%${q}%`)
      .limit(10);

    res.json(products || []);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/products/categories — Danh sách danh mục
router.get('/categories', async (req, res) => {
  try {
    const { data: products } = await supabaseAdmin
      .from('products')
      .select('category')
      .eq('tenant_id', req.tenantId)
      .not('category', 'is', null);

    const categories = [...new Set((products || []).map((p) => p.category).filter(Boolean))];
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/products — Thêm sản phẩm mới
router.post('/', async (req, res) => {
  try {
    const { name, sku, category, price, original_price, stock, description, image_url, variants } = req.body;

    if (!name) return res.status(400).json({ error: 'Tên sản phẩm là bắt buộc' });

    const { data: product, error } = await supabaseAdmin
      .from('products')
      .insert({
        tenant_id: req.tenantId,
        name,
        sku: sku || null,
        category: category || null,
        price: price || 0,
        original_price: original_price || 0,
        stock: stock || 0,
        description: description || null,
        image_url: image_url || null,
        variants: variants || [],
        is_active: true,
      })
      .select('*')
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json(product);
  } catch (err) {
    console.error('[Products] POST / error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/products/:id — Cập nhật sản phẩm
router.put('/:id', async (req, res) => {
  try {
    const { name, sku, category, price, original_price, stock, description, image_url, variants, is_active } = req.body;

    const updates = { updated_at: new Date().toISOString() };
    if (name !== undefined) updates.name = name;
    if (sku !== undefined) updates.sku = sku;
    if (category !== undefined) updates.category = category;
    if (price !== undefined) updates.price = price;
    if (original_price !== undefined) updates.original_price = original_price;
    if (stock !== undefined) updates.stock = stock;
    if (description !== undefined) updates.description = description;
    if (image_url !== undefined) updates.image_url = image_url;
    if (variants !== undefined) updates.variants = variants;
    if (is_active !== undefined) updates.is_active = is_active;

    const { data: product, error } = await supabaseAdmin
      .from('products')
      .update(updates)
      .eq('id', req.params.id)
      .eq('tenant_id', req.tenantId)
      .select('*')
      .single();

    if (error) return res.status(500).json({ error: error.message });
    if (!product) return res.status(404).json({ error: 'Không tìm thấy sản phẩm' });

    res.json(product);
  } catch (err) {
    console.error('[Products] PUT /:id error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/products/:id — Xóa sản phẩm
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabaseAdmin
      .from('products')
      .delete()
      .eq('id', req.params.id)
      .eq('tenant_id', req.tenantId);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  } catch (err) {
    console.error('[Products] DELETE /:id error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/products/import — Import từ JSON array
router.post('/import', async (req, res) => {
  try {
    const { products } = req.body;
    if (!Array.isArray(products)) return res.status(400).json({ error: 'products phải là mảng' });

    const rows = products.map((p) => ({
      tenant_id: req.tenantId,
      name: p.name,
      sku: p.sku || null,
      category: p.category || null,
      price: p.price || 0,
      original_price: p.original_price || 0,
      stock: p.stock || 0,
      description: p.description || null,
      image_url: p.image_url || null,
      is_active: true,
    }));

    const { data, error } = await supabaseAdmin
      .from('products')
      .insert(rows)
      .select('*');

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, count: data.length });
  } catch (err) {
    console.error('[Products] POST /import error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
