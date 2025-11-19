-- Migration: Add unique constraint to raffles table for upsert conflict resolution
-- Date: 2025-11-18

-- Add unique constraint on store + raffle_url to enable ON CONFLICT upserts
ALTER TABLE raffles 
ADD CONSTRAINT raffles_store_url_unique UNIQUE (store, raffle_url);
