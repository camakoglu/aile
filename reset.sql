-- ============================================
-- Soyagaci - Database Reset Script
-- ============================================
-- This will DROP ALL tables and policies
-- Run this in Supabase SQL Editor to start fresh
-- WARNING: This deletes ALL your data!
-- ============================================

-- Drop triggers first
DROP TRIGGER IF EXISTS update_members_updated_at ON members;

-- Drop functions
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Drop policies (if they exist)
DROP POLICY IF EXISTS "Public read access for members" ON members;
DROP POLICY IF EXISTS "Public read access for relationships" ON relationships;
DROP POLICY IF EXISTS "Public read access for unions" ON unions;

DROP POLICY IF EXISTS "Authenticated users can insert members" ON members;
DROP POLICY IF EXISTS "Authenticated users can update members" ON members;
DROP POLICY IF EXISTS "Authenticated users can delete members" ON members;

DROP POLICY IF EXISTS "Authenticated users can insert relationships" ON relationships;
DROP POLICY IF EXISTS "Authenticated users can update relationships" ON relationships;
DROP POLICY IF EXISTS "Authenticated users can delete relationships" ON relationships;

DROP POLICY IF EXISTS "Authenticated users can insert unions" ON unions;
DROP POLICY IF EXISTS "Authenticated users can update unions" ON unions;
DROP POLICY IF EXISTS "Authenticated users can delete unions" ON unions;

-- Drop tables (CASCADE will drop all foreign keys)
DROP TABLE IF EXISTS unions CASCADE;
DROP TABLE IF EXISTS relationships CASCADE;
DROP TABLE IF EXISTS members CASCADE;

-- ============================================
-- Reset Complete!
-- ============================================
-- Now you can run setup.sql again from scratch
-- ============================================
