import { useMemo } from "react";
import type { HexData } from "../types";

export interface GridSize {
  minCol: number;
  maxCol: number;
  minRow: number;
  maxRow: number;
  totalCols: number;
  totalRows: number;
}

/**
 * Compute the visible grid bounds from a map of non-unknown hexes.
 *
 * - Finds the bounding box of all filled hexes.
 * - Extends 1 hex in each direction.
 * - When no hexes exist, returns a small 5x5 starter grid.
 */
export function useGridSize(hexes: Map<string, HexData>): GridSize {
  return useMemo(() => {
    const entries = Array.from(hexes.values());

    if (entries.length === 0) {
      return {
        minCol: 0,
        maxCol: 4,
        minRow: 0,
        maxRow: 4,
        totalCols: 5,
        totalRows: 5,
      };
    }

    let bMinCol = Infinity;
    let bMaxCol = -Infinity;
    let bMinRow = Infinity;
    let bMaxRow = -Infinity;

    for (const hex of entries) {
      if (hex.col < bMinCol) bMinCol = hex.col;
      if (hex.col > bMaxCol) bMaxCol = hex.col;
      if (hex.row < bMinRow) bMinRow = hex.row;
      if (hex.row > bMaxRow) bMaxRow = hex.row;
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
  }, [hexes]);
}
