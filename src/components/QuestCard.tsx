import { useState } from "react";
import { QUEST_LEVEL_COLORS, QUEST_LEVEL_LABELS } from "../utils/colors";
import type { Quest } from "../types";

interface QuestCardProps {
  quest: Quest;
  playerName: string | null;
  isAdmin: boolean;
  onJoin: (questId: string) => void;
  onLeave: (questId: string) => void;
  onEdit: (quest: Quest) => void;
  onDelete: (questId: string) => void;
  /**
   * Optional content rendered inside the expanded section, below the party
   * list. ActiveQuests uses this to inject the QuestFindings panel for
   * completed quests.
   */
  expandedExtras?: React.ReactNode;
  /** Force-open the card on first render (e.g. for completed quests). */
  defaultExpanded?: boolean;
  /**
   * When true, only title / difficulty / status are visible until expanded.
   * Description, reward, adventurer count, party, schedule, and action
   * buttons all move into the expanded section. Used by the SidePanel.
   */
  compact?: boolean;
}

const STATUS_LABELS: Record<string, string> = {
  available: "Available",
  in_progress: "In Progress",
  completed: "Completed",
};

export function QuestCard({
  quest,
  playerName,
  isAdmin,
  onJoin,
  onLeave,
  onEdit,
  onDelete,
  expandedExtras,
  defaultExpanded = false,
  compact = false,
}: QuestCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const levelColor = QUEST_LEVEL_COLORS[quest.level];
  const hasJoined = playerName ? quest.players.includes(playerName) : false;
  const canJoin = !hasJoined && quest.status !== "completed";
  const showDetails = !compact || expanded;

  return (
    <div
      style={{
        background: "#1e1e36",
        borderRadius: 8,
        padding: 12,
        marginBottom: 8,
        borderLeft: `4px solid ${levelColor}`,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 6,
        }}
      >
        <h4 style={{ margin: 0, color: "#e8e8f0", fontSize: 14 }}>
          {quest.title}
        </h4>
        <span
          style={{
            fontSize: 11,
            padding: "2px 8px",
            borderRadius: 10,
            background: levelColor,
            color: "#000",
            fontWeight: 600,
          }}
        >
          {QUEST_LEVEL_LABELS[quest.level]}
        </span>
      </div>

      {showDetails && (
        <>
          <p style={{ color: "#9ca3af", fontSize: 13, marginBottom: 6 }}>
            {quest.description}
          </p>

          {quest.reward && (
            <p style={{ color: "#fbbf24", fontSize: 12, marginBottom: 6 }}>
              Reward: {quest.reward}
            </p>
          )}
        </>
      )}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 6,
        }}
      >
        <span
          style={{
            fontSize: 11,
            color:
              quest.status === "completed"
                ? "#4ade80"
                : quest.status === "in_progress"
                  ? "#facc15"
                  : "#60a5fa",
          }}
        >
          {STATUS_LABELS[quest.status]}
        </span>
        {showDetails && (
          <span style={{ fontSize: 11, color: "#6b7280" }}>
            {quest.players.length} adventurer
            {quest.players.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Expanded details: schedule, party, extras (findings) */}
      {expanded && (
        <div
          style={{
            borderTop: "1px solid #2e2e4a",
            paddingTop: 8,
            marginTop: 4,
            marginBottom: 8,
          }}
        >
          {quest.scheduledDate && (
            <div style={{ marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: "#6b7280" }}>Scheduled: </span>
              <span style={{ fontSize: 12, color: "#60a5fa" }}>
                {new Date(quest.scheduledDate + "T00:00:00").toLocaleDateString(
                  undefined,
                  { weekday: "short", month: "short", day: "numeric" }
                )}
              </span>
            </div>
          )}

          <div style={{ marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: "#6b7280" }}>Party: </span>
            <span style={{ fontSize: 12, color: "#d1d5db" }}>
              {quest.players.length > 0 ? quest.players.join(", ") : "—"}
            </span>
          </div>

          {expandedExtras}
        </div>
      )}

      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <button
          onClick={() => setExpanded((v) => !v)}
          style={{
            background: "transparent",
            color: "#9ca3af",
            border: "1px solid #2e2e4a",
            borderRadius: 4,
            padding: "4px 10px",
            fontSize: 12,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <span style={{ fontSize: 10 }}>{expanded ? "▴" : "▾"}</span>
          {expanded ? "Hide details" : "Details"}
        </button>

        {showDetails && (
          <>
            {canJoin && (
              <button
                onClick={() => onJoin(quest.id)}
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
                Join
              </button>
            )}
            {hasJoined && quest.status !== "completed" && (
              <button
                onClick={() => onLeave(quest.id)}
                style={{
                  background: "#ef4444",
                  color: "#fff",
                  border: "none",
                  borderRadius: 4,
                  padding: "4px 12px",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Leave
              </button>
            )}
            {isAdmin && (
              <>
                <button
                  onClick={() => onEdit(quest)}
                  style={{
                    background: "#6366f1",
                    color: "#fff",
                    border: "none",
                    borderRadius: 4,
                    padding: "4px 12px",
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  Edit
                </button>
                <button
                  onClick={() => onDelete(quest.id)}
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
                  Delete
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
