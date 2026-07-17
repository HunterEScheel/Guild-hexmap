import { useEffect, useMemo, useState } from "react";
import { fetchShopPurchases } from "../services/shop";
import type { PurchasedItem } from "../services/shop";
import type { Character } from "../types";

interface MyItemsProps {
  playerName: string | null;
  character: Character | undefined;
  onSetPlayerName: () => void;
  onOpenCharacter: () => void;
}

const RARITY_COLORS: Record<string, string> = {
  common: "#9ca3af",
  uncommon: "#4ade80",
  rare: "#60a5fa",
  "very rare": "#a855f7",
  legendary: "#fbbf24",
};

export function MyItems({
  playerName,
  character,
  onSetPlayerName,
  onOpenCharacter,
}: MyItemsProps) {
  const [purchases, setPurchases] = useState<PurchasedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      const data = await fetchShopPurchases();
      if (alive) {
        setPurchases(data);
        setLoading(false);
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, []);

  const myPurchases = useMemo(
    () => (playerName ? purchases.filter((p) => p.buyer === playerName) : []),
    [purchases, playerName]
  );

  const totalSpent = useMemo(() => {
    let total = 0;
    for (const p of myPurchases) {
      const stripped = p.price.replace(/[^0-9]/g, "");
      const n = parseInt(stripped, 10);
      if (Number.isFinite(n)) total += n;
    }
    return total;
  }, [myPurchases]);

  const gold = character?.gold ?? 0;

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
        My Items
      </h1>
      <p style={{ color: "#9ca3af", fontSize: 13, marginBottom: 24 }}>
        Everything your character has bought from the guild shop.
      </p>

      {!playerName ? (
        <div
          style={{
            textAlign: "center",
            padding: "40px 20px",
            background: "#1e1e36",
            border: "1px solid #2e2e4a",
            borderRadius: 8,
          }}
        >
          <p style={{ color: "#9ca3af", marginBottom: 16 }}>
            Set a player name to see your inventory.
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
          {/* Purse header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "stretch",
              gap: 12,
              marginBottom: 20,
              flexWrap: "wrap",
            }}
          >
            <PurseCard label="Character" value={playerName} accent="#a78bfa" />
            <PurseCard
              label="Gold on hand"
              value={`${gold.toLocaleString()} gp`}
              accent="#fbbf24"
              onClick={onOpenCharacter}
              hint="Edit"
            />
            <PurseCard
              label="Total spent"
              value={`${totalSpent.toLocaleString()} gp`}
              accent="#60a5fa"
            />
            <PurseCard
              label="Items purchased"
              value={String(myPurchases.length)}
              accent="#4ade80"
            />
          </div>

          {loading ? (
            <div
              style={{
                textAlign: "center",
                padding: 40,
                color: "#6b7280",
              }}
            >
              Loading purchases…
            </div>
          ) : myPurchases.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: 40,
                background: "#1e1e36",
                border: "1px dashed #2e2e4a",
                borderRadius: 8,
                color: "#9ca3af",
              }}
            >
              You haven't bought anything yet.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 13,
                }}
              >
                <thead>
                  <tr>
                    <th style={th}>Item</th>
                    <th style={th}>Rarity</th>
                    <th style={th}>Price</th>
                    <th style={th}>When</th>
                  </tr>
                </thead>
                <tbody>
                  {myPurchases.map((p) => (
                    <tr key={p.id}>
                      <td style={{ ...td, color: "#e8e8f0", fontWeight: 500 }}>
                        {p.itemName}
                      </td>
                      <td
                        style={{
                          ...td,
                          color:
                            RARITY_COLORS[p.rarity.toLowerCase()] ?? "#d1d5db",
                          textTransform: "capitalize",
                        }}
                      >
                        {p.rarity}
                      </td>
                      <td style={{ ...td, color: "#fbbf24" }}>
                        {p.price || "—"}
                      </td>
                      <td style={{ ...td, color: "#9ca3af", fontSize: 12 }}>
                        {new Date(p.purchasedAt).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function PurseCard({
  label,
  value,
  accent,
  onClick,
  hint,
}: {
  label: string;
  value: string;
  accent: string;
  onClick?: () => void;
  hint?: string;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        flex: 1,
        minWidth: 140,
        background: "#1e1e36",
        border: "1px solid #2e2e4a",
        borderLeft: `3px solid ${accent}`,
        borderRadius: 6,
        padding: "10px 14px",
        cursor: onClick ? "pointer" : "default",
        transition: "background 0.15s ease",
      }}
      onMouseEnter={(e) => {
        if (onClick) e.currentTarget.style.background = "#22223d";
      }}
      onMouseLeave={(e) => {
        if (onClick) e.currentTarget.style.background = "#1e1e36";
      }}
    >
      <div
        style={{
          fontSize: 10,
          color: "#6b7280",
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          marginBottom: 4,
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <span>{label}</span>
        {hint && <span style={{ color: accent }}>{hint} →</span>}
      </div>
      <div
        style={{
          fontFamily: "'Cinzel', serif",
          fontSize: 18,
          fontWeight: 600,
          color: accent,
        }}
      >
        {value}
      </div>
    </div>
  );
}

const th: React.CSSProperties = {
  textAlign: "left",
  padding: "8px 12px",
  borderBottom: "2px solid #2e2e4a",
  color: "#9ca3af",
  fontWeight: 600,
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: "0.5px",
};

const td: React.CSSProperties = {
  padding: "8px 12px",
  borderBottom: "1px solid #1e1e36",
  color: "#d1d5db",
};
