const express = require('express');
const router = express.Router();
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const { supabaseAdmin } = require('../config/supabase');

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Multer config: memory storage, 10MB limit
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

// ========================
// MEDIA UPLOAD
// ========================

// POST /api/media/upload — Upload single file to Cloudinary
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const { categoryId, category, tags, description } = req.body;
    const tenantId = req.tenantId;

    // Upload to Cloudinary
    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: `chaton/${tenantId}`,
          resource_type: 'image',
          transformation: [{ quality: 'auto', fetch_format: 'auto' }],
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(req.file.buffer);
    });

    // Thumbnail from Cloudinary
    const thumbnailUrl = cloudinary.url(result.public_id, {
      width: 200, height: 200, crop: 'fill', quality: 'auto',
    });

    // Insert into DB
    const { data: media, error: dbErr } = await supabaseAdmin
      .from('media')
      .insert({
        tenant_id: tenantId,
        category_id: categoryId || null,
        filename: result.public_id,
        original_name: req.file.originalname,
        url: result.secure_url,
        thumbnail_url: thumbnailUrl,
        mime_type: req.file.mimetype,
        size: req.file.size,
        width: result.width,
        height: result.height,
      })
      .select('*')
      .single();

    if (dbErr) {
      console.error('[Media] DB insert error:', dbErr.message);
      return res.status(500).json({ error: 'DB error: ' + dbErr.message });
    }

    res.json(media);
  } catch (err) {
    console.error('[Media] Upload error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/media/upload-multiple — Upload multiple files to Cloudinary
router.post('/upload-multiple', upload.array('files', 10), async (req, res) => {
  const { categoryId, category } = req.body;
  const tenantId = req.tenantId;
  const results = [];

  for (const file of req.files) {
    try {
      const result = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          {
            folder: `chaton/${tenantId}`,
            resource_type: 'image',
            transformation: [{ quality: 'auto' }],
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        ).end(file.buffer);
      });

      const thumbnailUrl = cloudinary.url(result.public_id, {
        width: 200, height: 200, crop: 'fill',
      });

      const { data: media, error: dbErr } = await supabaseAdmin
        .from('media')
        .insert({
          tenant_id: tenantId,
          category_id: categoryId || null,
          filename: result.public_id,
          original_name: file.originalname,
          url: result.secure_url,
          thumbnail_url: thumbnailUrl,
          mime_type: file.mimetype,
          size: file.size,
          width: result.width,
          height: result.height,
        })
        .select('*')
        .single();

      if (dbErr) {
        results.push({ error: dbErr.message, file: file.originalname });
      } else {
        results.push(media);
      }
    } catch (err) {
      results.push({ error: err.message, file: file.originalname });
    }
  }

  res.json(results);
});

// ========================
// MEDIA LIST / DELETE
// ========================

// GET /api/media — List media with pagination, search, category filter
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 24, search, category_id } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = supabaseAdmin
      .from('media')
      .select('*', { count: 'exact' })
      .eq('tenant_id', req.tenantId);

    if (search) {
      query = query.ilike('original_name', `%${search}%`);
    }
    if (category_id) {
      query = query.eq('category_id', category_id);
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + Number(limit) - 1);

    if (error) {
      console.error('[Media] List error:', error.message);
      return res.status(500).json({ error: error.message });
    }

    res.json({
      media: data,
      total: count,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(count / Number(limit)),
    });
  } catch (err) {
    console.error('[Media] GET / error:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/media/:id — Delete media file
router.delete('/:id', async (req, res) => {
  try {
    // Get media record (verify ownership)
    const { data: media, error: findErr } = await supabaseAdmin
      .from('media')
      .select('*')
      .eq('id', req.params.id)
      .eq('tenant_id', req.tenantId)
      .single();

    if (findErr || !media) {
      return res.status(404).json({ error: 'Media not found' });
    }

    // Delete from Cloudinary
    try {
      await cloudinary.uploader.destroy(media.filename);
    } catch (cloudErr) {
      console.error('[Media] Cloudinary delete error:', cloudErr.message);
    }

    // Delete from DB
    const { error: dbErr } = await supabaseAdmin
      .from('media')
      .delete()
      .eq('id', req.params.id);

    if (dbErr) {
      return res.status(500).json({ error: dbErr.message });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[Media] DELETE error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ========================
// CATEGORIES
// ========================

// GET /api/media/categories — List categories for tenant
router.get('/categories', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('media_categories')
      .select('*')
      .eq('tenant_id', req.tenantId)
      .order('name', { ascending: true });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/media/categories — Create category
router.post('/categories', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const { data, error } = await supabaseAdmin
      .from('media_categories')
      .insert({ tenant_id: req.tenantId, name: name.trim() })
      .select('*')
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/media/categories/:id — Delete category
router.delete('/categories/:id', async (req, res) => {
  try {
    const { error } = await supabaseAdmin
      .from('media_categories')
      .delete()
      .eq('id', req.params.id)
      .eq('tenant_id', req.tenantId);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
