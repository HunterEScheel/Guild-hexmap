// Mirrors web/src/types/index.ts (InitiativeEntry, Character) and
// web/src/services/dnd5e.ts (CreatureSearchResult) — keep in sync manually.

export interface InitiativeEntry {
  id: string;
  name: string;
  initiative: number;
  isCreature: boolean;
  hp: number | null;
  maxHp: number | null;
  ac: number | null;
  cr: number | null;
  /** GM-entered stats for custom creatures (details jsonb column). */
  details: CreatureDetails | null;
}

export interface Character {
  playerName: string;
  hitPoints: number | null;
  armorClass: number | null;
  gold: number;
}

export interface AttackInfo {
  name: string;
  /** e.g. "+3" — null when the action has no attack roll. */
  toHit: number | null;
  /** e.g. "1d6+1 Piercing" — null when not parseable. */
  damage: string | null;
  desc: string;
}

export interface CreatureDetails {
  attacks: AttackInfo[];
  vulnerabilities: string;
  resistances: string;
  immunities: string;
  conditionImmunities: string;
}

export interface CreatureSearchResult {
  index: string;
  name: string;
  size: string;
  type: string;
  challengeRating: number;
  hitPoints: number;
  armorClass: number;
}
