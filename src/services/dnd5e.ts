import type { ChallengeTier, TerrainType } from "../types";
import type { Creature, GeneratedEncounter } from "../data/bestiary";
import { composeEncounter, crToTier, TIER_XP_RANGE } from "../data/bestiary";
import { supabase } from "../supabase";

// Builds a random encounter by querying the bestiary table for creatures
// that match the hex terrain and fit within the tier's XP budget.
export async function generateEncounter(
  terrain: TerrainType,
  tier: ChallengeTier
): Promise<GeneratedEncounter | null> {
  const maxXP = TIER_XP_RANGE[tier][1];

  // Fetch creatures from the bestiary where the terrain array contains
  // this terrain and xp is within budget. Supabase's `cs` operator checks
  // if the array column contains the given array.
  const { data, error } = await supabase
    .from("bestiary")
    .select("*")
    .contains("terrains", [terrain])
    .lte("xp", maxXP)
    .gt("xp", 0);

  if (error) {
    console.error("Bestiary fetch error:", error);
    return null;
  }

  if (!data || data.length === 0) return null;

  const pool: Creature[] = data.map((row) => ({
    index: row.index,
    name: row.name,
    size: row.size,
    type: row.type,
    challengeRating: Number(row.cr),
    xp: row.xp,
    hitPoints: row.hp,
    armorClass: row.ac,
    combatPoints: row.xp,
    tier: crToTier(Number(row.cr)),
    terrains: row.terrains as TerrainType[],
    imageUrl: null,
  }));

  return composeEncounter(pool, tier);
}
