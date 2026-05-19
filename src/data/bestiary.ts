import type { ChallengeTier, TerrainType } from "../types";

export const TIER_LABELS: Record<ChallengeTier, string> = {
  1: "Tier 1 (Lvl 1-5)",
  2: "Tier 2 (Lvl 6-10)",
  3: "Tier 3 (Lvl 11-15)",
  4: "Tier 4 (Lvl 16-20)",
};

const API_BASE = "https://www.dnd5eapi.co";

// Fields used from a dnd5eapi.co monster object.
export interface ApiMonster {
  index: string;
  name: string;
  size: string;
  type: string;
  challenge_rating: number;
  xp: number;
  hit_points: number;
  armor_class: { type: string; value: number }[];
  speed: Record<string, string>;
  image?: string | null;
}

// A monster reduced to the stats the hexmap cares about.
export interface Creature {
  index: string;
  name: string;
  size: string;
  type: string;
  challengeRating: number;
  xp: number;
  hitPoints: number;
  armorClass: number;
  combatPoints: number;
  tier: ChallengeTier;
  terrains: TerrainType[];
  imageUrl: string | null;
}

export interface EncounterGroup {
  creature: Creature;
  count: number;
}

export interface GeneratedEncounter {
  groups: EncounterGroup[];
  totalCreatures: number;
  totalCombatPoints: number;
  /** True when total combat points fall inside the tier's XP range. */
  withinBudget: boolean;
}

// Total combat-point (XP) range a random encounter should fall within, per tier.
export const TIER_XP_RANGE: Record<ChallengeTier, [number, number]> = {
  1: [100, 1000],
  2: [800, 3000],
  3: [2000, 7500],
  4: [6000, 22000],
};

// An encounter holds 2-10 creatures across 1-3 distinct types. The number of
// types is weighted: 50% one type, 40% two types, 10% three types.
const MIN_CREATURES = 2;
const MAX_CREATURES = 10;
const MAX_TYPES = 3;
const COMPOSE_ATTEMPTS = 400;
const TYPE_COUNT_WEIGHTS: { types: number; weight: number }[] = [
  { types: 1, weight: 0.5 },
  { types: 2, weight: 0.4 },
  { types: 3, weight: 0.1 },
];

// Challenge rating display: fractional CRs render as fractions (0.25 -> "1/4").
export function formatCr(cr: number): string {
  if (cr === 0.125) return "1/8";
  if (cr === 0.25) return "1/4";
  if (cr === 0.5) return "1/2";
  return String(cr);
}

export function crToTier(cr: number): ChallengeTier {
  if (cr <= 4) return 1;
  if (cr <= 10) return 2;
  if (cr <= 16) return 3;
  return 4;
}

// Base terrains per monster type. The 5e API has no environment data, so
// terrain is inferred heuristically from type, movement speed, and name.
const TYPE_TERRAINS: Record<string, TerrainType[]> = {
  aberration: ["swamp", "mountain", "unallied_city"],
  beast: ["forest", "plains", "mountain", "swamp", "desert", "snow"],
  celestial: ["mountain", "snow", "plains"],
  construct: ["unallied_city", "desert", "mountain"],
  dragon: ["mountain", "forest", "swamp", "desert", "snow"],
  elemental: ["mountain", "desert", "water", "snow"],
  fey: ["forest", "swamp", "plains"],
  fiend: ["unallied_city", "mountain", "desert"],
  giant: ["mountain", "snow", "desert", "plains"],
  humanoid: ["plains", "forest", "mountain", "unallied_city"],
  monstrosity: ["mountain", "forest", "swamp", "desert"],
  ooze: ["swamp", "unallied_city"],
  plant: ["forest", "swamp"],
  undead: ["swamp", "unallied_city", "forest", "snow"],
};

const SNOW_KEYWORDS = ["ice", "frost", "polar", "winter", "white dragon", "snow", "yeti", "mammoth", "remorhaz"];
const DESERT_KEYWORDS = ["sand", "desert", "red dragon", "brass", "blue dragon", "scorpion", "salamander"];
const WATER_KEYWORDS = ["sea", "aquatic", "octopus", "shark", "crocodile", "merfolk", "sahuagin", "reef", "kraken", "hydra"];

export function monsterTerrains(monster: ApiMonster): TerrainType[] {
  const type = monster.type?.toLowerCase() ?? "";
  const terrains = new Set<TerrainType>(
    TYPE_TERRAINS[type] ?? ["forest", "plains", "mountain"]
  );

  const speed = monster.speed ?? {};
  // A creature that swims but cannot walk lives only in water.
  if ("swim" in speed && !("walk" in speed)) return ["water"];
  if ("swim" in speed) terrains.add("water");

  const name = `${monster.name} ${monster.index}`.toLowerCase();
  if (SNOW_KEYWORDS.some((k) => name.includes(k))) terrains.add("snow");
  if (DESERT_KEYWORDS.some((k) => name.includes(k))) terrains.add("desert");
  if (WATER_KEYWORDS.some((k) => name.includes(k))) terrains.add("water");

  return [...terrains];
}

export function toCreature(monster: ApiMonster): Creature {
  const cr = monster.challenge_rating ?? 0;
  return {
    index: monster.index,
    name: monster.name,
    size: monster.size,
    type: monster.type,
    challengeRating: cr,
    xp: monster.xp ?? 0,
    hitPoints: monster.hit_points ?? 0,
    armorClass: monster.armor_class?.[0]?.value ?? 10,
    combatPoints: monster.xp ?? 0,
    tier: crToTier(cr),
    terrains: monsterTerrains(monster),
    imageUrl: monster.image ? `${API_BASE}${monster.image}` : null,
  };
}

function randInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function sampleDistinct(pool: Creature[], n: number): Creature[] {
  const copy = [...pool];
  const out: Creature[] = [];
  for (let i = 0; i < n && copy.length > 0; i++) {
    out.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0]);
  }
  return out;
}

// Weighted random number of creature types, capped at the pool size.
function pickTypeCount(maxTypes: number): number {
  const roll = Math.random();
  let cumulative = 0;
  for (const { types, weight } of TYPE_COUNT_WEIGHTS) {
    cumulative += weight;
    if (roll < cumulative) return Math.min(types, maxTypes);
  }
  return Math.min(MAX_TYPES, maxTypes);
}

function summarize(
  groups: EncounterGroup[],
  minXP: number,
  maxXP: number
): GeneratedEncounter {
  const totalCreatures = groups.reduce((sum, g) => sum + g.count, 0);
  const totalCombatPoints = groups.reduce(
    (sum, g) => sum + g.count * g.creature.combatPoints,
    0
  );
  return {
    groups,
    totalCreatures,
    totalCombatPoints,
    withinBudget: totalCombatPoints >= minXP && totalCombatPoints <= maxXP,
  };
}

// Builds an encounter from the candidate pool: 1-3 creature types, at least 2
// creatures total, with combined combat points landing inside the tier's XP
// range. Tries many random combinations and keeps the closest fit.
export function composeEncounter(
  pool: Creature[],
  tier: ChallengeTier
): GeneratedEncounter | null {
  if (pool.length === 0) return null;
  const [minXP, maxXP] = TIER_XP_RANGE[tier];
  // The type count is chosen once so the returned encounter follows the
  // weighting, rather than the first composition that happens to fit budget.
  const typeCount = pickTypeCount(Math.min(MAX_TYPES, pool.length));

  let best: GeneratedEncounter | null = null;
  let bestDistance = Infinity;

  for (let attempt = 0; attempt < COMPOSE_ATTEMPTS; attempt++) {
    const creatures = sampleDistinct(pool, typeCount);
    const counts = creatures.map(() => 1);
    let total = counts.length;

    // Distribute extra creatures at random without exceeding the cap.
    for (let extras = randInt(0, MAX_CREATURES - total); extras > 0; extras--) {
      counts[Math.floor(Math.random() * counts.length)]++;
      total++;
    }
    // Guarantee the encounter holds at least MIN_CREATURES creatures.
    while (total < MIN_CREATURES) {
      counts[0]++;
      total++;
    }

    const groups: EncounterGroup[] = creatures.map((creature, i) => ({
      creature,
      count: counts[i],
    }));
    const encounter = summarize(groups, minXP, maxXP);
    if (encounter.withinBudget) return encounter;

    const distance =
      encounter.totalCombatPoints < minXP
        ? minXP - encounter.totalCombatPoints
        : encounter.totalCombatPoints - maxXP;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = encounter;
    }
  }
  return best;
}
