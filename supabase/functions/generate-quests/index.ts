// Supabase Edge Function: generate-quests
//
// Takes a player report plus the world context (filled hexes, existing
// quests, all reports) and asks OpenAI to surface quest suggestions that
// arise from the report.
//
// Deploy via dashboard: paste this whole file as the function body,
// name the function "generate-quests", click Deploy.
//
// Required secret:
//   OPENAI_API_KEY = sk-...
//
// Optional secret:
//   OPENAI_MODEL = gpt-4o-mini (default if unset)

// deno-lint-ignore-file no-explicit-any
// @ts-nocheck — runs in Deno, not the browser TS build.

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

const QUEST_LEVELS = [
  "explore",
  "recurring",
  "wolf",
  "demon",
  "dragon",
  "terrasque",
  "god",
];

const SYSTEM_PROMPT = `You are the world-spinner for a Dungeons & Dragons hexcrawl campaign.
The party of adventurers operates from a fortified town and explores a hex map. They submit field reports after each outing.

Your job: given the latest field report and the current world state, propose 0-4 new quests that plausibly arise from what was reported.

Rules:
- Only propose quests grounded in the focal report's content. Do not invent unrelated threads.
- The focal report may include "findings" — explicit (col, row) hex coordinates the player flagged as significant. These are the strongest signal for where a quest should anchor.
- A quest's hexCol/hexRow should be one of the report's findings whenever possible. Use the most relevant finding as the START point.
- If the quest naturally has a destination different from where it begins, set endHexCol/endHexRow to ANOTHER finding from the same report (preferred) or another filled hex.
- If no destination makes sense, leave endHexCol and endHexRow null — single-hex quests are valid.
- Fall back to a filled hex on the map only when the report has no usable findings.
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
      "reward": "...",
      "level": "explore" | "recurring" | "wolf" | "demon" | "dragon" | "terrasque" | "god",
      "hexCol": <int>,
      "hexRow": <int>,
      "endHexCol": <int> | null,
      "endHexRow": <int> | null,
      "rationale": "Why this quest follows from the report (one sentence). Cite the finding it anchors to if applicable."
    }
  ]
}`;

function buildUserPrompt(body) {
  const focal = body.reports.find((r) => r.id === body.reportId);
  if (!focal) {
    return `Focal report id ${body.reportId} not found in reports list.`;
  }

  const otherReports = body.reports.filter((r) => r.id !== body.reportId);

  const hexLines = (body.hexes || [])
    .map((h) => {
      const tier = h.challengeTier != null ? ` T${h.challengeTier}` : "";
      return `  (${h.col}, ${h.row}) ${h.terrain}${tier}`;
    })
    .join("\n");

  const questLines = (body.quests || [])
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
        `  - ${r.author} (${r.createdAt}): ${r.title ? r.title + " — " : ""}${(r.content || "").slice(0, 200)}`
    )
    .join("\n");

  const focalFindings = Array.isArray(focal.findings)
    ? focal.findings
        .map(
          (f, i) =>
            `  [${i + 1}] (${f.hexCol}, ${f.hexRow}) — ${f.description || "(no description)"}`
        )
        .join("\n")
    : "";

  return `FOCAL REPORT
Author: ${focal.author}
Title: ${focal.title || "(untitled)"}
Submitted: ${focal.createdAt}

${focal.content}

Findings reported at specific hexes:
${focalFindings || "  (none)"}

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

function isValidLevel(v) {
  return typeof v === "string" && QUEST_LEVELS.indexOf(v) !== -1;
}

function sanitizeSuggestions(raw, fallbackHex) {
  if (!raw || !Array.isArray(raw.suggestions)) return [];
  const out = [];
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
    const hasRoute = endHexCol != null && endHexRow != null;
    out.push({
      title,
      description,
      reward: String(s.reward ?? "").trim(),
      level,
      hexCol,
      hexRow,
      endHexCol: hasRoute ? endHexCol : null,
      endHexRow: hasRoute ? endHexRow : null,
      rationale: String(s.rationale ?? "").trim(),
    });
  }
  return out.slice(0, 4);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: JSON_CORS }
    );
  }

  try {
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "OPENAI_API_KEY secret not set" }),
        { status: 500, headers: JSON_CORS }
      );
    }
    const model = Deno.env.get("OPENAI_MODEL") || "gpt-4o-mini";

    let body;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        { status: 400, headers: JSON_CORS }
      );
    }

    if (!body || !body.reportId || !Array.isArray(body.reports)) {
      return new Response(
        JSON.stringify({ error: "Body must include reportId and reports[]" }),
        { status: 400, headers: JSON_CORS }
      );
    }

    const userPrompt = buildUserPrompt(body);
    const fallbackHex = (body.hexes && body.hexes[0]) || null;

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
        JSON.stringify({ error: `OpenAI ${aiRes.status}: ${errText}` }),
        { status: 502, headers: JSON_CORS }
      );
    }

    const aiJson = await aiRes.json();
    const content = aiJson?.choices?.[0]?.message?.content;
    if (typeof content !== "string") {
      return new Response(
        JSON.stringify({ error: "OpenAI returned no content" }),
        { status: 502, headers: JSON_CORS }
      );
    }

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      return new Response(
        JSON.stringify({ error: "OpenAI returned malformed JSON", raw: content }),
        { status: 502, headers: JSON_CORS }
      );
    }

    const suggestions = sanitizeSuggestions(parsed, fallbackHex);

    return new Response(JSON.stringify({ suggestions }), {
      headers: JSON_CORS,
    });
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : String(err),
      }),
      { status: 500, headers: JSON_CORS }
    );
  }
});
