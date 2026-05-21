import { useState } from "react";
import {
  createQuestFinding,
  deleteQuestFinding,
  generateQuestsFromQuest,
  createQuest,
} from "../hooks/useFirebase";
import { QUEST_LEVEL_LABELS, QUEST_LEVEL_COLORS } from "../utils/colors";
import type {
  HexData,
  Quest,
  QuestFinding,
  QuestSuggestion,
} from "../types";

interface QuestFindingsProps {
  quest: Quest;
  findings: QuestFinding[];
  hexes: Map<string, HexData>;
  allQuests: Quest[];
  playerName: string | null;
  isAdmin: boolean;
  /** Called when the player has no name set and tries to submit. */
  onSetPlayerName: () => void;
}

/**
 * Findings panel for a single completed quest.
 *
 * - Anyone can read the findings.
 * - Party members (and admins) can add new findings to a completed quest.
 * - The author of a finding and any admin can delete it.
 * - Admins can hand the completed quest + its findings to OpenAI via the
 *   "Generate Quests" button.
 */
export function QuestFindings({
  quest,
  findings,
  hexes,
  allQuests,
  playerName,
  isAdmin,
  onSetPlayerName,
}: QuestFindingsProps) {
  const isPartyMember = playerName != null && quest.players.includes(playerName);
  const canAdd = isPartyMember || isAdmin;

  const [hexCol, setHexCol] = useState("");
  const [hexRow, setHexRow] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<QuestSuggestion[] | null>(null);

  async function handleAdd() {
    if (!playerName) {
      onSetPlayerName();
      return;
    }
    if (!description.trim()) return;
    const col = Number(hexCol);
    const row = Number(hexRow);
    if (!Number.isFinite(col) || !Number.isFinite(row)) {
      setError("Col and row must be numbers");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await createQuestFinding(quest.id, playerName, col, row, description);
      setHexCol("");
      setHexRow("");
      setDescription("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add finding");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGenerate() {
    setGenerating(true);
    setGenError(null);
    setSuggestions(null);
    try {
      const result = await generateQuestsFromQuest(
        quest.id,
        hexes,
        allQuests,
        findings
      );
      setSuggestions(result);
    } catch (err) {
      setGenError(err instanceof Error ? err.message : "Failed to generate");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div
      style={{
        marginTop: 8,
        padding: "10px 14px",
        background: "#12121f",
        border: "1px solid #2e2e4a",
        borderRadius: 6,
        marginLeft: 16,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <span
          style={{
            fontSize: 11,
            color: "#9ca3af",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            fontWeight: 600,
          }}
        >
          Findings ({findings.length})
        </span>
        {isAdmin && findings.length > 0 && (
          <button
            disabled={generating}
            onClick={handleGenerate}
            style={{
              background: generating ? "#3730a3" : "#6366f1",
              color: "#fff",
              border: "none",
              borderRadius: 4,
              padding: "4px 10px",
              fontSize: 12,
              fontWeight: 600,
              cursor: generating ? "wait" : "pointer",
            }}
          >
            {generating ? "Generating..." : "Generate Quests"}
          </button>
        )}
      </div>

      {/* Existing findings list */}
      {findings.length === 0 ? (
        <p style={{ color: "#6b7280", fontSize: 12, margin: "4px 0" }}>
          No findings yet.
        </p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: "4px 0" }}>
          {findings.map((f) => {
            const canDelete = isAdmin || f.author === playerName;
            return (
              <li
                key={f.id}
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 6,
                  margin: "3px 0",
                  fontSize: 13,
                  color: "#d1d5db",
                  lineHeight: 1.4,
                }}
              >
                <span
                  style={{
                    color: "#a78bfa",
                    fontFamily:
                      "ui-monospace, SFMono-Regular, Menlo, monospace",
                    fontSize: 12,
                  }}
                >
                  ({f.hexCol}, {f.hexRow})
                </span>
                <span style={{ flex: 1 }}>
                  {f.description}
                  <span style={{ color: "#6b7280", fontSize: 11, marginLeft: 6 }}>
                    — {f.author}
                  </span>
                </span>
                {canDelete && (
                  <button
                    onClick={() => {
                      if (confirm("Delete this finding?")) {
                        deleteQuestFinding(f.id);
                      }
                    }}
                    title="Delete finding"
                    style={{
                      background: "transparent",
                      color: "#6b7280",
                      border: "1px solid #2e2e4a",
                      borderRadius: 3,
                      padding: "1px 6px",
                      fontSize: 11,
                      cursor: "pointer",
                    }}
                  >
                    ✕
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* Add-finding form */}
      {canAdd && (
        <div
          style={{
            marginTop: 8,
            display: "flex",
            gap: 6,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <input
            type="number"
            value={hexCol}
            onChange={(e) => setHexCol(e.target.value)}
            placeholder="col"
            style={{ ...inputStyle, width: 60 }}
          />
          <input
            type="number"
            value={hexRow}
            onChange={(e) => setHexRow(e.target.value)}
            placeholder="row"
            style={{ ...inputStyle, width: 60 }}
          />
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd();
            }}
            placeholder="What did you find here?"
            style={{ ...inputStyle, flex: 1, minWidth: 140 }}
          />
          <button
            disabled={submitting || !description.trim()}
            onClick={handleAdd}
            style={{
              background: submitting ? "#166534" : "#4ade80",
              color: "#000",
              border: "none",
              borderRadius: 4,
              padding: "5px 12px",
              fontSize: 12,
              fontWeight: 600,
              cursor:
                submitting || !description.trim() ? "not-allowed" : "pointer",
              opacity: submitting || !description.trim() ? 0.6 : 1,
            }}
          >
            Add
          </button>
        </div>
      )}
      {error && (
        <p style={{ color: "#ef4444", fontSize: 12, margin: "6px 0 0" }}>{error}</p>
      )}

      {/* AI suggestions */}
      {(suggestions || genError) && (
        <SuggestionsPanel
          suggestions={suggestions}
          error={genError}
          onDismiss={() => {
            setSuggestions(null);
            setGenError(null);
          }}
        />
      )}
    </div>
  );
}

function SuggestionsPanel({
  suggestions,
  error,
  onDismiss,
}: {
  suggestions: QuestSuggestion[] | null;
  error: string | null;
  onDismiss: () => void;
}) {
  const [creating, setCreating] = useState<number | null>(null);
  const [created, setCreated] = useState<Set<number>>(new Set());

  async function handleCreate(i: number, s: QuestSuggestion) {
    setCreating(i);
    try {
      await createQuest({
        title: s.title,
        description: s.description,
        reward: s.reward,
        level: s.level,
        status: "available",
        hexCol: s.hexCol,
        hexRow: s.hexRow,
        endHexCol: s.endHexCol,
        endHexRow: s.endHexRow,
        players: [],
        scheduledDate: null,
      });
      setCreated((prev) => new Set(prev).add(i));
    } finally {
      setCreating(null);
    }
  }

  return (
    <div
      style={{
        marginTop: 10,
        background: "#1a2332",
        border: "1px solid #3730a3",
        borderRadius: 6,
        padding: 10,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <span
          style={{
            fontFamily: "'Cinzel', serif",
            fontSize: 13,
            color: "#a78bfa",
            fontWeight: 600,
          }}
        >
          AI Quest Suggestions
        </span>
        <button
          onClick={onDismiss}
          style={{
            background: "transparent",
            border: "1px solid #2e2e4a",
            color: "#9ca3af",
            borderRadius: 4,
            padding: "2px 8px",
            fontSize: 11,
            cursor: "pointer",
          }}
        >
          Dismiss
        </button>
      </div>
      {error && (
        <p style={{ color: "#ef4444", fontSize: 12 }}>Error: {error}</p>
      )}
      {suggestions && suggestions.length === 0 && (
        <p style={{ color: "#9ca3af", fontSize: 12 }}>
          No new quests surfaced from these findings.
        </p>
      )}
      {suggestions && suggestions.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {suggestions.map((s, i) => (
            <div
              key={i}
              style={{
                background: "#12121f",
                border: "1px solid #2e2e4a",
                borderRadius: 6,
                padding: 10,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  marginBottom: 4,
                  flexWrap: "wrap",
                }}
              >
                <span
                  style={{
                    background: QUEST_LEVEL_COLORS[s.level],
                    color: "#000",
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "1px 6px",
                    borderRadius: 3,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  {QUEST_LEVEL_LABELS[s.level]}
                </span>
                <strong style={{ color: "#e8e8f0", fontSize: 13 }}>
                  {s.title}
                </strong>
                <span style={{ color: "#9ca3af", fontSize: 11 }}>
                  @ ({s.hexCol}, {s.hexRow})
                  {s.endHexCol != null && s.endHexRow != null
                    ? ` → (${s.endHexCol}, ${s.endHexRow})`
                    : ""}
                </span>
              </div>
              <p
                style={{
                  color: "#d1d5db",
                  fontSize: 12,
                  margin: "2px 0",
                  lineHeight: 1.5,
                }}
              >
                {s.description}
              </p>
              {s.reward && (
                <p style={{ color: "#fbbf24", fontSize: 11, margin: "2px 0" }}>
                  Reward: {s.reward}
                </p>
              )}
              {s.rationale && (
                <p
                  style={{
                    color: "#6b7280",
                    fontSize: 10,
                    fontStyle: "italic",
                    margin: "2px 0",
                  }}
                >
                  {s.rationale}
                </p>
              )}
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button
                  disabled={creating === i || created.has(i)}
                  onClick={() => handleCreate(i, s)}
                  style={{
                    background: created.has(i) ? "#166534" : "#4ade80",
                    color: "#000",
                    border: "none",
                    borderRadius: 4,
                    padding: "3px 10px",
                    fontSize: 11,
                    fontWeight: 600,
                    cursor:
                      creating === i || created.has(i)
                        ? "not-allowed"
                        : "pointer",
                  }}
                >
                  {created.has(i)
                    ? "Added"
                    : creating === i
                      ? "Adding..."
                      : "Add as Quest"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const inputStyle = {
  background: "#0f0f1a",
  border: "1px solid #2e2e4a",
  borderRadius: 4,
  padding: "5px 8px",
  color: "#e8e8f0",
  fontSize: 12,
  outline: "none",
  boxSizing: "border-box" as const,
};
