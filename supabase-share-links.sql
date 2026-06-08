create table if not exists share_links (
  id uuid primary key default gen_random_uuid(),
  gallery_id uuid references galleries(id) on delete cascade,
  session_token text not null,
  slug text unique not null,
  created_at timestamptz default now()
);

-- Anyone can read share links (needed for public share page)
alter table share_links enable row level security;
create policy "share_links_public_read" on share_links for select using (true);
create policy "share_links_public_insert" on share_links for insert with check (true);
