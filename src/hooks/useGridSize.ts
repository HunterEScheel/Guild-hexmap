import { useMemo } from "react";
import type { HexData, Quest } from "../types";
import { hexNeighbors } from "../utils/hexMath";

export interface GridSize {
  cells: Array<{ col: number; row: number }>;
  minCol: number;
  maxCol: number;
  minRow: number;
  maxRow: number;
  totalCols: number;
  totalRows: number;
}

/**
 * Decide which hex cells to render and the bounding box that encloses them.
 *
 * Cells included:
 * - Every filled hex (terrain !== "unknown").
 * - The 6 hex neighbors of each filled hex, so the only "unknown" tiles
 *   that ever appear are the ones adjacent to a filled tile.
 * - Quest start/end hex positions, so a quest pin always has a tile under it.
 *
 * When nothing is filled and there are no quests, falls back to a 5x5 starter
 * grid so an admin has somewhere to paint.
 */
export function useGridSize(
  hexes: Map<string, HexData>,
  quests: Quest[] = []
): GridSize {
  return useMemo(() => {
    const cellSet = new Map<string, { col: number; row: number }>();
    const addCell = (col: number, row: number) => {
      const key = `${col}_${row}`;
      if (!cellSet.has(key)) cellSet.set(key, { col, row });
    };

    for (const hex of hexes.values()) {
      if (hex.terrain === "unknown") continue;
      addCell(hex.col, hex.row);
      for (const n of hexNeighbors(hex.col, hex.row)) {
        addCell(n.col, n.row);
      }
    }
    for (const q of quests) {
      addCell(q.hexCol, q.hexRow);
      if (q.endHexCol != null && q.endHexRow != null) {
        addCell(q.endHexCol, q.endHexRow);
      }
    }

    if (cellSet.size === 0) {
      const cells: Array<{ col: number; row: number }> = [];
      for (let c = 0; c < 5; c++) {
        for (let r = 0; r < 5; r++) {
          cells.push({ col: c, row: r });
        }
      }
      return {
        cells,
        minCol: 0,
        maxCol: 4,
        minRow: 0,
        maxRow: 4,
        totalCols: 5,
        totalRows: 5,
      };
    }

    let minCol = Infinity;
    let maxCol = -Infinity;
    let minRow = Infinity;
    let maxRow = -Infinity;
    for (const c of cellSet.values()) {
      if (c.col < minCol) minCol = c.col;
      if (c.col > maxCol) maxCol = c.col;
      if (c.row < minRow) minRow = c.row;
      if (c.row > maxRow) maxRow = c.row;
    }

    return {
      cells: Array.from(cellSet.values()),
      minCol,
      maxCol,
      minRow,
      maxRow,
      totalCols: maxCol - minCol + 1,
      totalRows: maxRow - minRow + 1,
    };
  }, [hexes, quests]);
}
