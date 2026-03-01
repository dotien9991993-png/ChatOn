-- ============================================
-- Sale-AI Multi-Tenant Schema for Supabase
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================

-- 1. TENANTS
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT '',
  shop_info JSONB DEFAULT '{}',
  ai_config JSONB DEFAULT '{}',
  oms_config JSONB DEFAULT '{}',
  account_config JSONB DEFAULT '{}',
  products JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. PROFILES (linked to auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  display_name TEXT DEFAULT '',
  role TEXT DEFAULT 'owner' CHECK (role IN ('owner', 'admin', 'agent')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. CHANNELS
CREATE TABLE IF NOT EXISTS channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('facebook', 'zalo', 'instagram', 'tiktok')),
  connected BOOLEAN DEFAULT false,
  connected_at TIMESTAMPTZ,
  page_id TEXT,
  page_name TEXT,
  page_access_token TEXT,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, type)
);

-- 4. CUSTOMERS
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  channel_type TEXT NOT NULL DEFAULT 'facebook',
  external_id TEXT NOT NULL,
  name TEXT DEFAULT 'Khách hàng',
  avatar TEXT,
  phone TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, channel_type, external_id)
);

-- 5. CONVERSATIONS
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  channel TEXT NOT NULL DEFAULT 'facebook',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'spam')),
  last_message TEXT DEFAULT '',
  last_message_at TIMESTAMPTZ DEFAULT now(),
  unread INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. MESSAGES
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender TEXT NOT NULL CHECK (sender IN ('customer', 'agent', 'ai')),
  text TEXT NOT NULL,
  type TEXT DEFAULT 'text',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. FUNCTION: Atomic unread increment
CREATE OR REPLACE FUNCTION increment_unread(conv_id UUID)
RETURNS void AS $$
  UPDATE conversations SET unread = unread + 1 WHERE id = conv_id;
$$ LANGUAGE sql;

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_profiles_tenant ON profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_channels_tenant ON channels(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customers_tenant ON customers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customers_lookup ON customers(tenant_id, channel_type, external_id);
CREATE INDEX IF NOT EXISTS idx_conversations_tenant ON conversations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_conversations_customer ON conversations(customer_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_msg ON conversations(tenant_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at);

-- ============================================
-- TRIGGER: Auto-create tenant + profile on signup
-- ============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_tenant_id UUID;
BEGIN
  -- Create tenant
  INSERT INTO tenants (name)
  VALUES (COALESCE(NEW.raw_user_meta_data->>'shop_name', 'My Shop'))
  RETURNING id INTO new_tenant_id;

  -- Create profile
  INSERT INTO profiles (id, tenant_id, display_name, role)
  VALUES (
    NEW.id,
    new_tenant_id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', 'User'),
    'owner'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- RLS (Row Level Security)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Tenants: users can only see their own tenant
CREATE POLICY "Users can view own tenant" ON tenants
  FOR SELECT USING (
    id IN (SELECT tenant_id FROM profiles WHERE profiles.id = auth.uid())
  );

CREATE POLICY "Users can update own tenant" ON tenants
  FOR UPDATE USING (
    id IN (SELECT tenant_id FROM profiles WHERE profiles.id = auth.uid())
  );

-- Profiles: users can see profiles in their tenant
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM profiles p WHERE p.id = auth.uid())
  );

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (id = auth.uid());

-- Channels: tenant isolation
CREATE POLICY "Tenant isolation for channels" ON channels
  FOR ALL USING (
    tenant_id IN (SELECT tenant_id FROM profiles WHERE profiles.id = auth.uid())
  );

-- Customers: tenant isolation
CREATE POLICY "Tenant isolation for customers" ON customers
  FOR ALL USING (
    tenant_id IN (SELECT tenant_id FROM profiles WHERE profiles.id = auth.uid())
  );

-- Conversations: tenant isolation
CREATE POLICY "Tenant isolation for conversations" ON conversations
  FOR ALL USING (
    tenant_id IN (SELECT tenant_id FROM profiles WHERE profiles.id = auth.uid())
  );

-- Messages: users can see messages in their tenant's conversations
CREATE POLICY "Tenant isolation for messages" ON messages
  FOR ALL USING (
    conversation_id IN (
      SELECT id FROM conversations
      WHERE tenant_id IN (SELECT tenant_id FROM profiles WHERE profiles.id = auth.uid())
    )
  );

-- ============================================
-- SERVICE ROLE bypass (for backend server)
-- The service_role key bypasses RLS automatically
-- ============================================

-- Enable realtime for messages (optional)
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;

-- ============================================
-- Phase 1 Features: Livechat + Widget
-- ============================================

-- Livechat visitors table
CREATE TABLE IF NOT EXISTS livechat_visitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  visitor_id TEXT NOT NULL,
  name TEXT, email TEXT, phone TEXT,
  ip_address TEXT, user_agent TEXT, page_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, visitor_id)
);
CREATE INDEX IF NOT EXISTS idx_lc_visitors_tenant ON livechat_visitors(tenant_id);
ALTER TABLE livechat_visitors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_lc_visitors" ON livechat_visitors
  FOR ALL USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- Widget config on channels
ALTER TABLE channels ADD COLUMN IF NOT EXISTS widget_config JSONB DEFAULT '{}';

-- ============================================
-- Phase 2 Features: Chatbot Rules, Drip, Segments, Remarketing
-- ============================================

-- 2A: Chatbot Rules (rule-based auto-reply)
CREATE TABLE IF NOT EXISTS chatbot_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  trigger_type TEXT DEFAULT 'keyword',
  keywords TEXT[] DEFAULT '{}',
  match_type TEXT DEFAULT 'contains' CHECK (match_type IN ('contains', 'exact', 'starts_with')),
  response_text TEXT NOT NULL,
  response_buttons JSONB DEFAULT '[]',
  response_image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_chatbot_rules_tenant ON chatbot_rules(tenant_id);
ALTER TABLE chatbot_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_chatbot_rules" ON chatbot_rules
  FOR ALL USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- 2C: Drip Campaigns
CREATE TABLE IF NOT EXISTS drip_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  trigger_event TEXT DEFAULT 'order_created',
  steps JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_drip_campaigns_tenant ON drip_campaigns(tenant_id);
ALTER TABLE drip_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_drip_campaigns" ON drip_campaigns
  FOR ALL USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- Drip Enrollments (tracks customer progress through campaign)
CREATE TABLE IF NOT EXISTS drip_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drip_campaign_id UUID REFERENCES drip_campaigns(id) ON DELETE CASCADE NOT NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  current_step INTEGER DEFAULT 0,
  next_send_at TIMESTAMPTZ,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_drip_enrollments_next ON drip_enrollments(next_send_at) WHERE status = 'active';
ALTER TABLE drip_enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_drip_enrollments" ON drip_enrollments
  FOR ALL USING (
    drip_campaign_id IN (SELECT id FROM drip_campaigns WHERE tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()))
  );

-- 2E: Customer Segments
CREATE TABLE IF NOT EXISTS customer_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  conditions JSONB DEFAULT '[]',
  match_type TEXT DEFAULT 'all' CHECK (match_type IN ('all', 'any')),
  customer_count INTEGER DEFAULT 0,
  last_refreshed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_segments_tenant ON customer_segments(tenant_id);
ALTER TABLE customer_segments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_segments" ON customer_segments
  FOR ALL USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- 2D: Add metadata to conversations for remarketing
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- 2B: Add recurring_token to customers for recurring notifications
ALTER TABLE customers ADD COLUMN IF NOT EXISTS recurring_token TEXT;

-- AI logs table (if not exists from Phase 1)
CREATE TABLE IF NOT EXISTS ai_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  customer_message TEXT,
  ai_response TEXT,
  error TEXT,
  tools_used TEXT[],
  model TEXT,
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  duration_ms INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_logs_tenant ON ai_logs(tenant_id, created_at DESC);
