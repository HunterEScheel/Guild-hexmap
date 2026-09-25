# Guild Hexmap

Hexploration campaign companion — map, quests, shop and initiative tracker — served at
the root of [map.jaeg.click](https://map.jaeg.click).

It is **public**, and deliberately so: players identify themselves by typing a name
and never sign in. The admin is one signed-in Supabase account, the one listed in the
`site_admins` table (seeded in the jaeg.click repo). The sign-in is shared across all
of `*.jaeg.click`.

## Where the backend lives

The map shares one Supabase project with the other jaeg.click apps. Everything it owns
is prefixed `hexmap_` so it can sit alongside them. This repo holds only the web
client; the schema and Edge Functions live in the `supabase/` folder of
[HunterEScheel/jaeg.click](https://github.com/HunterEScheel/jaeg.click):

- **Migrations:** `hexmap_0001_init.sql`, `hexmap_0002_lockdown.sql`,
  `hexmap_0003_schema_catchup.sql`, `hexmap_0004_discord_message_id.sql`, in that
  order.
- **Edge Functions:** `admin-action`, `generate-quests`, `discord-quest-sync`,
  `discord-finding-post`, `npc-quest-report`. Their secrets are set on the shared
  project — whatever the Discord and quest-generation functions read. There is no
  admin secret; the functions check the caller's JWT against `site_admins`.

Schema changes and function deploys are made from that repo, not this one.

## History of the schema

When the map moved from its own Supabase project into the shared one (while it was
served at `/hexmap` from the collections repo), the committed schema turned out to have
drifted well behind the running database. `hexmap_0003_schema_catchup.sql` exists to
close that gap:

| Missing | What |
|---|---|
| `characters`, `shop_purchases` | Two whole tables the app reads |
| `hexes.challenge_tier`, `.landmark`, `.landmark_name` | Two sat in the schema file as commented-out ALTERs; the third was never written down |
| `quests.end_hex_col`, `.end_hex_row`, `.scheduled_date`, `.completed_at`, `.found_items` | All read by `mapQuest()`; `scheduled_date` is also written by the `join_quest` RPC in 0002, which would have failed against the schema as committed |
| `quests.discord_message_id` | Only the Edge Functions touch it, so reading the client alone missed it (0004) |
| `create_quest_finding`, `purchase_equipment`, `save_character`, `set_quest_active` | Four RPCs the client calls |

The root cause in every case: the old `supabase-schema.sql` carried seven
`-- alter table ... add column` lines that had been run against the live database but
never uncommented. `0003` is additive and idempotent.

### The four reconstructed RPCs

`0003` contains working versions of `create_quest_finding`, `purchase_equipment`,
`save_character` and `set_quest_active`, but they were rebuilt from their call sites —
the real definitions existed only in the old project. `purchase_equipment` in
particular moves gold, so read it before trusting it. To dump the originals from the
old project for comparison:

```sql
select p.proname, pg_get_functiondef(p.oid)
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('create_quest_finding', 'purchase_equipment',
                    'save_character', 'set_quest_active');
```

## If a CSV import complains about a column

The live database is the source of truth, not the schema file, so an export can still
carry a column no migration creates. Before importing, compare the CSV header against
the table:

```sql
select column_name
from information_schema.columns
where table_schema = 'public' and table_name = 'hexmap_quests'
order by column_name;
```

Anything in the CSV and not in that list is another uncommitted column: add it with
`alter table ... add column if not exists`, and commit the ALTER as a migration in the
jaeg.click repo so the next person starts level.

## Realtime

The live-update subscriptions filter on table name (`table: "hexmap_quests"` and so
on), so those names have to match the tables exactly — they are not routed through the
`.from()` calls and will silently stop updating if the two drift apart.

## Anonymous players, one signed-in admin

Players' requests are anonymous. That works because the table policies allow public
reads and the RPCs are granted to `anon`.

The admin signs in with the lock button (GitHub, Discord or an email magic link). The
client in `src/supabase.ts` is built with `createBrowserClient` from `@supabase/ssr`,
and on `*.jaeg.click` it keeps the session in a cookie on `.jaeg.click` rather than in
this origin's localStorage, so signing in on any jaeg.click app signs you in here too.
Locally the cookie stays on the host.

`src/hooks/useAdminMode.ts` asks the database whether the signed-in account is the
admin (`rpc('is_site_admin')`), which only decides what the UI shows. Anything that
needs admin rights goes through the `admin-action`, `generate-quests` or
`npc-quest-report` Edge Functions; supabase-js attaches the session's JWT, and the
functions answer 401 ("Sign in as the admin first") without one and 403 ("Not the
admin") for any other account. The client shows that message as it shows other admin
errors.
