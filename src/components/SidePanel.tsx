import { TERRAIN_COLORS, TERRAIN_LABELS } from "../utils/colors";
import { QuestCard } from "./QuestCard";
import type { HexData, Quest } from "../types";

interface SidePanelProps {
  selectedHex: { col: number; row: number } | null;
  hexData: HexData | undefined;
  quests: Quest[];
  playerName: string | null;
  isAdmin: boolean;
  onJoinQuest: (questId: string) => void;
  onLeaveQuest: (questId: string) => void;
  onEditQuest: (quest: Quest) => void;
  onDeleteQuest: (questId: string) => void;
  onAddQuest: () => void;
}

export function SidePanel({
  selectedHex,
  hexData,
  quests,
  playerName,
  isAdmin,
  onJoinQuest,
  onLeaveQuest,
  onEditQuest,
  onDeleteQuest,
  onAddQuest,
}: SidePanelProps) {
  const terrain = hexData?.terrain ?? "unknown";
  const hexQuests = selectedHex
    ? quests.filter(
        (q) => q.hexCol === selectedHex.col && q.hexRow === selectedHex.row
      )
    : [];

  return (
    <div
      style={{
        width: 320,
        height: "100%",
        background: "#12121f",
        borderLeft: "1px solid #2e2e4a",
        padding: 16,
        overflowY: "auto",
        color: "#e8e8f0",
        fontFamily: "'Segoe UI', sans-serif",
      }}
    >
      {!selectedHex ? (
        <div
          style={{
            textAlign: "center",
            marginTop: 40,
            color: "#6b7280",
          }}
        >
          <p style={{ fontSize: 14 }}>Click a hex to view details</p>
          <p style={{ fontSize: 12, marginTop: 8 }}>
            Shift+drag or middle-click to pan
          </p>
          <p style={{ fontSize: 12 }}>Scroll to zoom</p>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ margin: "0 0 8px", fontSize: 16, color: "#e8e8f0" }}>
              Hex ({selectedHex.col}, {selectedHex.row})
            </h3>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <div
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 3,
                  background: TERRAIN_COLORS[terrain],
                }}
              />
              <span style={{ fontSize: 14 }}>{TERRAIN_LABELS[terrain]}</span>
            </div>
          </div>

          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 10,
              }}
            >
              <h3 style={{ margin: 0, fontSize: 14, color: "#9ca3af" }}>
                Quests ({hexQuests.length})
              </h3>
              {isAdmin && (
                <button
                  onClick={onAddQuest}
                  style={{
                    background: "#4ade80",
                    color: "#000",
                    border: "none",
                    borderRadius: 4,
                    padding: "4px 12px",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  + Add Quest
                </button>
              )}
            </div>

            {hexQuests.length === 0 ? (
              <p style={{ color: "#6b7280", fontSize: 13 }}>
                No quests on this hex.
              </p>
            ) : (
              hexQuests.map((quest) => (
                <QuestCard
                  key={quest.id}
                  quest={quest}
                  playerName={playerName}
                  isAdmin={isAdmin}
                  onJoin={onJoinQuest}
                  onLeave={onLeaveQuest}
                  onEdit={onEditQuest}
                  onDelete={onDeleteQuest}
                />
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
