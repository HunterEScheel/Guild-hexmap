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

export interface HexData {
  col: number;
  row: number;
  terrain: TerrainType;
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
