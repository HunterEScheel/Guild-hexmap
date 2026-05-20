import { useState, useEffect } from "react";
import { supabase } from "../supabase";
import type { ChallengeTier, HexData, Quest, TerrainType, InitiativeEntry } from "../types/index";

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
    endHexCol: (row.end_hex_col as number) ?? null,
    endHexRow: (row.end_hex_row as number) ?? null,
    players: (row.players as string[]) ?? [],
    scheduledDate: (row.scheduled_date as string) ?? null,
  };
}

export async function setHexTerrain(
  col: number,
  row: number,
  terrain: TerrainType
): Promise<void> {
  if (terrain === "unknown") {
    await supabase.from("hexes").delete().eq("col", col).eq("row", row);
    return;
  }
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
    end_hex_col: quest.endHexCol,
    end_hex_row: quest.endHexRow,
    players: quest.players,
    scheduled_date: quest.scheduledDate,
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
  if (updates.endHexCol !== undefined) dbUpdates.end_hex_col = updates.endHexCol;
  if (updates.endHexRow !== undefined) dbUpdates.end_hex_row = updates.endHexRow;
  if (updates.players !== undefined) dbUpdates.players = updates.players;
  if (updates.scheduledDate !== undefined) dbUpdates.scheduled_date = updates.scheduledDate;

  await supabase.from("quests").update(dbUpdates).eq("id", id);
}

export async function deleteQuest(id: string): Promise<void> {
  await supabase.from("quests").delete().eq("id", id);
}

export async function joinQuest(
  questId: string,
  playerName: string,
  scheduledDate?: string
): Promise<void> {
  const { data } = await supabase
    .from("quests")
    .select("players, status")
    .eq("id", questId)
    .single();

  if (data) {
    const players: string[] = data.players ?? [];
    if (!players.includes(playerName)) {
      const updates: Record<string, unknown> = {
        players: [...players, playerName],
        status: "in_progress",
      };
      if (scheduledDate) {
        updates.scheduled_date = scheduledDate;
      }
      await supabase.from("quests").update(updates).eq("id", questId);
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
    const remaining = players.filter((p) => p !== playerName);
    const updates: Record<string, unknown> = { players: remaining };
    if (remaining.length === 0) {
      updates.status = "available";
      updates.scheduled_date = null;
    }
    await supabase.from("quests").update(updates).eq("id", questId);
  }
}

// --- Initiative Tracker ---

function mapInitiativeEntry(row: Record<string, unknown>): InitiativeEntry {
  return {
    id: row.id as string,
    name: row.name as string,
    initiative: row.initiative as number,
    isCreature: row.is_creature as boolean,
    hp: (row.hp as number) ?? null,
    maxHp: (row.max_hp as number) ?? null,
    ac: (row.ac as number) ?? null,
    cr: (row.cr as number) ?? null,
  };
}

export function useInitiative(): InitiativeEntry[] {
  const [entries, setEntries] = useState<InitiativeEntry[]>([]);

  useEffect(() => {
    supabase
      .from("initiative_tracker")
      .select("*")
      .order("initiative", { ascending: false })
      .then(({ data }) => {
        if (data) setEntries(data.map(mapInitiativeEntry));
      });

    const channel = supabase
      .channel("initiative-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "initiative_tracker" },
        (payload) => {
          setEntries((prev) => {
            let next: InitiativeEntry[];
            if (payload.eventType === "DELETE") {
              const old = payload.old as { id: string };
              next = prev.filter((e) => e.id !== old.id);
            } else if (payload.eventType === "INSERT") {
              next = [...prev, mapInitiativeEntry(payload.new)];
            } else {
              next = prev.map((e) =>
                e.id === (payload.new as { id: string }).id
                  ? mapInitiativeEntry(payload.new)
                  : e
              );
            }
            return next.sort((a, b) => b.initiative - a.initiative);
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return entries;
}

export async function addInitiativeEntry(
  name: string,
  initiative: number,
  isCreature: boolean,
  stats?: { hp?: number; ac?: number; cr?: number }
): Promise<void> {
  await supabase.from("initiative_tracker").insert({
    name,
    initiative,
    is_creature: isCreature,
    hp: stats?.hp ?? null,
    max_hp: stats?.hp ?? null,
    ac: stats?.ac ?? null,
    cr: stats?.cr ?? null,
  });
}

export async function removeInitiativeEntry(id: string): Promise<void> {
  await supabase.from("initiative_tracker").delete().eq("id", id);
}

export async function updateInitiativeHp(id: string, hp: number): Promise<void> {
  await supabase.from("initiative_tracker").update({ hp }).eq("id", id);
}

export async function clearInitiativeTracker(): Promise<void> {
  await supabase.from("initiative_tracker").delete().neq("id", "00000000-0000-0000-0000-000000000000");
}