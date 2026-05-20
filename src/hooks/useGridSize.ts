import { useMemo } from "react";
import type { HexData, Quest } from "../types";

export interface GridSize {
  minCol: number;
  maxCol: number;
  minRow: number;
  maxRow: number;
  totalCols: number;
  totalRows: number;
}

/**
 * Compute the visible grid bounds from filled hexes and quest positions.
 *
 * - Ignores hexes with terrain "unknown" so the grid shrinks when filled
 *   hexes are reverted.
 * - Includes quest start and end hex positions so a quest never falls
 *   outside the visible grid (e.g. if its underlying hex is removed).
 * - Extends 1 hex in each direction.
 * - When nothing contributes to the bounds, returns a 5x5 starter grid.
 */
export function useGridSize(
  hexes: Map<string, HexData>,
  quests: Quest[] = []
): GridSize {
  return useMemo(() => {
    let bMinCol = Infinity;
    let bMaxCol = -Infinity;
    let bMinRow = Infinity;
    let bMaxRow = -Infinity;
    let anyPoint = false;

    const expand = (col: number, row: number) => {
      if (col < bMinCol) bMinCol = col;
      if (col > bMaxCol) bMaxCol = col;
      if (row < bMinRow) bMinRow = row;
      if (row > bMaxRow) bMaxRow = row;
      anyPoint = true;
    };

    for (const hex of hexes.values()) {
      if (hex.terrain === "unknown") continue;
      expand(hex.col, hex.row);
    }
    for (const q of quests) {
      expand(q.hexCol, q.hexRow);
      if (q.endHexCol != null && q.endHexRow != null) {
        expand(q.endHexCol, q.endHexRow);
      }
    }

    if (!anyPoint) {
      return {
        minCol: 0,
        maxCol: 4,
        minRow: 0,
        maxRow: 4,
        totalCols: 5,
        totalRows: 5,
      };
    }

    const minCol = bMinCol - 1;
    const maxCol = bMaxCol + 1;
    const minRow = bMinRow - 1;
    const maxRow = bMaxRow + 1;

    return {
      minCol,
      maxCol,
      minRow,
      maxRow,
      totalCols: maxCol - minCol + 1,
      totalRows: maxRow - minRow + 1,
    };
  }, [hexes, quests]);
}
