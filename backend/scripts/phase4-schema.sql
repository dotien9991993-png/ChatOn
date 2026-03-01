-- ============================================================
-- Phase 4: CRM, Dashboard, Team Management
-- Run in Supabase SQL Editor
-- ============================================================

-- 1. Add CRM columns to customers
ALTER TABLE customers ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS total_orders integer DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS total_spent numeric(12,0) DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS last_order_at timestamptz;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS source text DEFAULT 'facebook';

-- 2. Add assigned_to column to conversations
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES profiles(id);

-- 3. Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_conversations_assigned_to ON conversations(assigned_to);
CREATE INDEX IF NOT EXISTS idx_conversations_tenant_status ON conversations(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_customers_tenant_tags ON customers USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_customers_tenant_name ON customers(tenant_id, name);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON messages(conversation_id, created_at);

-- 4. Add online_at to profiles for agent online tracking
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS online_at timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url text;

-- Done!
SELECT 'Phase 4 schema applied successfully' AS status;
