import { TERRAIN_COLORS, TERRAIN_LABELS } from "../utils/colors";
import type { ChallengeTier, TerrainType } from "../types";

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
];

const TIER_CONFIG: { tier: ChallengeTier; label: string; color: string }[] = [
  { tier: 0, label: "T0 (Cleared)", color: "#9ca3af" },
  { tier: 1, label: "T1 (1-5)", color: "#4ade80" },
  { tier: 2, label: "T2 (6-10)", color: "#facc15" },
  { tier: 3, label: "T3 (11-15)", color: "#f97316" },
  { tier: 4, label: "T4 (16-20)", color: "#ef4444" },
];

interface AdminToolbarProps {
  selectedTerrain: TerrainType | null;
  onSelectTerrain: (terrain: TerrainType | null) => void;
  selectedTier: ChallengeTier | null;
  onSelectTier: (tier: ChallengeTier | null) => void;
  onLogout: () => void;
}

export function AdminToolbar({
  selectedTerrain,
  onSelectTerrain,
  selectedTier,
  onSelectTier,
  onLogout,
}: AdminToolbarProps) {
  const isErasing = selectedTerrain === "unknown";
  const paintingLabel = isErasing
    ? "Erasing"
    : selectedTerrain
      ? `Painting: ${TERRAIN_LABELS[selectedTerrain]}`
      : selectedTier != null
        ? `Painting: Tier ${selectedTier}`
        : null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 16px",
        background: "#1e1e36",
        borderBottom: "1px solid #2e2e4a",
        flexWrap: "wrap",
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
          onClick={() => {
            onSelectTier(null);
            onSelectTerrain(selectedTerrain === t ? null : t);
          }}
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

      <button
        onClick={() => {
          onSelectTier(null);
          onSelectTerrain(isErasing ? null : "unknown");
        }}
        title="Erase tile (removes terrain and tier, keeps quests)"
        style={{
          height: 28,
          borderRadius: 4,
          border: isErasing ? "2px solid #fff" : "2px solid #4b5563",
          background: "#1e1e36",
          color: "#e8e8f0",
          cursor: "pointer",
          outline: "none",
          fontSize: 11,
          fontWeight: 700,
          padding: "0 10px",
          display: "flex",
          alignItems: "center",
          gap: 4,
          marginLeft: 4,
        }}
      >
        <span style={{ fontSize: 14, lineHeight: 1 }}>&#10006;</span>
        Erase
      </button>

      <div
        style={{
          width: 1,
          height: 20,
          background: "#2e2e4a",
          margin: "0 4px",
        }}
      />

      <span style={{ color: "#6b7280", fontSize: 12, marginRight: 4 }}>
        Tier:
      </span>
      {TIER_CONFIG.map(({ tier, label, color }) => (
        <button
          key={tier}
          onClick={() => {
            onSelectTerrain(null);
            onSelectTier(selectedTier === tier ? null : tier);
          }}
          title={label}
          style={{
            height: 28,
            borderRadius: 4,
            border:
              selectedTier === tier
                ? "2px solid #fff"
                : "2px solid transparent",
            background: color,
            color: "#000",
            cursor: "pointer",
            outline: "none",
            fontSize: 11,
            fontWeight: 700,
            padding: "0 8px",
          }}
        >
          T{tier}
        </button>
      ))}

      <div style={{ flex: 1 }} />
      {paintingLabel && (
        <span style={{ color: "#e8e8f0", fontSize: 12 }}>
          {paintingLabel}
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
