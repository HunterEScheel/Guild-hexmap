import type { ChallengeTier, TerrainType } from "../types";
import type { ApiMonster, Creature, GeneratedEncounter } from "../data/bestiary";
import { toCreature, composeEncounter, TIER_XP_RANGE } from "../data/bestiary";

const API_BASE = "https://www.dnd5eapi.co/api/2014";
const STORE_PREFIX = "dnd5e_monster_";
const BATCH_SIZE = 12;
// Candidate creatures to gather before composing an encounter. Caps how many
// monster stat blocks are fetched while still giving the composer variety.
const POOL_TARGET = 30;

interface MonsterRef {
  index: string;
  name: string;
}

let monsterListCache: MonsterRef[] | null = null;
const monsterCache = new Map<string, ApiMonster>();

async function fetchMonsterList(): Promise<MonsterRef[]> {
  if (monsterListCache) return monsterListCache;
  const res = await fetch(`${API_BASE}/monsters`);
  if (!res.ok) throw new Error(`Monster list fetch failed: ${res.status}`);
  const data = (await res.json()) as { results: MonsterRef[] };
  monsterListCache = data.results;
  return monsterListCache;
}

async function fetchMonster(index: string): Promise<ApiMonster | null> {
  const cached = monsterCache.get(index);
  if (cached) return cached;

  const stored = localStorage.getItem(STORE_PREFIX + index);
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as ApiMonster;
      monsterCache.set(index, parsed);
      return parsed;
    } catch {
      localStorage.removeItem(STORE_PREFIX + index);
    }
  }

  const res = await fetch(`${API_BASE}/monsters/${index}`);
  if (!res.ok) return null;
  const monster = (await res.json()) as ApiMonster;
  monsterCache.set(index, monster);
  try {
    localStorage.setItem(STORE_PREFIX + index, JSON.stringify(monster));
  } catch {
    // localStorage full — memory cache still serves this session.
  }
  return monster;
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Builds a random encounter on the fly: scans the SRD monster list in random
// order, gathering a pool of creatures that match the hex terrain and are
// cheap enough for the tier, then composes a multi-creature encounter from it.
export async function generateEncounter(
  terrain: TerrainType,
  tier: ChallengeTier
): Promise<GeneratedEncounter | null> {
  const maxXP = TIER_XP_RANGE[tier][1];
  const list = shuffle(await fetchMonsterList());
  const pool: Creature[] = [];

  for (let i = 0; i < list.length && pool.length < POOL_TARGET; i += BATCH_SIZE) {
    const batch = list.slice(i, i + BATCH_SIZE);
    const monsters = await Promise.all(batch.map((m) => fetchMonster(m.index)));
    for (const monster of monsters) {
      if (!monster) continue;
      const creature = toCreature(monster);
      if (creature.combatPoints <= 0) continue;
      if (creature.combatPoints > maxXP) continue;
      if (!creature.terrains.includes(terrain)) continue;
      pool.push(creature);
    }
  }

  return composeEncounter(pool, tier);
}
