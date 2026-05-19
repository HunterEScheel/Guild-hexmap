// Regenerates public/bounties.md from the D&D 5e SRD API.
//
// Every catalogued creature is listed with a bounty derived from its
// challenge rating. Two groups are excluded: undead (collapsed into a single
// quest-only category) and human NPCs -- the "any race" humanoid stat blocks
// like Commoner, Guard, Bandit and Noble -- because the guild does not pay
// bounties on people.
//
// Run with:  node scripts/generate-bounties.mjs

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "bounties.md");

// Bounty scales with challenge rating: 25 * CR^2.4 gp, floored at 1 cp.
const BOUNTY_COEFFICIENT = 25;
const BOUNTY_EXPONENT = 2.4;

// Formats a creature's bounty in the largest sensible coin denomination.
// 1 gp = 10 sp = 100 cp; sub-gold values drop to silver, then copper.
function formatBounty(cr) {
  const copper = Math.max(
    1,
    Math.round(BOUNTY_COEFFICIENT * cr ** BOUNTY_EXPONENT * 100)
  );
  if (copper >= 100) {
    return `${Math.round(copper / 100).toLocaleString("en-US")} gp`;
  }
  if (copper >= 10) {
    const sp = Math.round(copper / 10);
    return sp >= 10 ? "1 gp" : `${sp} sp`;
  }
  return `${copper} cp`;
}

async function fetchMonsters() {
  const res = await fetch("https://www.dnd5eapi.co/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query:
        "{ monsters(limit: 500) { index name size type subtype challenge_rating } }",
    }),
  });
  if (!res.ok) throw new Error(`API request failed: ${res.status}`);
  const json = await res.json();
  return json.data.monsters;
}

function buildMarkdown(monsters) {
  const undead = monsters.filter((m) => m.type === "undead");
  // "any race" humanoids are the human NPC stat blocks (Commoner, Guard,
  // Bandit, Noble, ...). The guild does not bounty people, so they are dropped.
  const isHumanNpc = (m) => m.type === "humanoid" && m.subtype === "any race";
  const rest = monsters
    .filter((m) => m.type !== "undead" && !isHumanNpc(m))
    .sort((a, b) => a.name.localeCompare(b.name));

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
  lines.push("## Bounty Rates");
  lines.push("");
  lines.push(
    `Every creature the guild pays a bounty on (${rest.length} in total). Search by name or sort any column; the bounty reflects the threat a creature poses. People are not listed -- the guild bounties monsters, not persons, and will not pay for murder.`
  );
  lines.push("");
  lines.push("| Creature | Size | Bounty |");
  lines.push("| --- | --- | --- |");
  for (const m of rest) {
    lines.push(
      `| ${m.name} | ${m.size} | ${formatBounty(m.challenge_rating)} |`
    );
  }
  lines.push("");
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
