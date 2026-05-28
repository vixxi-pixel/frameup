-- ============================================================
-- frame.up — Supabase Schema
-- Run this entire file in your Supabase SQL Editor
-- ============================================================

-- Profiles: one per photographer (extends auth.users)
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  name text,
  email text,
  avatar_url text,
  plan text default 'starter',
  created_at timestamptz default now()
);

-- Galleries: each belongs to a photographer
create table galleries (
  id uuid primary key default gen_random_uuid(),
  photographer_id uuid references profiles(id) on delete cascade not null,
  slug text unique not null,
  name text not null,
  client_name text,
  password_hash text,
  expires_at timestamptz,
  cover_url text,
  is_active boolean default true,
  allow_downloads boolean default true,
  allow_favourites boolean default true,
  created_at timestamptz default now()
);

-- Photos: each belongs to a gallery
create table photos (
  id uuid primary key default gen_random_uuid(),
  gallery_id uuid references galleries(id) on delete cascade not null,
  storage_path text not null,
  filename text,
  size_bytes bigint,
  width int,
  height int,
  sort_order int default 0,
  created_at timestamptz default now()
);

-- Favourites: clients mark photos they love
create table favourites (
  id uuid primary key default gen_random_uuid(),
  gallery_id uuid references galleries(id) on delete cascade not null,
  photo_id uuid references photos(id) on delete cascade not null,
  session_token text not null,
  created_at timestamptz default now(),
  unique(photo_id, session_token)
);

-- Gallery views: basic analytics
create table gallery_views (
  id uuid primary key default gen_random_uuid(),
  gallery_id uuid references galleries(id) on delete cascade not null,
  viewed_at timestamptz default now()
);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table profiles enable row level security;
alter table galleries enable row level security;
alter table photos enable row level security;
alter table favourites enable row level security;
alter table gallery_views enable row level security;

-- Profiles: photographers can read/write only their own
create policy "Own profile" on profiles
  for all using (auth.uid() = id);

-- Galleries: photographers manage their own; public can read active ones
create policy "Photographer manages galleries" on galleries
  for all using (auth.uid() = photographer_id);

create policy "Public can view active galleries" on galleries
  for select using (is_active = true);

-- Photos: photographers manage; public can view via active gallery
create policy "Photographer manages photos" on photos
  for all using (
    exists (
      select 1 from galleries g
      where g.id = photos.gallery_id
      and g.photographer_id = auth.uid()
    )
  );

create policy "Public can view photos in active galleries" on photos
  for select using (
    exists (
      select 1 from galleries g
      where g.id = photos.gallery_id
      and g.is_active = true
    )
  );

-- Favourites: anyone can insert/read (anonymous clients use session tokens)
create policy "Anyone can favourite" on favourites
  for all using (true);

-- Views: anyone can insert (for analytics)
create policy "Anyone can log view" on gallery_views
  for insert with check (true);

create policy "Photographer can read views" on gallery_views
  for select using (
    exists (
      select 1 from galleries g
      where g.id = gallery_views.gallery_id
      and g.photographer_id = auth.uid()
    )
  );

-- ============================================================
-- Auto-create profile on signup
-- ============================================================

create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ============================================================
-- Storage bucket for photos
-- Run separately if needed
-- ============================================================

-- In Supabase dashboard: Storage → New bucket
-- Name: "gallery-photos"
-- Public: false (we serve via signed URLs)
