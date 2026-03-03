-- ============================================
-- Add page_id to conversations table
-- Allows filtering conversations by Facebook Page
-- Run in Supabase SQL Editor
-- ============================================

-- Step 1: Add column
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS page_id TEXT;
CREATE INDEX IF NOT EXISTS idx_conversations_page_id ON conversations(page_id);

-- Step 2: Backfill — for tenants with ONLY 1 Facebook channel, assign that page_id
UPDATE conversations c
SET page_id = ch.page_id
FROM (
  SELECT tenant_id, page_id
  FROM channels
  WHERE type = 'facebook' AND connected = true
) ch
WHERE c.tenant_id = ch.tenant_id
  AND c.channel = 'facebook'
  AND c.page_id IS NULL;

-- Step 3: For any remaining NULL page_id (multi-page tenants), assign first channel
UPDATE conversations c
SET page_id = sub.page_id
FROM (
  SELECT DISTINCT ON (tenant_id) tenant_id, page_id
  FROM channels
  WHERE type = 'facebook' AND connected = true
  ORDER BY tenant_id, connected_at ASC
) sub
WHERE c.tenant_id = sub.tenant_id
  AND c.channel = 'facebook'
  AND c.page_id IS NULL;

-- Verify
SELECT page_id, count(*) FROM conversations WHERE channel = 'facebook' GROUP BY page_id;
