export type TerrainType =
  | "forest"
  | "plains"
  | "mountain"
  | "swamp"
  | "desert"
  | "snow"
  | "water"
  | "allied_city"
  | "unallied_city"
  | "unknown";

export type QuestLevel =
  | "explore"
  | "recurring"
  | "wolf"
  | "demon"
  | "dragon"
  | "terrasque"
  | "god";

export type QuestStatus = "available" | "in_progress" | "completed";

export type ChallengeTier = 0 | 1 | 2 | 3 | 4;

export type Landmark = "dungeon" | "village" | "ruins" | "tower";

export interface HexData {
  col: number;
  row: number;
  terrain: TerrainType;
  challengeTier: ChallengeTier | null;
  landmark: Landmark | null;
}

export interface InitiativeEntry {
  id: string;
  name: string;
  initiative: number;
  isCreature: boolean;
  hp: number | null;
  maxHp: number | null;
  ac: number | null;
  cr: number | null;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  reward: string;
  level: QuestLevel;
  status: QuestStatus;
  hexCol: number;
  hexRow: number;
  endHexCol: number | null;
  endHexRow: number | null;
  players: string[];
  scheduledDate: string | null;
}

export interface QuestFinding {
  id: string;
  questId: string;
  author: string;
  hexCol: number;
  hexRow: number;
  description: string;
  createdAt: string;
}

/**
 * AI-generated quest suggestion derived from a player report.
 * Lightweight version of Quest — admin reviews/edits before persisting.
 */
export interface QuestSuggestion {
  title: string;
  description: string;
  reward: string;
  level: QuestLevel;
  hexCol: number;
  hexRow: number;
  endHexCol: number | null;
  endHexRow: number | null;
  rationale: string;
}
