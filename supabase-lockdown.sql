-- Lockdown migration: route admin writes through service-role only;
-- expose narrow player operations via security-definer RPC functions.
--
-- Run once in Supabase SQL Editor. Safe to re-run.

-- ============ quests ============
drop policy if exists "Allow all access to quests" on quests;
drop policy if exists "Quests readable by everyone" on quests;
create policy "Quests readable by everyone" on quests
  for select using (true);
-- No INSERT/UPDATE/DELETE policy for anon. Service role bypasses RLS.

-- RPC: a player joins a quest (appends to players, sets in_progress)
create or replace function join_quest(
  p_quest_id uuid,
  p_player_name text,
  p_scheduled_date date default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_players jsonb;
begin
  select players into current_players from quests where id = p_quest_id;
  if current_players is null then return; end if;

  if not (current_players ? p_player_name) then
    update quests
    set
      players = current_players || to_jsonb(p_player_name),
      status = 'in_progress',
      scheduled_date = coalesce(p_scheduled_date, scheduled_date)
    where id = p_quest_id;
  end if;
end;
$$;
grant execute on function join_quest(uuid, text, date) to anon, authenticated;

-- RPC: a player leaves a quest (resets to available if last one out)
create or replace function leave_quest(
  p_quest_id uuid,
  p_player_name text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_players jsonb;
  remaining jsonb;
begin
  select players into current_players from quests where id = p_quest_id;
  if current_players is null then return; end if;

  select coalesce(jsonb_agg(p), '[]'::jsonb) into remaining
  from jsonb_array_elements_text(current_players) as t(p)
  where p <> p_player_name;

  if jsonb_array_length(remaining) = 0 then
    update quests
    set players = remaining, status = 'available', scheduled_date = null
    where id = p_quest_id;
  else
    update quests set players = remaining where id = p_quest_id;
  end if;
end;
$$;
grant execute on function leave_quest(uuid, text) to anon, authenticated;

-- ============ initiative_tracker ============
-- Read open, INSERT open (player adds self, admin adds creatures), but
-- UPDATE/DELETE locked. Admin HP/remove/clear go through admin-action.
drop policy if exists "Allow all access to initiative_tracker" on initiative_tracker;
drop policy if exists "Initiative readable by everyone" on initiative_tracker;
drop policy if exists "Initiative insert open" on initiative_tracker;
create policy "Initiative readable by everyone" on initiative_tracker
  for select using (true);
create policy "Initiative insert open" on initiative_tracker
  for insert with check (true);

-- ============ shop_inventory ============
drop policy if exists "Allow all access to shop_inventory" on shop_inventory;
drop policy if exists "Shop inventory readable" on shop_inventory;
create policy "Shop inventory readable" on shop_inventory
  for select using (true);
-- No writes for anon.

-- RPC: a player purchases an item (decrement qty or delete if last one)
create or replace function purchase_shop_item(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_qty int;
begin
  select quantity into current_qty from shop_inventory where id = p_id;
  if current_qty is null then return; end if;

  if current_qty > 1 then
    update shop_inventory set quantity = quantity - 1 where id = p_id;
  else
    delete from shop_inventory where id = p_id;
  end if;
end;
$$;
grant execute on function purchase_shop_item(uuid) to anon, authenticated;

-- ============ shop_restock_rules ============
drop policy if exists "Allow all access to shop_restock_rules" on shop_restock_rules;
drop policy if exists "Restock rules readable" on shop_restock_rules;
create policy "Restock rules readable" on shop_restock_rules
  for select using (true);
-- No writes for anon.

-- ============ shop_restock_settings ============
drop policy if exists "Allow all access to shop_restock_settings" on shop_restock_settings;
drop policy if exists "Restock settings readable" on shop_restock_settings;
create policy "Restock settings readable" on shop_restock_settings
  for select using (true);
-- No writes for anon.
