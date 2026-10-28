-- ====================================================================
-- PriceProof: Complete Database Setup Script
-- Paste this entire file into your Supabase SQL Editor and click RUN
-- ====================================================================

-- 1. Run Schema Migration
\ir migrations/001_initial_schema.sql

-- 2. Run Security & RLS Policies
\ir policies.sql

-- 3. Seed Realistic Indian Grocery Dataset
\ir seed.sql
