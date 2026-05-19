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
