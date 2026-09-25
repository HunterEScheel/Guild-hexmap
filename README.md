# Guild Hexmap

D&D hexploration campaign companion: the hex map, quests and bounty board, the shop,
characters and an initiative tracker, all updating live for everyone at the table.
Served at [map.jaeg.click](https://map.jaeg.click).

It is **public**. Players identify themselves by typing a name and never sign in.
The admin does sign in, through the lock button (GitHub, Discord or an email link), and
the admin tools open for the one account listed in the `site_admins` table, which is
seeded in the jaeg.click repo. The `admin-action` Edge Function checks that account on
every write, so the check is server-side rather than in the browser.

The sign-in is shared across every app on `*.jaeg.click`: the session is a cookie on
`.jaeg.click`, so an admin signed in on any of them is signed in here. Running locally
there is no parent domain, and the session stays on `localhost`.

## Backend

The map uses a Supabase project it shares with the other jaeg.click apps, which is why
everything it touches is prefixed `hexmap_`. Its schema (the `hexmap_*` migrations) and
Edge Functions (`admin-action`, `generate-quests`, `npc-quest-report`,
`discord-quest-sync`, `discord-finding-post`) live in the `supabase/` folder of
[HunterEScheel/jaeg.click](https://github.com/HunterEScheel/jaeg.click). This repo is
the web client only. See [docs/hexmap.md](docs/hexmap.md) for the details.

## Environment

Copy `.env.example` to `.env.local` and fill in the shared project's values:

| Variable | What |
| --- | --- |
| `VITE_SUPABASE_URL` | The Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | The project's anon (publishable) key |

There is no admin variable. Who the admin is lives in the database (`site_admins`), and
the Supabase Auth redirect allow-list has to include the map's URLs (production and
`http://localhost:5173` for local work) for sign-in to return here.

`src/supabase.ts` throws at module load when either variable is missing. At build time
they are inlined, so without them every module that imports the client becomes
unreachable and the bundler drops the app while still exiting 0. CI builds with
placeholders and then checks the bundle contains a `hexmap_` table name.

## Commands

```sh
npm install
npm run dev       # Vite dev server
npm run lint      # oxlint
npm test          # vitest
npm run build     # typecheck and build to dist/
npm run preview   # serve the build
```

Deployed by Vercel (`vercel.json`): a single-page Vite app, with every path rewritten
to `index.html`.
