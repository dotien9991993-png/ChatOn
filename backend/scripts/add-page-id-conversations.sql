-- ============================================
-- Add page_id to conversations table
-- Allows filtering conversations by Facebook Page
-- Run in Supabase SQL Editor
-- ============================================

ALTER TABLE conversations ADD COLUMN IF NOT EXISTS page_id TEXT;

-- Index for fast filtering
CREATE INDEX IF NOT EXISTS idx_conversations_page_id ON conversations(page_id);

-- Backfill existing conversations: match via customer → channel
-- This updates conversations that have channel='facebook' but no page_id
UPDATE conversations c
SET page_id = ch.page_id
FROM customers cust, channels ch
WHERE c.customer_id = cust.id
  AND ch.tenant_id = c.tenant_id
  AND ch.type = 'facebook'
  AND ch.connected = true
  AND cust.channel_type = 'facebook'
  AND c.page_id IS NULL
  AND c.channel = 'facebook';
