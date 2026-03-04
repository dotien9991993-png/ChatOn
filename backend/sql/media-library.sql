-- ============================================
-- Media Library - Chạy trong Supabase SQL Editor
-- ============================================

-- 1. Bảng danh mục (tạo TRƯỚC vì media tham chiếu tới)
CREATE TABLE IF NOT EXISTS media_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Bảng media
CREATE TABLE IF NOT EXISTS media (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  original_name TEXT,
  url TEXT NOT NULL,
  mime_type TEXT DEFAULT 'image/jpeg',
  size INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Thêm các cột còn thiếu vào media (nếu bảng đã tồn tại từ trước)
ALTER TABLE media ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES media_categories(id) ON DELETE SET NULL;
ALTER TABLE media ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
ALTER TABLE media ADD COLUMN IF NOT EXISTS width INTEGER;
ALTER TABLE media ADD COLUMN IF NOT EXISTS height INTEGER;

-- 4. Thêm cột media_url vào messages
ALTER TABLE messages ADD COLUMN IF NOT EXISTS media_url TEXT;

-- 5. Index
CREATE INDEX IF NOT EXISTS idx_media_tenant ON media(tenant_id);
CREATE INDEX IF NOT EXISTS idx_media_category ON media(category_id);
CREATE INDEX IF NOT EXISTS idx_media_categories_tenant ON media_categories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_media_created ON media(tenant_id, created_at DESC);
