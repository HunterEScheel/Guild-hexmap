import { useState } from "react";
import {
  createReport,
  deleteReport,
  generateQuestsFromReport,
  createQuest,
} from "../hooks/useFirebase";
import { QUEST_LEVEL_LABELS, QUEST_LEVEL_COLORS } from "../utils/colors";
import type {
  HexData,
  Quest,
  QuestSuggestion,
  Report,
  ReportFinding,
} from "../types";

interface DraftFinding {
  hexCol: string;
  hexRow: string;
  description: string;
}

const emptyFinding = (): DraftFinding => ({
  hexCol: "",
  hexRow: "",
  description: "",
});

function draftToFinding(d: DraftFinding): ReportFinding | null {
  const hexCol = Number(d.hexCol);
  const hexRow = Number(d.hexRow);
  if (!Number.isFinite(hexCol) || !Number.isFinite(hexRow)) return null;
  if (!d.description.trim()) return null;
  return { hexCol, hexRow, description: d.description.trim() };
}

interface ReportsProps {
  reports: Report[];
  hexes: Map<string, HexData>;
  quests: Quest[];
  playerName: string | null;
  isAdmin: boolean;
  onSetPlayerName: () => void;
}

export function Reports({
  reports,
  hexes,
  quests,
  playerName,
  isAdmin,
  onSetPlayerName,
}: ReportsProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [findings, setFindings] = useState<DraftFinding[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [generatingFor, setGeneratingFor] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<QuestSuggestion[] | null>(null);
  const [genError, setGenError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!playerName) {
      onSetPlayerName();
      return;
    }
    if (!content.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const cleanFindings = findings
        .map(draftToFinding)
        .filter((f): f is ReportFinding => f !== null);
      await createReport(playerName, title, content, cleanFindings);
      setTitle("");
      setContent("");
      setFindings([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  }

  function updateFinding(idx: number, patch: Partial<DraftFinding>) {
    setFindings((prev) =>
      prev.map((f, i) => (i === idx ? { ...f, ...patch } : f))
    );
  }
  function removeFinding(idx: number) {
    setFindings((prev) => prev.filter((_, i) => i !== idx));
  }
  function addFinding() {
    setFindings((prev) => [...prev, emptyFinding()]);
  }

  async function handleGenerate(reportId: string) {
    setGeneratingFor(reportId);
    setGenError(null);
    setSuggestions(null);
    try {
      const result = await generateQuestsFromReport(
        reportId,
        hexes,
        quests,
        reports
      );
      setSuggestions(result);
    } catch (err) {
      setGenError(err instanceof Error ? err.message : "Failed to generate");
    } finally {
      setGeneratingFor(null);
    }
  }

  return (
    <div
      style={{
        maxWidth: 760,
        margin: "0 auto",
        padding: "32px 24px",
        color: "#e8e8f0",
        fontFamily: "'Segoe UI', system-ui, sans-serif",
      }}
    >
      <h1
        style={{
          fontFamily: "'Cinzel', serif",
          fontSize: 28,
          marginBottom: 8,
          color: "#e8e8f0",
        }}
      >
        Field Reports
      </h1>
      <p style={{ color: "#9ca3af", fontSize: 13, marginBottom: 24 }}>
        Submit what happened on your last outing. Admins can convert reports
        into quests.
      </p>

      {/* Submit form */}
      <div
        style={{
          background: "#1e1e36",
          border: "1px solid #2e2e4a",
          borderRadius: 8,
          padding: 16,
          marginBottom: 28,
        }}
      >
        {!playerName ? (
          <div style={{ textAlign: "center" }}>
            <p style={{ color: "#9ca3af", fontSize: 13, marginBottom: 12 }}>
              Set a player name before submitting reports.
            </p>
            <button
              onClick={onSetPlayerName}
              style={{
                background: "#4ade80",
                color: "#000",
                border: "none",
                borderRadius: 6,
                padding: "8px 16px",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Set Player Name
            </button>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              <span
                style={{
                  fontSize: 12,
                  color: "#9ca3af",
                  alignSelf: "center",
                  whiteSpace: "nowrap",
                }}
              >
                {playerName}
              </span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Title (optional)"
                style={inputStyle}
              />
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What happened on your adventure? Who did you meet, what did you find, what's pulling at you?"
              rows={5}
              style={{ ...inputStyle, fontFamily: "inherit", resize: "vertical" }}
            />

            {/* Findings */}
            <div style={{ marginTop: 14 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 6,
                }}
              >
                <span style={{ fontSize: 12, color: "#9ca3af" }}>
                  Findings (locations where something happened)
                </span>
                <button
                  type="button"
                  onClick={addFinding}
                  style={{
                    background: "#1e1e36",
                    color: "#a78bfa",
                    border: "1px solid #2e2e4a",
                    borderRadius: 4,
                    padding: "3px 10px",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  + Add finding
                </button>
              </div>
              {findings.length === 0 && (
                <p style={{ color: "#6b7280", fontSize: 12, margin: "4px 0" }}>
                  Optional. Add one per location — the admin's AI uses these as
                  anchor points for new quests.
                </p>
              )}
              {findings.map((f, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    gap: 6,
                    marginTop: 6,
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <input
                    type="number"
                    value={f.hexCol}
                    onChange={(e) =>
                      updateFinding(i, { hexCol: e.target.value })
                    }
                    placeholder="col"
                    style={{ ...inputStyle, width: 70 }}
                  />
                  <input
                    type="number"
                    value={f.hexRow}
                    onChange={(e) =>
                      updateFinding(i, { hexRow: e.target.value })
                    }
                    placeholder="row"
                    style={{ ...inputStyle, width: 70 }}
                  />
                  <input
                    value={f.description}
                    onChange={(e) =>
                      updateFinding(i, { description: e.target.value })
                    }
                    placeholder="What did you find here?"
                    style={{ ...inputStyle, flex: 1, minWidth: 160 }}
                  />
                  <button
                    type="button"
                    onClick={() => removeFinding(i)}
                    title="Remove"
                    style={{
                      background: "transparent",
                      color: "#6b7280",
                      border: "1px solid #2e2e4a",
                      borderRadius: 4,
                      padding: "4px 8px",
                      fontSize: 12,
                      cursor: "pointer",
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            {error && (
              <p style={{ color: "#ef4444", fontSize: 12, marginTop: 8 }}>{error}</p>
            )}
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginTop: 10,
              }}
            >
              <button
                disabled={submitting || !content.trim()}
                onClick={handleSubmit}
                style={{
                  background: submitting ? "#166534" : "#4ade80",
                  color: "#000",
                  border: "none",
                  borderRadius: 6,
                  padding: "8px 16px",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor:
                    submitting || !content.trim() ? "not-allowed" : "pointer",
                  opacity: submitting || !content.trim() ? 0.6 : 1,
                }}
              >
                {submitting ? "Submitting..." : "Submit Report"}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Generation results */}
      {(generatingFor || suggestions || genError) && (
        <SuggestionsPanel
          isLoading={generatingFor != null}
          error={genError}
          suggestions={suggestions}
          onDismiss={() => {
            setSuggestions(null);
            setGenError(null);
          }}
        />
      )}

      {/* Report list */}
      {reports.length === 0 ? (
        <p
          style={{
            color: "#6b7280",
            fontSize: 14,
            textAlign: "center",
            marginTop: 40,
          }}
        >
          No reports yet.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {reports.map((report) => {
            const canDelete = isAdmin || report.author === playerName;
            const isGenerating = generatingFor === report.id;
            return (
              <div
                key={report.id}
                style={{
                  background: "#1e1e36",
                  border: "1px solid #2e2e4a",
                  borderRadius: 8,
                  padding: 14,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    gap: 8,
                    flexWrap: "wrap",
                    marginBottom: 8,
                  }}
                >
                  <div>
                    {report.title && (
                      <h3
                        style={{
                          fontFamily: "'Cinzel', serif",
                          fontSize: 16,
                          color: "#e8e8f0",
                          margin: 0,
                          marginBottom: 2,
                        }}
                      >
                        {report.title}
                      </h3>
                    )}
                    <span style={{ color: "#9ca3af", fontSize: 12 }}>
                      {report.author} &middot;{" "}
                      {new Date(report.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {isAdmin && (
                      <button
                        disabled={isGenerating}
                        onClick={() => handleGenerate(report.id)}
                        title="Generate quest suggestions from this report"
                        style={{
                          background: isGenerating ? "#3730a3" : "#6366f1",
                          color: "#fff",
                          border: "none",
                          borderRadius: 4,
                          padding: "4px 10px",
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: isGenerating ? "wait" : "pointer",
                        }}
                      >
                        {isGenerating ? "Generating..." : "Generate Quests"}
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => {
                          if (confirm("Delete this report?")) {
                            deleteReport(report.id);
                          }
                        }}
                        title="Delete report"
                        style={{
                          background: "#7f1d1d",
                          color: "#fff",
                          border: "none",
                          borderRadius: 4,
                          padding: "4px 10px",
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
                <p
                  style={{
                    color: "#d1d5db",
                    fontSize: 14,
                    lineHeight: 1.6,
                    whiteSpace: "pre-wrap",
                    margin: 0,
                  }}
                >
                  {report.content}
                </p>
                {report.findings.length > 0 && (
                  <div
                    style={{
                      marginTop: 10,
                      paddingTop: 8,
                      borderTop: "1px solid #2e2e4a",
                    }}
                  >
                    <span
                      style={{
                        color: "#9ca3af",
                        fontSize: 11,
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        fontWeight: 600,
                      }}
                    >
                      Findings
                    </span>
                    <ul
                      style={{
                        listStyle: "none",
                        padding: 0,
                        margin: "6px 0 0",
                      }}
                    >
                      {report.findings.map((f, i) => (
                        <li
                          key={i}
                          style={{
                            color: "#d1d5db",
                            fontSize: 13,
                            margin: "3px 0",
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
                          </span>{" "}
                          {f.description}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SuggestionsPanel({
  isLoading,
  error,
  suggestions,
  onDismiss,
}: {
  isLoading: boolean;
  error: string | null;
  suggestions: QuestSuggestion[] | null;
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
        background: "#1a2332",
        border: "1px solid #3730a3",
        borderRadius: 8,
        padding: 16,
        marginBottom: 28,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <h2
          style={{
            fontFamily: "'Cinzel', serif",
            fontSize: 16,
            color: "#a78bfa",
            margin: 0,
          }}
        >
          AI Quest Suggestions
        </h2>
        <button
          onClick={onDismiss}
          style={{
            background: "transparent",
            border: "1px solid #2e2e4a",
            color: "#9ca3af",
            borderRadius: 4,
            padding: "2px 10px",
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          Dismiss
        </button>
      </div>

      {isLoading && (
        <p style={{ color: "#9ca3af", fontSize: 13 }}>
          Thinking... feeding the report, map state, and quest log to OpenAI.
        </p>
      )}
      {error && (
        <p style={{ color: "#ef4444", fontSize: 13 }}>Error: {error}</p>
      )}
      {!isLoading && suggestions && suggestions.length === 0 && (
        <p style={{ color: "#9ca3af", fontSize: 13 }}>
          No quest ideas surfaced from this report.
        </p>
      )}
      {!isLoading && suggestions && suggestions.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {suggestions.map((s, i) => (
            <div
              key={i}
              style={{
                background: "#12121f",
                border: "1px solid #2e2e4a",
                borderRadius: 6,
                padding: 12,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 6,
                  flexWrap: "wrap",
                }}
              >
                <span
                  style={{
                    background: QUEST_LEVEL_COLORS[s.level],
                    color: "#000",
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: 3,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  {QUEST_LEVEL_LABELS[s.level]}
                </span>
                <strong style={{ color: "#e8e8f0", fontSize: 14 }}>
                  {s.title}
                </strong>
                <span style={{ color: "#9ca3af", fontSize: 12 }}>
                  @ ({s.hexCol}, {s.hexRow})
                  {s.endHexCol != null && s.endHexRow != null
                    ? ` → (${s.endHexCol}, ${s.endHexRow})`
                    : ""}
                </span>
              </div>
              <p
                style={{
                  color: "#d1d5db",
                  fontSize: 13,
                  margin: "4px 0",
                  lineHeight: 1.5,
                }}
              >
                {s.description}
              </p>
              {s.reward && (
                <p style={{ color: "#fbbf24", fontSize: 12, margin: "4px 0" }}>
                  Reward: {s.reward}
                </p>
              )}
              {s.rationale && (
                <p
                  style={{
                    color: "#6b7280",
                    fontSize: 11,
                    fontStyle: "italic",
                    margin: "4px 0",
                  }}
                >
                  Rationale: {s.rationale}
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
                    padding: "4px 12px",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor:
                      creating === i || created.has(i)
                        ? "not-allowed"
                        : "pointer",
                  }}
                >
                  {created.has(i)
                    ? "Added to Quests"
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
  width: "100%",
  background: "#12121f",
  border: "1px solid #2e2e4a",
  borderRadius: 6,
  padding: "8px 10px",
  color: "#e8e8f0",
  fontSize: 13,
  outline: "none",
  boxSizing: "border-box" as const,
};
