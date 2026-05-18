import { hexPointsString } from "../utils/hexMath";
import { TERRAIN_COLORS } from "../utils/colors";
import type { TerrainType } from "../types";

interface HexTileProps {
  col: number;
  row: number;
  terrain: TerrainType;
  onClick: (col: number, row: number) => void;
}

export function HexTile({ col, row, terrain, onClick }: HexTileProps) {
  const points = hexPointsString(col, row);
  const fillColor = TERRAIN_COLORS[terrain];

  return (
    <polygon
      points={points}
      fill={fillColor}
      stroke="#1a1a2e"
      strokeWidth={1}
      className="hex-hover"
      onClick={() => onClick(col, row)}
      style={{ cursor: "pointer" }}
    />
  );
}
