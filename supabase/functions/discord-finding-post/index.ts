// Supabase Edge Function: discord-finding-post
//
// One-shot post to the "mission reports" Discord channel each time a
// player submits a finding on a completed quest. Unlike discord-quest-sync,
// this never updates — every finding is its own message in the channel.
//
// Deploy via dashboard:
//   1. Edge Functions → Deploy a new function → Via Editor
//   2. Name: discord-finding-post
//   3. Paste this file
//   4. Settings → toggle "Verify JWT" OFF
//
// Required secret:
//   MISSION_REPORTS_WEBHOOK_URL = https://discord.com/api/webhooks/<id>/<token>

// deno-lint-ignore-file no-explicit-any
// @ts-nocheck — Deno runtime.

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const JSON_CORS = { ...CORS_HEADERS, "Content-Type": "application/json" };

const LEVEL_LABEL: Record<string, string> = {
  explore: "Explore",
  recurring: "Recurring",
  wolf: "Wolf",
  demon: "Demon",
  dragon: "Dragon",
  terrasque: "Terrasque",
  god: "God",
};

const LEVEL_COLOR: Record<string, number> = {
  explore: 0x4ade80,
  recurring: 0x60a5fa,
  wolf: 0xfacc15,
  demon: 0xf97316,
  dragon: 0xef4444,
  terrasque: 0xa855f7,
  god: 0xfbbf24,
};

const HEXMAP_URL = "https://scheels.quest/?tab=active-quests";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: JSON_CORS,
    });
  }

  try {
    const webhookUrl = Deno.env.get("MISSION_REPORTS_WEBHOOK_URL");
    if (!webhookUrl) {
      return new Response(
        JSON.stringify({ error: "MISSION_REPORTS_WEBHOOK_URL secret not set" }),
        { status: 500, headers: JSON_CORS }
      );
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: JSON_CORS,
      });
    }

    const author = String(body?.author ?? "").trim() || "Unknown";
    const questTitle = String(body?.questTitle ?? "").trim() || "Unknown Quest";
    const questLevel = String(body?.questLevel ?? "explore");
    const hexCol = Number(body?.hexCol);
    const hexRow = Number(body?.hexRow);
    const description =
      String(body?.description ?? "").trim() || "_(no description)_";

    if (!Number.isFinite(hexCol) || !Number.isFinite(hexRow)) {
      return new Response(
        JSON.stringify({ error: "hexCol/hexRow must be numbers" }),
        { status: 400, headers: JSON_CORS }
      );
    }

    const color = LEVEL_COLOR[questLevel] ?? 0x9ca3af;
    const levelLabel = LEVEL_LABEL[questLevel] ?? questLevel;

    const embed = {
      title: "🗒️ Mission Report",
      url: HEXMAP_URL,
      description: `**${author}** reports from \`(${hexCol}, ${hexRow})\`:\n\n${description}`,
      color,
      fields: [
        { name: "Quest", value: questTitle, inline: true },
        { name: "Difficulty", value: levelLabel, inline: true },
      ],
      timestamp: new Date().toISOString(),
    };

    const postRes = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "Hexmap",
        embeds: [embed],
      }),
    });

    if (!postRes.ok) {
      const text = await postRes.text();
      return new Response(
        JSON.stringify({ error: `Discord POST ${postRes.status}: ${text}` }),
        { status: 502, headers: JSON_CORS }
      );
    }

    return new Response(JSON.stringify({ ok: true }), { headers: JSON_CORS });
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : String(err),
      }),
      { status: 500, headers: JSON_CORS }
    );
  }
});
