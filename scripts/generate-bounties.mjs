// Regenerates public/bounties.md from the D&D 5e SRD API.
//
// Every non-undead creature is listed and paid a flat bounty based on its
// challenge-rating bracket. All undead are collapsed into a single category
// (the guild pays for undead only against posted quests, never by the head).
//
// Run with:  node scripts/generate-bounties.mjs

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "bounties.md");

// Flat bounty per challenge-rating bracket. min/max are inclusive CR values.
const BRACKETS = [
  { label: "CR 0", min: 0, max: 0, bounty: "5 sp" },
  { label: "CR 1/8 – 1/4", min: 0.125, max: 0.25, bounty: "1 gp" },
  { label: "CR 1/2 – 1", min: 0.5, max: 1, bounty: "5 gp" },
  { label: "CR 2 – 3", min: 2, max: 3, bounty: "25 gp" },
  { label: "CR 4 – 5", min: 4, max: 5, bounty: "100 gp" },
  { label: "CR 6 – 8", min: 6, max: 8, bounty: "400 gp" },
  { label: "CR 9 – 11", min: 9, max: 11, bounty: "1,200 gp" },
  { label: "CR 12 – 14", min: 12, max: 14, bounty: "4,000 gp" },
  { label: "CR 15 – 17", min: 15, max: 17, bounty: "12,000 gp" },
  { label: "CR 18 – 21", min: 18, max: 21, bounty: "40,000 gp" },
  { label: "CR 22 – 24", min: 22, max: 24, bounty: "90,000 gp" },
  { label: "CR 25+", min: 25, max: 99, bounty: "250,000 gp" },
];

function formatCr(cr) {
  if (cr === 0.125) return "1/8";
  if (cr === 0.25) return "1/4";
  if (cr === 0.5) return "1/2";
  return String(cr);
}

function bracketFor(cr) {
  return BRACKETS.find((b) => cr >= b.min && cr <= b.max) ?? null;
}

async function fetchMonsters() {
  const res = await fetch("https://www.dnd5eapi.co/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query:
        "{ monsters(limit: 500) { index name size type challenge_rating } }",
    }),
  });
  if (!res.ok) throw new Error(`API request failed: ${res.status}`);
  const json = await res.json();
  return json.data.monsters;
}

function buildMarkdown(monsters) {
  const undead = monsters.filter((m) => m.type === "undead");
  const rest = monsters.filter((m) => m.type !== "undead");

  const lines = [];
  lines.push("# Bounty Table");
  lines.push("");
  lines.push(
    "Standard bounty rates paid by the guild per creature kill. Proof of kill must be delivered to any guild writ-post for payment."
  );
  lines.push("");
  lines.push("## Proof Requirements");
  lines.push("");
  lines.push("| Creature Size | Required Proof |");
  lines.push("| --- | --- |");
  lines.push("| **Tiny / Small** | Full creature body |");
  lines.push(
    "| **Medium** | Head, or equivalent identifying remains if the creature has no head |"
  );
  lines.push(
    "| **Large+** | Head, or equivalent identifying remains. Assessor may accept partial proof for transport reasons |"
  );
  lines.push("");
  lines.push("### Undead (Shadows, Specters, etc.)");
  lines.push("");
  lines.push(
    "Incorporeal creatures leave no body. The guild cannot verify a kill without proof, and it will not pay bounties on someone's word alone. A skeleton or zombie body proves nothing -- anyone with the right spell can make one from a fresh corpse. An open bounty on undead is an open bounty on murder. If you encounter an incorporeal or undead creature:"
  );
  lines.push("");
  lines.push("1. **Report it to the guild.** Describe what you saw, where, and when.");
  lines.push("2. **The guild posts a quest** to kill it, with a set reward.");
  lines.push(
    "3. **The reporting party cannot take that quest.** This prevents adventurers from fabricating sightings to collect their own bounty."
  );
  lines.push("");
  lines.push(
    `**All undead are a single bounty category.** The ${undead.length} undead known to the guild -- skeletons, zombies, wights, ghosts, liches and the rest -- are not listed individually and are never paid by the head. A kill is paid only against a posted quest, at the reward that quest sets.`
  );
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("## Bounty Rates by Challenge Rating");
  lines.push("");
  lines.push(
    `Every non-undead creature the guild has catalogued (${rest.length} in total), sorted by threat. The bounty is a flat rate set by the creature's challenge-rating bracket.`
  );
  lines.push("");

  for (const bracket of BRACKETS) {
    const inBracket = rest
      .filter((m) => bracketFor(m.challenge_rating) === bracket)
      .sort(
        (a, b) =>
          a.challenge_rating - b.challenge_rating ||
          a.name.localeCompare(b.name)
      );
    if (inBracket.length === 0) continue;

    lines.push(`### ${bracket.label} — ${bracket.bounty}`);
    lines.push("");
    lines.push("| Creature | CR | Size |");
    lines.push("| --- | --- | --- |");
    for (const m of inBracket) {
      lines.push(`| ${m.name} | ${formatCr(m.challenge_rating)} | ${m.size} |`);
    }
    lines.push("");
  }

  lines.push("---");
  lines.push("");
  lines.push("## Rules");
  lines.push("");
  lines.push(
    "- **No double-dipping.** A creature killed during a monthly patrol cannot also be claimed against a separate writ for the same threat. Pick one payout."
  );
  lines.push(
    "- **Fraud.** Claiming a bounty for a creature you didn't kill, or presenting fabricated proof, results in permanent ban from the guild board. In a world where the next ghoul warren is one bad winter away, losing guild access is a serious consequence."
  );
  lines.push(
    "- **Unknowns.** If you kill something you can't identify, bring the head (or full body if small enough). The assessor will classify it, set a bounty, and add it to the table for future reference."
  );
  lines.push("");

  return lines.join("\n");
}

const monsters = await fetchMonsters();
const markdown = buildMarkdown(monsters);
writeFileSync(OUT, markdown, "utf8");
console.log(
  `Wrote ${OUT} — ${monsters.length} monsters (${
    monsters.filter((m) => m.type === "undead").length
  } undead consolidated).`
);
