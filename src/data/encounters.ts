import type { ChallengeTier } from "../types";

export interface Encounter {
  id: string;
  terrain: string;
  tier: number;
  name: string;
  description: string;
  creatures: string;
  isCombat: boolean;
}

export const TIER_LABELS: Record<ChallengeTier, string> = {
  1: "Tier 1 (Lvl 1-5)",
  2: "Tier 2 (Lvl 6-10)",
  3: "Tier 3 (Lvl 11-15)",
  4: "Tier 4 (Lvl 16-20)",
};
