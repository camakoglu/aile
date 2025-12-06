-- ============================================
-- Supabase Storage Setup for Photos
-- ============================================
-- Run this in Supabase SQL Editor AFTER running setup.sql
-- This creates a storage bucket for family photos
-- ============================================

-- Create storage bucket for family photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('family-photos', 'family-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to photos
CREATE POLICY "Public read access for photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'family-photos');

-- Allow authenticated users to upload photos
CREATE POLICY "Authenticated users can upload photos"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'family-photos'
    AND auth.role() = 'authenticated'
);

-- Allow authenticated users to update their uploads
CREATE POLICY "Authenticated users can update photos"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'family-photos'
    AND auth.role() = 'authenticated'
);

-- Allow authenticated users to delete photos
CREATE POLICY "Authenticated users can delete photos"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'family-photos'
    AND auth.role() = 'authenticated'
);

-- ============================================
-- Storage Setup Complete!
-- ============================================
-- Photos will be accessible at:
-- https://YOUR-PROJECT.supabase.co/storage/v1/object/public/family-photos/FILENAME
-- ============================================
