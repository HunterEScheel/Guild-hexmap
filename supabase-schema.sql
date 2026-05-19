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

-- Enable real-time for both tables
alter publication supabase_realtime add table hexes;
alter publication supabase_realtime add table quests;

-- Row Level Security (allow all for now — public game)
alter table hexes enable row level security;
alter table quests enable row level security;

create policy "Allow all access to hexes" on hexes
  for all using (true) with check (true);

create policy "Allow all access to quests" on quests
  for all using (true) with check (true);
