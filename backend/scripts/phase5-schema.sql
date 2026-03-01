-- ============================================================
-- Phase 5: Comments, Campaigns, Livestream
-- Run in Supabase SQL Editor
-- ============================================================

-- 1. Comments table
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
  post_id TEXT NOT NULL,
  post_content TEXT,
  post_url TEXT,
  comment_id TEXT NOT NULL UNIQUE,
  parent_comment_id TEXT,
  user_id TEXT NOT NULL,
  user_name TEXT,
  user_avatar TEXT,
  message TEXT,
  media_url TEXT,
  is_hidden BOOLEAN DEFAULT false,
  is_replied BOOLEAN DEFAULT false,
  reply_sent TEXT,
  has_phone BOOLEAN DEFAULT false,
  extracted_phone TEXT,
  auto_replied BOOLEAN DEFAULT false,
  auto_hidden BOOLEAN DEFAULT false,
  auto_inbox_sent BOOLEAN DEFAULT false,
  created_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_tenant ON comments(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(tenant_id, post_id);
CREATE INDEX IF NOT EXISTS idx_comments_fb ON comments(comment_id);

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users see own tenant comments" ON comments
    FOR ALL USING (tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Campaigns table
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  target_type TEXT DEFAULT 'all' CHECK (target_type IN ('all', 'tag', 'channel', 'custom')),
  target_tags TEXT[],
  target_channel TEXT,
  target_customer_ids UUID[],
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'template')),
  message_text TEXT NOT NULL,
  message_image_url TEXT,
  message_buttons JSONB DEFAULT '[]',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'failed', 'cancelled')),
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  total_recipients INT DEFAULT 0,
  sent_count INT DEFAULT 0,
  delivered_count INT DEFAULT 0,
  failed_count INT DEFAULT 0,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaigns_tenant ON campaigns(tenant_id, created_at DESC);

ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users see own tenant campaigns" ON campaigns
    FOR ALL USING (tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3. Campaign logs
CREATE TABLE IF NOT EXISTS campaign_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,
  customer_id UUID REFERENCES customers(id),
  platform_user_id TEXT,
  channel_type TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed')),
  error TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaign_logs_campaign ON campaign_logs(campaign_id);

ALTER TABLE campaign_logs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users see own tenant campaign_logs" ON campaign_logs
    FOR ALL USING (campaign_id IN (
      SELECT id FROM campaigns WHERE tenant_id IN (
        SELECT tenant_id FROM profiles WHERE id = auth.uid()
      )
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 4. Livestreams table
CREATE TABLE IF NOT EXISTS livestreams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  channel_id UUID REFERENCES channels(id),
  fb_video_id TEXT,
  title TEXT,
  status TEXT DEFAULT 'live' CHECK (status IN ('live', 'ended')),
  order_syntax JSONB DEFAULT '[]',
  total_comments INT DEFAULT 0,
  total_orders INT DEFAULT 0,
  total_revenue NUMERIC DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_livestreams_tenant ON livestreams(tenant_id);

ALTER TABLE livestreams ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users see own tenant livestreams" ON livestreams
    FOR ALL USING (tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 5. Livestream comments
CREATE TABLE IF NOT EXISTS livestream_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  livestream_id UUID REFERENCES livestreams(id) ON DELETE CASCADE NOT NULL,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  comment_id TEXT,
  user_id TEXT,
  user_name TEXT,
  message TEXT,
  is_order BOOLEAN DEFAULT false,
  matched_keyword TEXT,
  matched_product_name TEXT,
  quantity INT DEFAULT 1,
  order_id UUID REFERENCES orders(id),
  created_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ls_comments_ls ON livestream_comments(livestream_id, created_at DESC);

ALTER TABLE livestream_comments ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users see own tenant ls_comments" ON livestream_comments
    FOR ALL USING (tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 6. Add comment_settings to tenants
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS comment_settings JSONB DEFAULT '{
  "auto_hide_phone": true,
  "auto_hide_keywords": [],
  "auto_reply_enabled": false,
  "auto_reply_message": "Shop da inbox cho anh/chi a!",
  "auto_inbox_enabled": false,
  "auto_inbox_message": "Chao anh/chi! De em tu van chi tiet a"
}';

SELECT 'Phase 5 schema applied successfully' AS status;
