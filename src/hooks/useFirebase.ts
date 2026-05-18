import { useState, useEffect } from "react";
import { supabase } from "../supabase";
import type { ChallengeTier, HexData, Quest, TerrainType } from "../types/index";
import type { Encounter } from "../data/encounters";

export function useHexData(): Map<string, HexData> {
  const [hexes, setHexes] = useState<Map<string, HexData>>(new Map());

  useEffect(() => {
    // Initial fetch
    supabase
      .from("hexes")
      .select("*")
      .then(({ data }) => {
        if (data) {
          const map = new Map<string, HexData>();
          for (const row of data) {
            map.set(`${row.col}_${row.row}`, {
              col: row.col,
              row: row.row,
              terrain: row.terrain as TerrainType,
              challengeTier: (row.challenge_tier as ChallengeTier) ?? null,
            });
          }
          setHexes(map);
        }
      });

    // Real-time subscription
    const channel = supabase
      .channel("hexes-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "hexes" },
        (payload) => {
          setHexes((prev) => {
            const next = new Map(prev);
            if (payload.eventType === "DELETE") {
              const old = payload.old as { col: number; row: number };
              next.delete(`${old.col}_${old.row}`);
            } else {
              const row = payload.new as {
                col: number;
                row: number;
                terrain: string;
                challenge_tier: number | null;
              };
              next.set(`${row.col}_${row.row}`, {
                col: row.col,
                row: row.row,
                terrain: row.terrain as TerrainType,
                challengeTier: (row.challenge_tier as ChallengeTier) ?? null,
              });
            }
            return next;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return hexes;
}

export function useQuests(): Quest[] {
  const [quests, setQuests] = useState<Quest[]>([]);

  useEffect(() => {
    // Initial fetch
    supabase
      .from("quests")
      .select("*")
      .then(({ data }) => {
        if (data) {
          setQuests(data.map(mapQuest));
        }
      });

    // Real-time subscription
    const channel = supabase
      .channel("quests-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "quests" },
        (payload) => {
          setQuests((prev) => {
            if (payload.eventType === "DELETE") {
              const old = payload.old as { id: string };
              return prev.filter((q) => q.id !== old.id);
            }
            if (payload.eventType === "INSERT") {
              return [...prev, mapQuest(payload.new)];
            }
            // UPDATE
            return prev.map((q) =>
              q.id === (payload.new as { id: string }).id
                ? mapQuest(payload.new)
                : q
            );
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return quests;
}

function mapQuest(row: Record<string, unknown>): Quest {
  return {
    id: row.id as string,
    title: row.title as string,
    description: (row.description as string) ?? "",
    reward: (row.reward as string) ?? "",
    level: row.level as Quest["level"],
    status: row.status as Quest["status"],
    hexCol: row.hex_col as number,
    hexRow: row.hex_row as number,
    players: (row.players as string[]) ?? [],
  };
}

export async function setHexTerrain(
  col: number,
  row: number,
  terrain: TerrainType
): Promise<void> {
  await supabase.from("hexes").upsert(
    { col, row, terrain },
    { onConflict: "col,row" }
  );
}

export async function setHexChallengeTier(
  col: number,
  row: number,
  tier: ChallengeTier | null
): Promise<void> {
  await supabase.from("hexes").upsert(
    { col, row, challenge_tier: tier },
    { onConflict: "col,row" }
  );
}

export async function createQuest(quest: Omit<Quest, "id">): Promise<void> {
  await supabase.from("quests").insert({
    title: quest.title,
    description: quest.description,
    reward: quest.reward,
    level: quest.level,
    status: quest.status,
    hex_col: quest.hexCol,
    hex_row: quest.hexRow,
    players: quest.players,
  });
}

export async function updateQuest(
  id: string,
  updates: Partial<Quest>
): Promise<void> {
  const dbUpdates: Record<string, unknown> = {};
  if (updates.title !== undefined) dbUpdates.title = updates.title;
  if (updates.description !== undefined) dbUpdates.description = updates.description;
  if (updates.reward !== undefined) dbUpdates.reward = updates.reward;
  if (updates.level !== undefined) dbUpdates.level = updates.level;
  if (updates.status !== undefined) dbUpdates.status = updates.status;
  if (updates.hexCol !== undefined) dbUpdates.hex_col = updates.hexCol;
  if (updates.hexRow !== undefined) dbUpdates.hex_row = updates.hexRow;
  if (updates.players !== undefined) dbUpdates.players = updates.players;

  await supabase.from("quests").update(dbUpdates).eq("id", id);
}

export async function deleteQuest(id: string): Promise<void> {
  await supabase.from("quests").delete().eq("id", id);
}

export async function joinQuest(
  questId: string,
  playerName: string
): Promise<void> {
  const { data } = await supabase
    .from("quests")
    .select("players")
    .eq("id", questId)
    .single();

  if (data) {
    const players: string[] = data.players ?? [];
    if (!players.includes(playerName)) {
      await supabase
        .from("quests")
        .update({ players: [...players, playerName] })
        .eq("id", questId);
    }
  }
}

export async function leaveQuest(
  questId: string,
  playerName: string
): Promise<void> {
  const { data } = await supabase
    .from("quests")
    .select("players")
    .eq("id", questId)
    .single();

  if (data) {
    const players: string[] = data.players ?? [];
    await supabase
      .from("quests")
      .update({ players: players.filter((p) => p !== playerName) })
      .eq("id", questId);
  }
}

export async function getRandomEncounter(
  terrain: TerrainType,
  tier: ChallengeTier
): Promise<Encounter | null> {
  const { data, error } = await supabase
    .from("encounters")
    .select("*")
    .eq("terrain", terrain)
    .eq("tier", tier);

  if (error) {
    console.error("Encounter fetch error:", error);
    return null;
  }

  if (!data || data.length === 0) return null;

  const row = data[Math.floor(Math.random() * data.length)];
  return {
    id: row.id,
    terrain: row.terrain,
    tier: row.tier,
    name: row.name,
    description: row.description,
    creatures: row.creatures,
    isCombat: row.is_combat,
  };
}
