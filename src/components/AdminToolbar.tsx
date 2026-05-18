import { TERRAIN_COLORS, TERRAIN_LABELS } from "../utils/colors";
import type { TerrainType } from "../types";

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

interface AdminToolbarProps {
  selectedTerrain: TerrainType | null;
  onSelectTerrain: (terrain: TerrainType | null) => void;
  onLogout: () => void;
}

export function AdminToolbar({
  selectedTerrain,
  onSelectTerrain,
  onLogout,
}: AdminToolbarProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 16px",
        background: "#1e1e36",
        borderBottom: "1px solid #2e2e4a",
      }}
    >
      <span
        style={{
          color: "#6366f1",
          fontWeight: 600,
          fontSize: 13,
          marginRight: 8,
        }}
      >
        ADMIN
      </span>
      <span style={{ color: "#6b7280", fontSize: 12, marginRight: 4 }}>
        Terrain:
      </span>
      {TERRAIN_TYPES.map((t) => (
        <button
          key={t}
          onClick={() => onSelectTerrain(selectedTerrain === t ? null : t)}
          title={TERRAIN_LABELS[t]}
          style={{
            width: 28,
            height: 28,
            borderRadius: 4,
            border:
              selectedTerrain === t
                ? "2px solid #fff"
                : "2px solid transparent",
            background: TERRAIN_COLORS[t],
            cursor: "pointer",
            outline: "none",
          }}
        />
      ))}
      <div style={{ flex: 1 }} />
      {selectedTerrain && (
        <span style={{ color: "#e8e8f0", fontSize: 12 }}>
          Painting: {TERRAIN_LABELS[selectedTerrain]}
        </span>
      )}
      <button
        onClick={onLogout}
        style={{
          background: "#7f1d1d",
          color: "#fff",
          border: "none",
          borderRadius: 4,
          padding: "4px 12px",
          fontSize: 12,
          cursor: "pointer",
        }}
      >
        Logout
      </button>
    </div>
  );
}
