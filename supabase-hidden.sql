create table if not exists hidden_photos (
  id uuid primary key default gen_random_uuid(),
  gallery_id uuid references galleries(id) on delete cascade,
  photo_id uuid references photos(id) on delete cascade,
  session_token text not null,
  created_at timestamptz default now(),
  unique(gallery_id, photo_id, session_token)
);

alter table hidden_photos enable row level security;
create policy "hidden_public_read" on hidden_photos for select using (true);
create policy "hidden_public_insert" on hidden_photos for insert with check (true);
create policy "hidden_public_delete" on hidden_photos for delete using (true);

-- Add share_type to share_links if not exists
alter table share_links add column if not exists share_type text default 'favourites';
