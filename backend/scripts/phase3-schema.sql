-- =============================================
-- Phase 3 Schema: Products, Orders, AI Logs
-- Run this in Supabase SQL Editor
-- =============================================

-- 1. Products table
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  sku TEXT,
  category TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  original_price NUMERIC DEFAULT 0,
  stock INT DEFAULT 0,
  description TEXT,
  image_url TEXT,
  variants JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_tenant ON products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_products_search ON products USING gin(to_tsvector('simple', name));

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own tenant products" ON products
  FOR ALL USING (tenant_id IN (
    SELECT tenant_id FROM profiles WHERE id = auth.uid()
  ));

-- 2. Orders table (LOG + TRACKING only, OMS handles fulfillment)
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  order_code TEXT NOT NULL,
  conversation_id UUID REFERENCES conversations(id),
  customer_id UUID REFERENCES customers(id),

  -- Customer info snapshot
  customer_name TEXT,
  customer_phone TEXT,
  customer_address TEXT,

  -- Items
  items JSONB NOT NULL DEFAULT '[]',
  total NUMERIC DEFAULT 0,
  note TEXT,

  -- Source
  source TEXT DEFAULT 'chat',
  channel_type TEXT,
  created_by TEXT DEFAULT 'ai',

  -- Status from OMS (not self-managed)
  status TEXT DEFAULT 'pushed',
  -- 'draft' = created, not pushed yet
  -- 'pushed' = pushed to OMS
  -- 'push_failed' = push failed
  -- OMS webhook statuses: 'confirmed', 'packing', 'shipping', 'delivered', 'cancelled'

  -- OMS sync info
  oms_synced BOOLEAN DEFAULT false,
  oms_order_id TEXT,
  oms_response JSONB,
  oms_pushed_at TIMESTAMPTZ,
  oms_last_status_update TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_tenant ON orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_orders_code ON orders(tenant_id, order_code);
CREATE INDEX IF NOT EXISTS idx_orders_conv ON orders(conversation_id);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own tenant orders" ON orders
  FOR ALL USING (tenant_id IN (
    SELECT tenant_id FROM profiles WHERE id = auth.uid()
  ));

-- 3. AI Logs table
CREATE TABLE IF NOT EXISTS ai_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  conversation_id UUID REFERENCES conversations(id),
  customer_message TEXT,
  ai_response TEXT,
  tools_used TEXT[],
  model TEXT,
  input_tokens INT,
  output_tokens INT,
  cost_usd NUMERIC,
  duration_ms INT,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_logs_tenant ON ai_logs(tenant_id, created_at DESC);

ALTER TABLE ai_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own tenant ai_logs" ON ai_logs
  FOR ALL USING (tenant_id IN (
    SELECT tenant_id FROM profiles WHERE id = auth.uid()
  ));

-- 4. Add ai_enabled to conversations
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS ai_enabled BOOLEAN DEFAULT true;

-- 5. Add slug and quick_replies to tenants
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS quick_replies JSONB DEFAULT '[]';

-- 6. Add address to customers
ALTER TABLE customers ADD COLUMN IF NOT EXISTS address TEXT;

-- 7. Add ai_generated flag to messages
ALTER TABLE messages ADD COLUMN IF NOT EXISTS ai_generated BOOLEAN DEFAULT false;

-- 8. Order code sequence
CREATE SEQUENCE IF NOT EXISTS order_code_seq START 1001;

-- 9. Create storage buckets (run these via Supabase Dashboard > Storage)
-- Bucket: product-images (public)
-- Bucket: chat-media (public)
