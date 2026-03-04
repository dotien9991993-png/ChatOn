-- Sync Messages Schema Migration
-- Run this manually on Supabase SQL Editor

-- 1. Add facebook_mid column to messages (nullable, stores Facebook message ID for dedup)
ALTER TABLE messages ADD COLUMN IF NOT EXISTS facebook_mid TEXT;

-- 2. Unique partial index on facebook_mid (only non-null values) for dedup
CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_facebook_mid
  ON messages (facebook_mid)
  WHERE facebook_mid IS NOT NULL;

-- 3. Make text column nullable (image-only messages from Facebook have no text)
ALTER TABLE messages ALTER COLUMN text DROP NOT NULL;
