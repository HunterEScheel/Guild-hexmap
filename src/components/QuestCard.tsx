import { useCallback, useState, type KeyboardEvent, type MouseEvent } from "react";
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

function formatScheduled(iso: string, verbose: boolean): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    weekday: verbose ? "long" : "short",
    month: verbose ? "long" : "short",
    day: "numeric",
    year: verbose ? "numeric" : undefined,
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * QuestCard — an "ambient dossier". The whole card is the click target
 * for expanding details. A chevron in the top-right corner signals the
 * interaction; hovering lifts the card with a soft glow tinted by the
 * quest's difficulty level. Details animate open with a smooth CSS grid
 * height transition (no JS animation library required).
 */
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
  // Compact-collapsed hides everything except title/level/status.
  const showBrief = !compact || expanded;

  const toggle = useCallback(
    () => setExpanded((v) => !v),
    []
  );

  const onCardKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      // Only react when the card itself is focused — not when Enter/Space
      // is pressed inside an inner button.
      if (e.target !== e.currentTarget) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggle();
      }
    },
    [toggle]
  );

  // Any click inside the actions row shouldn't toggle the card.
  const stopBubbling = useCallback(
    (e: MouseEvent) => e.stopPropagation(),
    []
  );

  const schedShort = quest.scheduledDate
    ? formatScheduled(quest.scheduledDate, false)
    : null;
  const schedLong = quest.scheduledDate
    ? formatScheduled(quest.scheduledDate, true)
    : null;

  const actions = (
    <div
      className="qc-actions"
      onClick={stopBubbling}
      onKeyDown={stopBubbling as unknown as (e: KeyboardEvent) => void}
    >
      {canJoin && (
        <button
          className="qc-btn qc-btn--join"
          onClick={() => onJoin(quest.id)}
        >
          Join
        </button>
      )}
      {hasJoined && quest.status !== "completed" && (
        <button
          className="qc-btn qc-btn--leave"
          onClick={() => onLeave(quest.id)}
        >
          Leave
        </button>
      )}
      {isAdmin && (
        <>
          <button
            className="qc-btn qc-btn--edit"
            onClick={() => onEdit(quest)}
          >
            Edit
          </button>
          <button
            className="qc-btn qc-btn--delete"
            onClick={() => onDelete(quest.id)}
          >
            Delete
          </button>
        </>
      )}
    </div>
  );

  return (
    <div
      className={`quest-card${expanded ? " quest-card--expanded" : ""}`}
      style={{ ["--level-color" as any]: levelColor }}
      role="button"
      aria-expanded={expanded}
      tabIndex={0}
      onClick={toggle}
      onKeyDown={onCardKeyDown}
    >
      <header className="qc-head">
        <div className="qc-title-row">
          <h4 className="qc-title">{quest.title}</h4>
          <span className="qc-level">{QUEST_LEVEL_LABELS[quest.level]}</span>
        </div>
        <span
          className="qc-chevron"
          aria-hidden="true"
          title={expanded ? "Collapse" : "Expand"}
        >
          <svg viewBox="0 0 12 12">
            <path d="M2.5 4.5 L6 8 L9.5 4.5" />
          </svg>
        </span>
      </header>

      {showBrief && (
        <>
          <p className="qc-desc">{quest.description}</p>
          {quest.reward && (
            <p className="qc-reward">Reward: {quest.reward}</p>
          )}
        </>
      )}

      <div className="qc-meta">
        <span
          className={`qc-status qc-status--${quest.status}`}
        >
          {STATUS_LABELS[quest.status]}
        </span>

        {quest.players.length > 0 && (
          <span className="qc-peek-item">
            <PeekIcon type="party" />
            {quest.players.length} adventurer
            {quest.players.length === 1 ? "" : "s"}
          </span>
        )}
        {schedShort && (
          <span className="qc-peek-item">
            <PeekIcon type="clock" />
            {schedShort}
          </span>
        )}
      </div>

      {/* Expanded section — animates open via CSS grid 0fr → 1fr */}
      <div className="qc-extras" data-open={expanded}>
        <div className="qc-extras-inner">
          {schedLong && (
            <div className="qc-field">
              <span className="qc-field-label">Scheduled</span>
              <span className="qc-field-value qc-field-value--sched">
                {schedLong}
              </span>
            </div>
          )}

          <div className="qc-field">
            <span className="qc-field-label">Party</span>
            <span className="qc-field-value">
              {quest.players.length > 0 ? quest.players.join(", ") : "—"}
            </span>
          </div>

          {expandedExtras}

          {/* In compact mode (SidePanel), actions live inside the expand.
             In full mode (ActiveQuests), actions live below the expand
             and stay visible when collapsed — see below. */}
          {compact && actions}
        </div>
      </div>

      {!compact && actions}
    </div>
  );
}

function PeekIcon({ type }: { type: "party" | "clock" }) {
  if (type === "party") {
    return (
      <svg
        className="qc-peek-icon"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <circle cx="6" cy="6" r="2.4" />
        <path d="M2 13c.5-2.5 2-3.6 4-3.6s3.5 1.1 4 3.6" />
        <circle cx="11" cy="5.2" r="1.8" />
        <path d="M10 9.5c1.8-.1 3.5.8 4 3" />
      </svg>
    );
  }
  return (
    <svg
      className="qc-peek-icon"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="8" cy="8" r="6" />
      <path d="M8 4.5 v3.5 l2.5 1.5" />
    </svg>
  );
}
