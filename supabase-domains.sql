-- Run this in Supabase SQL Editor

-- Add custom domain to profiles
alter table profiles add column if not exists custom_domain text default null;
alter table profiles add column if not exists domain_verified boolean default false;

-- Index for fast domain lookup
create unique index if not exists profiles_custom_domain_idx on profiles(custom_domain) where custom_domain is not null;
