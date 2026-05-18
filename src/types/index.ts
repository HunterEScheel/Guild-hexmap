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

export type ChallengeTier = 1 | 2 | 3 | 4;

export interface HexData {
  col: number;
  row: number;
  terrain: TerrainType;
  challengeTier: ChallengeTier | null;
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
  players: string[];
}
