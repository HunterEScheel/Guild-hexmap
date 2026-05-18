import { useState } from "react";
import {
  TERRAIN_COLORS,
  TERRAIN_LABELS,
  QUEST_LEVEL_COLORS,
  QUEST_LEVEL_LABELS,
} from "../utils/colors";
import type { TerrainType, QuestLevel } from "../types";

const TERRAIN_TYPES: TerrainType[] = [
  "forest",
  "plains",
  "mountain",
  "swamp",
  "desert",
  "snow",
  "water",
  "allied_city",
  "unallied_city",
  "unknown",
];

const QUEST_LEVELS: QuestLevel[] = [
  "explore",
  "recurring",
  "wolf",
  "demon",
  "dragon",
  "terrasque",
  "god",
];

export function Legend() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      style={{
        position: "fixed",
        bottom: 16,
        right: 340,
        zIndex: 100,
      }}
    >
      {isOpen ? (
        <div
          style={{
            background: "#1e1e36",
            border: "1px solid #2e2e4a",
            borderRadius: 8,
            padding: 12,
            minWidth: 180,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 10,
            }}
          >
            <span style={{ color: "#e8e8f0", fontSize: 13, fontWeight: 600 }}>
              Legend
            </span>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: "transparent",
                border: "none",
                color: "#6b7280",
                cursor: "pointer",
                fontSize: 16,
                padding: 0,
                lineHeight: 1,
              }}
            >
              x
            </button>
          </div>

          <div style={{ marginBottom: 10 }}>
            <span style={{ color: "#9ca3af", fontSize: 11, display: "block", marginBottom: 4 }}>
              Terrain
            </span>
            {TERRAIN_TYPES.map((t) => (
              <div
                key={t}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  marginBottom: 3,
                }}
              >
                <div
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 2,
                    background: TERRAIN_COLORS[t],
                  }}
                />
                <span style={{ color: "#d1d5db", fontSize: 12 }}>
                  {TERRAIN_LABELS[t]}
                </span>
              </div>
            ))}
          </div>

          <div>
            <span style={{ color: "#9ca3af", fontSize: 11, display: "block", marginBottom: 4 }}>
              Quest Level
            </span>
            {QUEST_LEVELS.map((l) => (
              <div
                key={l}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  marginBottom: 3,
                }}
              >
                <div
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 2,
                    background: QUEST_LEVEL_COLORS[l],
                  }}
                />
                <span style={{ color: "#d1d5db", fontSize: 12 }}>
                  {QUEST_LEVEL_LABELS[l]}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            background: "#1e1e36",
            border: "1px solid #2e2e4a",
            borderRadius: 6,
            padding: "6px 12px",
            color: "#9ca3af",
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          Legend
        </button>
      )}
    </div>
  );
}
