import { hexPointsString } from "../utils/hexMath";
import { QUEST_LEVEL_COLORS } from "../utils/colors";
import type { QuestLevel } from "../types";

interface HexOverlayProps {
  col: number;
  row: number;
  questLevel: QuestLevel;
  isRecurring: boolean;
  isSelected: boolean;
}

export function HexOverlay({
  col,
  row,
  questLevel,
  isRecurring,
  isSelected,
}: HexOverlayProps) {
  const points = hexPointsString(col, row);
  const glowColor = QUEST_LEVEL_COLORS[questLevel];
  const filterId = `glow-${col}-${row}`;

  return (
    <>
      <defs>
        <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow
            dx="0"
            dy="0"
            stdDeviation="3"
            floodColor={glowColor}
            floodOpacity="0.9"
          />
        </filter>
      </defs>
      <polygon
        points={points}
        fill="none"
        stroke={glowColor}
        strokeWidth={4}
        strokeDasharray={isRecurring ? "6 3" : undefined}
        filter={`url(#${filterId})`}
        pointerEvents="none"
      />
      {isSelected && (
        <polygon
          points={points}
          fill="none"
          stroke="#ffffff"
          strokeWidth={4}
          pointerEvents="none"
        />
      )}
    </>
  );
}
