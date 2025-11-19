/*
 *   Copyright (c) 2025 
 *   All rights reserved.
 */
-- Migration: Make deadline nullable in raffles table
-- Date: 2025-11-18
-- Reason: Some boutiques (Extra Butter) don't display raffle deadlines

ALTER TABLE raffles 
ALTER COLUMN deadline DROP NOT NULL;
