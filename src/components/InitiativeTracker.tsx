import { useState } from "react";
import {
  addInitiativeEntry,
  removeInitiativeEntry,
  clearInitiativeTracker,
  updateInitiativeHp,
} from "../hooks/useFirebase";
import { formatCr } from "../data/bestiary";
import type { InitiativeEntry } from "../types";

interface InitiativeTrackerProps {
  entries: InitiativeEntry[];
  playerName: string | null;
  isAdmin: boolean;
}

function hpStatus(hp: number, maxHp: number): { label: string; color: string } {
  const ratio = hp / maxHp;
  if (hp <= 0) return { label: "Dead", color: "#6b7280" };
  if (ratio > 0.75) return { label: "Fine", color: "#4ade80" };
  if (ratio > 0.4) return { label: "Okay", color: "#fbbf24" };
  return { label: "Ouch", color: "#ef4444" };
}

export function InitiativeTracker({
  entries,
  playerName,
  isAdmin,
}: InitiativeTrackerProps) {
  const [initiative, setInitiative] = useState("");
  const [adding, setAdding] = useState(false);

  const alreadyJoined =
    playerName != null &&
    entries.some((e) => !e.isCreature && e.name === playerName);

  async function handleJoin() {
    const value = parseInt(initiative, 10);
    if (isNaN(value) || !playerName) return;
    setAdding(true);
    await addInitiativeEntry(playerName, value, false);
    setInitiative("");
    setAdding(false);
  }

  return (
    <div
      style={{
        maxWidth: 600,
        margin: "0 auto",
        padding: "32px 24px",
        color: "#e8e8f0",
        fontFamily: "'Segoe UI', system-ui, sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <h1
          style={{
            fontFamily: "'Cinzel', serif",
            fontSize: 28,
            margin: 0,
            color: "#e8e8f0",
          }}
        >
          Initiative Tracker
        </h1>
        {isAdmin && entries.length > 0 && (
          <button
            onClick={clearInitiativeTracker}
            style={{
              background: "#dc2626",
              color: "#fff",
              border: "none",
              borderRadius: 4,
              padding: "6px 14px",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Clear All
          </button>
        )}
      </div>

      {/* Player join form */}
      {playerName && !alreadyJoined && (
        <div
          style={{
            display: "flex",
            gap: 8,
            marginBottom: 24,
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: 14, color: "#9ca3af", whiteSpace: "nowrap" }}>
            {playerName}
          </span>
          <input
            type="number"
            value={initiative}
            onChange={(e) => setInitiative(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleJoin()}
            placeholder="Initiative roll"
            style={{
              width: 120,
              background: "#1e1e36",
              border: "1px solid #2e2e4a",
              borderRadius: 4,
              padding: "6px 10px",
              color: "#e8e8f0",
              fontSize: 14,
            }}
          />
          <button
            disabled={adding || initiative === ""}
            onClick={handleJoin}
            style={{
              background: adding ? "#166534" : "#4ade80",
              color: "#000",
              border: "none",
              borderRadius: 4,
              padding: "6px 14px",
              fontSize: 13,
              fontWeight: 600,
              cursor: adding ? "wait" : "pointer",
            }}
          >
            Join
          </button>
        </div>
      )}

      {!playerName && (
        <p style={{ color: "#6b7280", fontSize: 13, marginBottom: 24 }}>
          Join a quest first to set your player name, then you can add yourself
          to initiative.
        </p>
      )}

      {alreadyJoined && (
        <p style={{ color: "#4ade80", fontSize: 13, marginBottom: 24 }}>
          You're in the turn order.
        </p>
      )}

      {/* Turn order */}
      {entries.length === 0 ? (
        <p style={{ color: "#6b7280", fontSize: 14, textAlign: "center", marginTop: 40 }}>
          No encounter running. An admin can start one from the map.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {entries.map((entry, i) => (
            <InitiativeRow
              key={entry.id}
              entry={entry}
              position={i + 1}
              isAdmin={isAdmin}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function InitiativeRow({
  entry,
  position,
  isAdmin,
}: {
  entry: InitiativeEntry;
  position: number;
  isAdmin: boolean;
}) {
  const [hpDelta, setHpDelta] = useState("");

  const hasHp = entry.isCreature && entry.hp != null && entry.maxHp != null;
  const status = hasHp ? hpStatus(entry.hp!, entry.maxHp!) : null;
  const dead = hasHp && entry.hp! <= 0;

  async function applyDamage() {
    const delta = parseInt(hpDelta, 10);
    if (isNaN(delta) || !hasHp) return;
    const newHp = Math.max(0, entry.hp! - delta);
    await updateInitiativeHp(entry.id, newHp);
    setHpDelta("");
  }

  async function applyHeal() {
    const delta = parseInt(hpDelta, 10);
    if (isNaN(delta) || !hasHp) return;
    const newHp = Math.min(entry.maxHp!, entry.hp! + delta);
    await updateInitiativeHp(entry.id, newHp);
    setHpDelta("");
  }

  return (
    <div
      style={{
        background: entry.isCreature ? "#1e1e36" : "#1a2332",
        borderRadius: 6,
        padding: "10px 14px",
        borderLeft: `4px solid ${dead ? "#6b7280" : entry.isCreature ? "#f97316" : "#4ade80"}`,
        opacity: dead ? 0.5 : 1,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span
          style={{
            width: 28,
            textAlign: "center",
            fontSize: 12,
            color: "#6b7280",
            fontWeight: 700,
          }}
        >
          {position}
        </span>
        <span
          style={{
            width: 40,
            textAlign: "center",
            fontSize: 18,
            fontWeight: 700,
            color: "#fbbf24",
            fontFamily: "'Cinzel', serif",
          }}
        >
          {entry.initiative}
        </span>
        <div style={{ flex: 1 }}>
          <span style={{ color: "#e8e8f0", fontWeight: 600, fontSize: 14 }}>
            {entry.name}
          </span>
          {entry.isCreature && (
            <span style={{ color: "#9ca3af", fontSize: 12, marginLeft: 8 }}>
              CR {formatCr(entry.cr ?? 0)} &middot; AC {entry.ac}
            </span>
          )}
        </div>

        {/* HP display */}
        {hasHp && (
          isAdmin ? (
            <span style={{ fontSize: 13, fontWeight: 600, color: status!.color, whiteSpace: "nowrap" }}>
              {entry.hp}/{entry.maxHp} HP
            </span>
          ) : (
            <span style={{ fontSize: 13, fontWeight: 600, color: status!.color }}>
              {status!.label}
            </span>
          )
        )}

        {!entry.isCreature && (
          <span
            style={{
              fontSize: 11,
              color: "#4ade80",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            player
          </span>
        )}

        {isAdmin && (
          <button
            onClick={() => removeInitiativeEntry(entry.id)}
            title="Remove"
            style={{
              background: "transparent",
              border: "none",
              color: "#6b7280",
              cursor: "pointer",
              fontSize: 14,
              padding: "0 4px",
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        )}
      </div>

      {/* Admin HP controls */}
      {isAdmin && hasHp && !dead && (
        <div
          style={{
            display: "flex",
            gap: 6,
            marginTop: 6,
            marginLeft: 80,
            alignItems: "center",
          }}
        >
          <input
            type="number"
            value={hpDelta}
            onChange={(e) => setHpDelta(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") applyDamage();
            }}
            placeholder="Amount"
            style={{
              width: 70,
              background: "#12121f",
              border: "1px solid #2e2e4a",
              borderRadius: 4,
              padding: "3px 6px",
              color: "#e8e8f0",
              fontSize: 12,
            }}
          />
          <button
            onClick={applyDamage}
            disabled={hpDelta === ""}
            style={{
              background: "#ef4444",
              color: "#fff",
              border: "none",
              borderRadius: 4,
              padding: "3px 10px",
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Damage
          </button>
          <button
            onClick={applyHeal}
            disabled={hpDelta === ""}
            style={{
              background: "#4ade80",
              color: "#000",
              border: "none",
              borderRadius: 4,
              padding: "3px 10px",
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Heal
          </button>
        </div>
      )}
    </div>
  );
}
