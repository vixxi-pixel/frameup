-- Run in Supabase SQL Editor

-- Add logo + watermark settings to profiles
alter table profiles add column if not exists logo_url text default null;
alter table profiles add column if not exists watermark_opacity float default 0.35;
alter table profiles add column if not exists watermark_position text default 'bottom-right';

-- Add watermark toggle per gallery
alter table galleries add column if not exists watermark_enabled boolean default false;
