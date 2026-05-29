-- Run in Supabase SQL Editor

-- Admin flag on profiles
alter table profiles add column if not exists is_admin boolean default false;

-- Set yourself as admin (replace with your actual user ID)
-- You can find your user ID in Supabase → Authentication → Users
-- UPDATE profiles SET is_admin = true WHERE email = 'your@email.com';

-- View: photographer stats (admin only)
create or replace view photographer_stats as
select
  p.id,
  p.name,
  p.email,
  p.plan,
  p.created_at,
  count(distinct g.id) as gallery_count,
  count(distinct ph.id) as photo_count,
  coalesce(sum(ph.size_bytes), 0) as storage_bytes
from profiles p
left join galleries g on g.photographer_id = p.id
left join photos ph on ph.gallery_id = g.id
group by p.id, p.name, p.email, p.plan, p.created_at;

-- RLS: only admins can see this view
alter view photographer_stats owner to authenticated;

create or replace function is_admin()
returns boolean as $$
  select coalesce(
    (select is_admin from profiles where id = auth.uid()),
    false
  );
$$ language sql security definer;
