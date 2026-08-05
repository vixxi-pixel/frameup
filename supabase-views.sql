-- Add viewer_token and viewed_at to gallery_views if not already there
alter table gallery_views add column if not exists viewer_token text;
alter table gallery_views add column if not exists viewed_at timestamptz default now();
alter table gallery_views add column if not exists is_photographer boolean default false;

-- Index for faster queries
create index if not exists gallery_views_gallery_id_idx on gallery_views(gallery_id);
create index if not exists gallery_views_viewed_at_idx on gallery_views(viewed_at desc);
