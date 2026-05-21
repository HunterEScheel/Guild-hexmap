// Supabase Edge Function: admin-action
//
// Server-side admin authentication and write gate. The browser never holds
// write access to the hexes table directly; instead it sends an admin PIN
// here, this function verifies it against the ADMIN_PIN secret, and on
// success performs the write using the service-role key (which bypasses
// RLS).
//
// Deploy via dashboard:
//   1. Edge Functions → Deploy a new function → Via Editor
//   2. Name: admin-action
//   3. Paste this whole file, click Deploy
//   4. Settings/Details tab → turn OFF "Verify JWT"
//
// Required secret (set once at the project level):
//   ADMIN_PIN = <your chosen PIN>
//
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are auto-injected by Supabase
// into every Edge Function — no need to set them.

// deno-lint-ignore-file no-explicit-any
// @ts-nocheck — Deno runtime, not browser TS build.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const JSON_CORS = {
  ...CORS_HEADERS,
  "Content-Type": "application/json",
};

const VALID_TERRAINS = [
  "forest",
  "plains",
  "mountain",
  "swamp",
  "desert",
  "snow",
  "water",
  "allied_city",
  "unallied_city",
  "unknown",
];

function jsonResponse(status, payload) {
  return new Response(JSON.stringify(payload), { status, headers: JSON_CORS });
}

const ok = (extra = {}) => jsonResponse(200, { ok: true, ...extra });
const badRequest = (msg) => jsonResponse(400, { error: msg });
const unauthorized = () => jsonResponse(401, { error: "Invalid admin PIN" });
const serverError = (msg) => jsonResponse(500, { error: msg });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  const adminPin = Deno.env.get("ADMIN_PIN");
  if (!adminPin) return serverError("ADMIN_PIN secret not set");

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return serverError("Supabase env vars missing");
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  const submittedPin = String(body?.pin ?? "");
  if (submittedPin !== adminPin) return unauthorized();

  const action = String(body?.action ?? "");
  const payload = (body?.payload ?? {}) as Record<string, any>;

  const supa = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  try {
    switch (action) {
      case "verify_pin":
        // Just confirm the PIN — useful for the login modal.
        return ok();

      case "set_hex_terrain": {
        const col = Number(payload.col);
        const row = Number(payload.row);
        const terrain = String(payload.terrain ?? "");
        if (!Number.isFinite(col) || !Number.isFinite(row)) {
          return badRequest("col/row must be numbers");
        }
        if (!VALID_TERRAINS.includes(terrain)) {
          return badRequest("invalid terrain");
        }
        if (terrain === "unknown") {
          // Paint-unknown = delete the row entirely (clears tier too).
          const { error } = await supa
            .from("hexes")
            .delete()
            .eq("col", col)
            .eq("row", row);
          if (error) return serverError(error.message);
        } else {
          const { error } = await supa.from("hexes").upsert(
            { col, row, terrain },
            { onConflict: "col,row" }
          );
          if (error) return serverError(error.message);
        }
        return ok();
      }

      case "set_hex_challenge_tier": {
        const col = Number(payload.col);
        const row = Number(payload.row);
        const tierRaw = payload.tier;
        const tier =
          tierRaw == null || tierRaw === "" ? null : Number(tierRaw);
        if (!Number.isFinite(col) || !Number.isFinite(row)) {
          return badRequest("col/row must be numbers");
        }
        if (tier != null && (!Number.isFinite(tier) || tier < 0 || tier > 4)) {
          return badRequest("invalid tier (must be 0-4 or null)");
        }
        const { error } = await supa.from("hexes").upsert(
          { col, row, challenge_tier: tier },
          { onConflict: "col,row" }
        );
        if (error) return serverError(error.message);
        return ok();
      }

      default:
        return badRequest(`unknown action: ${action}`);
    }
  } catch (err) {
    return serverError(err instanceof Error ? err.message : String(err));
  }
});
