// Supabase Edge Function: generate-quests
//
// Takes a player report plus the world context (filled hexes, existing
// quests, all reports) and asks OpenAI to surface quest suggestions that
// arise from the report.
//
// Deploy:
//   supabase functions deploy generate-quests
//
// Required secret (set once):
//   supabase secrets set OPENAI_API_KEY=sk-...
//
// Optional:
//   supabase secrets set OPENAI_MODEL=gpt-4o-mini

// deno-lint-ignore-file no-explicit-any
// @ts-nocheck — this file runs in the Deno edge runtime, not the browser TS build.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Hex = {
  col: number;
  row: number;
  terrain: string;
  challengeTier: number | null;
};

type Quest = {
  title: string;
  description: string;
  level: string;
  status: string;
  hexCol: number;
  hexRow: number;
  endHexCol: number | null;
  endHexRow: number | null;
};

type Report = {
  id: string;
  author: string;
  title: string;
  content: string;
  createdAt: string;
};

type RequestBody = {
  reportId: string;
  hexes: Hex[];
  quests: Quest[];
  reports: Report[];
};

const QUEST_LEVELS = [
  "explore",
  "recurring",
  "wolf",
  "demon",
  "dragon",
  "terrasque",
  "god",
] as const;

const SYSTEM_PROMPT = `You are the world-spinner for a Dungeons & Dragons hexcrawl campaign.
The party of adventurers operates from a fortified town and explores a hex map. They submit field reports after each outing.

Your job: given the latest field report and the current world state, propose 0-4 new quests that plausibly arise from what was reported.

Rules:
- Only propose quests grounded in the focal report's content. Do not invent unrelated threads.
- Prefer quests anchored at hexes that already exist on the map (look at the filled hexes list).
- A quest may have a single hex (just hexCol/hexRow) or a "route" with end coordinates.
- "level" must be one of: ${QUEST_LEVELS.join(", ")}.
  - explore: simple investigation/scouting
  - recurring: ongoing/repeatable jobs
  - wolf: low-tier combat
  - demon: mid-tier combat
  - dragon: high-tier combat
  - terrasque: apocalyptic
  - god: cosmic / endgame
- Do not duplicate quests that already exist in the quest log.
- Keep titles short (max 6 words). Descriptions 1-3 sentences.
- If the report is mundane or nothing actionable surfaces, return an empty list.

Respond with ONLY a JSON object of the form:
{
  "suggestions": [
    {
      "title": "...",
      "description": "...",
      "reward": "...",            // can be empty string
      "level": "explore" | "recurring" | "wolf" | "demon" | "dragon" | "terrasque" | "god",
      "hexCol": <int>,
      "hexRow": <int>,
      "endHexCol": <int> | null,
      "endHexRow": <int> | null,
      "rationale": "Why this quest follows from the report (one sentence)."
    }
  ]
}`;

function buildUserPrompt(body: RequestBody): string {
  const focal = body.reports.find((r) => r.id === body.reportId);
  if (!focal) {
    return `Focal report id ${body.reportId} not found in reports list.`;
  }

  const otherReports = body.reports.filter((r) => r.id !== body.reportId);

  const hexLines = body.hexes
    .map((h) => {
      const tier = h.challengeTier != null ? ` T${h.challengeTier}` : "";
      return `  (${h.col}, ${h.row}) ${h.terrain}${tier}`;
    })
    .join("\n");

  const questLines = body.quests
    .filter((q) => q.status !== "completed")
    .map((q) => {
      const route =
        q.endHexCol != null && q.endHexRow != null
          ? ` -> (${q.endHexCol}, ${q.endHexRow})`
          : "";
      return `  [${q.level}] ${q.title} @ (${q.hexCol}, ${q.hexRow})${route} (${q.status})`;
    })
    .join("\n");

  const recentReports = otherReports
    .slice(0, 5)
    .map(
      (r) =>
        `  - ${r.author} (${r.createdAt}): ${r.title ? r.title + " — " : ""}${r.content.slice(0, 200)}`
    )
    .join("\n");

  return `FOCAL REPORT
Author: ${focal.author}
Title: ${focal.title || "(untitled)"}
Submitted: ${focal.createdAt}

${focal.content}

------------------
WORLD STATE

Filled hexes:
${hexLines || "  (none)"}

Active quests:
${questLines || "  (none)"}

Recent other reports:
${recentReports || "  (none)"}

Based on the FOCAL REPORT (with the world state as context), propose new quests.`;
}

function isValidLevel(v: unknown): v is (typeof QUEST_LEVELS)[number] {
  return typeof v === "string" && (QUEST_LEVELS as readonly string[]).includes(v);
}

function sanitizeSuggestions(raw: any, fallbackHex: Hex | null): any[] {
  if (!raw || !Array.isArray(raw.suggestions)) return [];
  const out: any[] = [];
  for (const s of raw.suggestions) {
    if (!s || typeof s !== "object") continue;
    const title = String(s.title ?? "").trim();
    const description = String(s.description ?? "").trim();
    if (!title || !description) continue;
    const level = isValidLevel(s.level) ? s.level : "explore";
    const hexCol = Number.isFinite(s.hexCol)
      ? Math.trunc(s.hexCol)
      : (fallbackHex?.col ?? 0);
    const hexRow = Number.isFinite(s.hexRow)
      ? Math.trunc(s.hexRow)
      : (fallbackHex?.row ?? 0);
    const endHexCol =
      s.endHexCol != null && Number.isFinite(s.endHexCol)
        ? Math.trunc(s.endHexCol)
        : null;
    const endHexRow =
      s.endHexRow != null && Number.isFinite(s.endHexRow)
        ? Math.trunc(s.endHexRow)
        : null;
    out.push({
      title,
      description,
      reward: String(s.reward ?? "").trim(),
      level,
      hexCol,
      hexRow,
      endHexCol:
        endHexCol != null && endHexRow != null ? endHexCol : null,
      endHexRow:
        endHexCol != null && endHexRow != null ? endHexRow : null,
      rationale: String(s.rationale ?? "").trim(),
    });
  }
  return out.slice(0, 4);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "OPENAI_API_KEY secret not set" }),
        { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }
    const model = Deno.env.get("OPENAI_MODEL") || "gpt-4o-mini";

    const body = (await req.json()) as RequestBody;
    if (!body?.reportId || !Array.isArray(body.reports)) {
      return new Response(
        JSON.stringify({ error: "Invalid body — expected reportId and reports[]" }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    const userPrompt = buildUserPrompt(body);
    const fallbackHex = body.hexes[0] ?? null;

    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        response_format: { type: "json_object" },
        temperature: 0.7,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      return new Response(
        JSON.stringify({ error: `OpenAI error ${aiRes.status}: ${errText}` }),
        { status: 502, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    const aiJson = await aiRes.json();
    const content = aiJson?.choices?.[0]?.message?.content;
    if (typeof content !== "string") {
      return new Response(
        JSON.stringify({ error: "OpenAI returned no content" }),
        { status: 502, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      return new Response(
        JSON.stringify({ error: "OpenAI returned malformed JSON", raw: content }),
        { status: 502, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    const suggestions = sanitizeSuggestions(parsed, fallbackHex);

    return new Response(JSON.stringify({ suggestions }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }
});
