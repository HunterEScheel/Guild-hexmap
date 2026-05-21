-- Hexmap Supabase Schema
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor)

-- Hexes table
create table where not exists hexes (
  col integer not null,
  row integer not null,
  terrain text not null default 'unknown',
  created_at timestamptz default now(),
  primary key (col, row)
);

-- Migration: Add challenge_tier to hexes
-- alter table hexes add column challenge_tier integer;

-- Bestiary table (curated terrain assignments for SRD monsters)
create table if not exists bestiary (
  index text primary key,
  name text not null,
  type text not null default '',
  size text not null default '',
  cr numeric not null default 0,
  xp integer not null default 0,
  hp integer not null default 0,
  ac integer not null default 10,
  terrains text[] not null default '{}'
);

alter table bestiary enable row level security;

create policy "Allow all access to bestiary" on bestiary
  for all using (true) with check (true);

-- Shop inventory (current stock with quantities)
create table if not exists shop_inventory (
  id uuid default gen_random_uuid() primary key,
  item_index text not null,
  item_name text not null,
  rarity text not null default 'common',
  description text not null default '',
  quantity integer not null default 1,
  price text not null default '',
  created_at timestamptz default now()
);

alter table shop_inventory enable row level security;
create policy "Allow all access to shop_inventory" on shop_inventory
  for all using (true) with check (true);

-- Restock rules (admin-configured per-item dice restocking)
create table if not exists shop_restock_rules (
  id uuid default gen_random_uuid() primary key,
  item_index text not null unique,
  item_name text not null,
  rarity text not null default 'common',
  dice text not null default '1d4',
  price text not null default '',
  enabled boolean not null default true,
  created_at timestamptz default now()
);

alter table shop_restock_rules enable row level security;
create policy "Allow all access to shop_restock_rules" on shop_restock_rules
  for all using (true) with check (true);

-- Restock settings (rarity counts)
create table if not exists shop_restock_settings (
  rarity text primary key,
  count integer not null default 0
);

alter table shop_restock_settings enable row level security;
create policy "Allow all access to shop_restock_settings" on shop_restock_settings
  for all using (true) with check (true);

-- Default restock settings
insert into shop_restock_settings (rarity, count) values
  ('common', 100),
  ('uncommon', 15),
  ('rare', 4),
  ('very rare', 0),
  ('legendary', 0)
on conflict (rarity) do nothing;

-- Migration: Add scheduled_date to quests
-- alter table quests add column scheduled_date date;

-- Migration: Add end hex to quests
-- alter table quests add column end_hex_col integer;
-- alter table quests add column end_hex_row integer;

-- Quests table
create table where not exists quests (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text default '',
  reward text default '',
  level text not null default 'explore',
  status text not null default 'available',
  hex_col integer not null,
  hex_row integer not null,
  players jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);

-- Player reports (field updates submitted by players)
create table if not exists reports (
  id uuid default gen_random_uuid() primary key,
  author text not null,
  title text not null default '',
  content text not null,
  created_at timestamptz default now()
);

alter table reports enable row level security;
create policy "Allow all access to reports" on reports
  for all using (true) with check (true);

-- Initiative tracker (shared turn order for encounters)
create table if not exists initiative_tracker (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  initiative integer not null default 0,
  is_creature boolean not null default false,
  hp integer,
  max_hp integer,
  ac integer,
  cr real,
  created_at timestamptz default now()
);

alter table initiative_tracker enable row level security;
create policy "Allow all access to initiative_tracker" on initiative_tracker
  for all using (true) with check (true);

-- Enable real-time for tables
alter publication supabase_realtime add table hexes;
alter publication supabase_realtime add table quests;
alter publication supabase_realtime add table initiative_tracker;
alter publication supabase_realtime add table reports;

-- Row Level Security (allow all for now — public game)
alter table hexes enable row level security;
alter table quests enable row level security;

create policy "Allow all access to hexes" on hexes
  for all using (true) with check (true);

create policy "Allow all access to quests" on quests
  for all using (true) with check (true);
