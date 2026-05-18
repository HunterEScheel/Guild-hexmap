import { useState } from "react";
import { TERRAIN_COLORS, TERRAIN_LABELS } from "../utils/colors";
import { QuestCard } from "./QuestCard";
import { TIER_LABELS } from "../data/encounters";
import type { Encounter } from "../data/encounters";
import { getRandomEncounter } from "../hooks/useFirebase";
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
  const [encounter, setEncounter] = useState<Encounter | null>(null);
  const terrain = hexData?.terrain ?? "unknown";
  const challengeTier = hexData?.challengeTier ?? null;
  const canHaveEncounters = terrain !== "allied_city" && terrain !== "unknown";
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

          {/* Challenge Tier */}
          {canHaveEncounters && (
            <div style={{ marginBottom: 16 }}>
              <h3 style={{ margin: "0 0 8px", fontSize: 14, color: "#9ca3af" }}>
                Challenge Tier
              </h3>
              {challengeTier ? (
                <span style={{ fontSize: 13, color: "#d1d5db" }}>
                  {TIER_LABELS[challengeTier]}
                </span>
              ) : (
                <span style={{ fontSize: 12, color: "#6b7280" }}>
                  Not assigned
                </span>
              )}

              {/* Random Encounter Button */}
              {isAdmin && challengeTier && (
                <button
                  onClick={async () => {
                    const result = await getRandomEncounter(terrain, challengeTier);
                    setEncounter(result);
                  }}
                  style={{
                    display: "block",
                    marginTop: 8,
                    width: "100%",
                    background: "#f97316",
                    color: "#000",
                    border: "none",
                    borderRadius: 4,
                    padding: "6px 12px",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "'Cinzel', serif",
                    letterSpacing: "0.5px",
                  }}
                >
                  Random Encounter
                </button>
              )}

              {/* Encounter Result */}
              {encounter && (
                <div
                  style={{
                    marginTop: 10,
                    background: "#1e1e36",
                    borderRadius: 8,
                    padding: 12,
                    borderLeft: "4px solid #f97316",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: 6,
                    }}
                  >
                    <div>
                      <h4 style={{ margin: 0, color: "#f97316", fontSize: 14 }}>
                        {encounter.name}
                      </h4>
                      <span
                        style={{
                          fontSize: 10,
                          color: encounter.isCombat ? "#ef4444" : "#4ade80",
                          textTransform: "uppercase",
                          fontWeight: 600,
                        }}
                      >
                        {encounter.isCombat ? "Combat" : "Non-Combat"}
                      </span>
                    </div>
                    <button
                      onClick={() => setEncounter(null)}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "#6b7280",
                        cursor: "pointer",
                        fontSize: 14,
                        padding: 0,
                        lineHeight: 1,
                      }}
                    >
                      ✕
                    </button>
                  </div>
                  <p style={{ color: "#9ca3af", fontSize: 13, marginBottom: 6 }}>
                    {encounter.description}
                  </p>
                  <p style={{ color: "#fbbf24", fontSize: 12 }}>
                    Creatures: {encounter.creatures}
                  </p>
                </div>
              )}
            </div>
          )}

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
