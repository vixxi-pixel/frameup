-- Run this in Supabase SQL Editor to add sections support

-- Add section column to photos table
alter table photos add column if not exists section text default null;

-- Index for fast section filtering
create index if not exists photos_section_idx on photos(gallery_id, section);
