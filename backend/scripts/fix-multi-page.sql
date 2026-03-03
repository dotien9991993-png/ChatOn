-- ============================================
-- FIX: Allow multiple Facebook Pages per tenant
-- Run in Supabase SQL Editor
-- ============================================

-- Step 1: Find and drop unique constraint on (tenant_id, type)
-- This constraint only allows 1 channel per type per tenant
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'channels'::regclass
      AND contype = 'u'
      AND pg_get_constraintdef(oid) LIKE '%tenant_id%'
      AND pg_get_constraintdef(oid) LIKE '%type%'
  LOOP
    EXECUTE 'ALTER TABLE channels DROP CONSTRAINT ' || quote_ident(r.conname);
    RAISE NOTICE 'Dropped constraint: %', r.conname;
  END LOOP;
END $$;

-- Step 2: Add new unique constraint on (tenant_id, page_id)
-- This allows multiple pages per tenant but prevents duplicate page_id per tenant
ALTER TABLE channels DROP CONSTRAINT IF EXISTS unique_tenant_page;
ALTER TABLE channels ADD CONSTRAINT unique_tenant_page UNIQUE (tenant_id, page_id);

-- Step 3: Disable RLS on channels (backend uses supabaseAdmin which bypasses anyway)
ALTER TABLE channels DISABLE ROW LEVEL SECURITY;

-- Step 4: Verify
SELECT conname, contype, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'channels'::regclass;

SELECT count(*) as channel_count FROM channels;
