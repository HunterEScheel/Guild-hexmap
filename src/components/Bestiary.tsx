import { useEffect, useMemo, useState } from "react";
import { TERRAIN_COLORS, TERRAIN_LABELS } from "../utils/colors";
import { TIER_LABELS, formatCr } from "../data/bestiary";
import type { Creature } from "../data/bestiary";
import { listMonsters, getCreature } from "../services/dnd5e";
import type { MonsterRef } from "../services/dnd5e";

export function Bestiary() {
  const [monsters, setMonsters] = useState<MonsterRef[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    listMonsters()
      .then(setMonsters)
      .catch(() => setError(true));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return monsters;
    return monsters.filter((m) => m.name.toLowerCase().includes(q));
  }, [monsters, search]);

  return (
    <div
      style={{
        maxWidth: 800,
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
        Bestiary
      </h1>
      <p style={{ color: "#6b7280", fontSize: 14, marginBottom: 20 }}>
        Creatures sourced from the D&amp;D 5e SRD. Combat points are derived from
        a creature's XP; terrains are inferred from its type and traits.
      </p>

      {error ? (
        <div style={{ color: "#ef4444", fontSize: 14, padding: "40px 0" }}>
          Could not reach the 5e API. Check your connection and reload.
        </div>
      ) : monsters.length === 0 ? (
        <div style={{ color: "#6b7280", fontSize: 14, padding: "40px 0" }}>
          Loading creatures...
        </div>
      ) : (
        <>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search creatures..."
            style={{
              width: "100%",
              boxSizing: "border-box",
              background: "#1e1e36",
              border: "1px solid #2e2e4a",
              borderRadius: 6,
              padding: "8px 12px",
              color: "#e8e8f0",
              fontSize: 14,
              marginBottom: 12,
            }}
          />
          <p style={{ color: "#6b7280", fontSize: 12, marginBottom: 12 }}>
            {filtered.length} of {monsters.length} creatures
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {filtered.map((m) => (
              <BestiaryRow key={m.index} monster={m} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function BestiaryRow({ monster }: { monster: MonsterRef }) {
  const [open, setOpen] = useState(false);
  const [creature, setCreature] = useState<Creature | null>(null);
  const [loading, setLoading] = useState(false);

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && !creature && !loading) {
      setLoading(true);
      getCreature(monster.index)
        .then(setCreature)
        .finally(() => setLoading(false));
    }
  }

  return (
    <div
      style={{
        background: "#1e1e36",
        borderRadius: 6,
        border: "1px solid #2e2e4a",
        overflow: "hidden",
      }}
    >
      <button
        onClick={toggle}
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "transparent",
          border: "none",
          color: "#e8e8f0",
          padding: "10px 14px",
          fontSize: 14,
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <span style={{ fontWeight: 600 }}>{monster.name}</span>
        <span style={{ color: "#6b7280", fontSize: 13 }}>
          {open ? "−" : "+"}
        </span>
      </button>

      {open && (
        <div style={{ padding: "0 14px 12px" }}>
          {loading || !creature ? (
            <span style={{ color: "#6b7280", fontSize: 13 }}>
              {loading ? "Loading..." : "Unavailable"}
            </span>
          ) : (
            <CreatureDetail creature={creature} />
          )}
        </div>
      )}
    </div>
  );
}

function CreatureDetail({ creature }: { creature: Creature }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <span style={{ fontSize: 12, color: "#9ca3af" }}>
        {creature.size} {creature.type} &middot; CR{" "}
        {formatCr(creature.challengeRating)} &middot; {TIER_LABELS[creature.tier]}
      </span>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 6,
        }}
      >
        <DetailStat label="HP" value={String(creature.hitPoints)} />
        <DetailStat label="AC" value={String(creature.armorClass)} />
        <DetailStat label="XP" value={creature.xp.toLocaleString()} />
        <DetailStat
          label="Combat Pts"
          value={creature.combatPoints.toLocaleString()}
          highlight
        />
      </div>

      <div>
        <div
          style={{
            fontSize: 10,
            color: "#6b7280",
            textTransform: "uppercase",
            marginBottom: 4,
          }}
        >
          Terrains
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {creature.terrains.map((t) => (
            <span
              key={t}
              style={{
                fontSize: 10,
                padding: "2px 6px",
                borderRadius: 8,
                background: "#12121f",
                color: "#d1d5db",
                border: `1px solid ${TERRAIN_COLORS[t]}`,
              }}
            >
              {TERRAIN_LABELS[t]}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function DetailStat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      style={{
        background: "#12121f",
        borderRadius: 4,
        padding: "6px 4px",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 9, color: "#6b7280", textTransform: "uppercase" }}>
        {label}
      </div>
      <div
        style={{
          fontSize: 14,
          color: highlight ? "#fbbf24" : "#e8e8f0",
          fontWeight: 600,
        }}
      >
        {value}
      </div>
    </div>
  );
}
