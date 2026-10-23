-- Migration: add stream_url + live_enabled to ads table
-- Date: 2026-10-23
-- Purpose: Live Ad feature — brands with TV studios get a watch link on their ad card

ALTER TABLE ads
  ADD COLUMN IF NOT EXISTS stream_url   text    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS live_enabled boolean DEFAULT false;

-- Index for fast lookup of live-enabled ads
CREATE INDEX IF NOT EXISTS idx_ads_live_enabled ON ads (live_enabled) WHERE live_enabled = true;

COMMENT ON COLUMN ads.stream_url   IS 'Watch URL for live stream — auto-set when TV studio created';
COMMENT ON COLUMN ads.live_enabled IS 'Admin flag — unlocks Go Live button for this brand';
