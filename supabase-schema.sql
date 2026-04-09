-- Run this in your Supabase SQL Editor (supabase.com → your project → SQL Editor)

create table if not exists recipes (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  category     text default 'Other',
  prep_time    text default '',
  cook_time    text default '',
  image_url    text default '',
  ingredients  text[] default '{}',
  instructions text[] default '{}',
  source_url   text default '',
  notes        text default '',
  created_at   timestamptz default now()
);

-- Add notes column if table already exists
alter table recipes add column if not exists notes text default '';

-- Enable row level security
alter table recipes enable row level security;

-- Drop old open policies if they exist
drop policy if exists "Anyone can read recipes" on recipes;
drop policy if exists "Anyone can insert recipes" on recipes;
drop policy if exists "Anyone can delete recipes" on recipes;

-- ✅ ANYONE can read/view recipes (public)
create policy "Public can view recipes"
  on recipes for select using (true);

-- 🔒 Only logged-in users can insert
create policy "Authenticated users can insert"
  on recipes for insert
  to authenticated
  with check (true);

-- 🔒 Only logged-in users can update
create policy "Authenticated users can update"
  on recipes for update
  to authenticated
  using (true);

-- 🔒 Only logged-in users can delete
create policy "Authenticated users can delete"
  on recipes for delete
  to authenticated
  using (true);
