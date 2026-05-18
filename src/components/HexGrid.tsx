import { useState, useCallback, useRef, useEffect } from "react";
import { HexTile } from "./HexTile";
import { HexOverlay } from "./HexOverlay";
import { useGridSize } from "../hooks/useGridSize";
import { hexToPixel, hexPointsString, HEX_SIZE } from "../utils/hexMath";
import type { HexData, Quest, QuestLevel } from "../types";

interface HexGridProps {
  hexes: Map<string, HexData>;
  quests: Quest[];
  explorationHexes: Set<string>;
  selectedHex: { col: number; row: number } | null;
  onHexSelect: (col: number, row: number) => void;
}

function computeContentBox(grid: { minCol: number; maxCol: number; minRow: number; maxRow: number }) {
  const topLeft = hexToPixel(grid.minCol, grid.minRow);
  const bottomRight = hexToPixel(grid.maxCol, grid.maxRow);
  const padding = HEX_SIZE * 2;
  return {
    x: topLeft.x - padding,
    y: topLeft.y - padding,
    w: bottomRight.x - topLeft.x + padding * 2,
    h: bottomRight.y - topLeft.y + padding * 2,
  };
}

export function HexGrid({
  hexes,
  quests,
  explorationHexes,
  selectedHex,
  onHexSelect,
}: HexGridProps) {
  const grid = useGridSize(hexes);
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0 });

  // Build a lookup: "col_row" -> quest info for that hex
  const questsByHex = new Map<string, { level: QuestLevel; isRecurring: boolean }>();
  for (const quest of quests) {
    if (quest.status === "completed") continue;
    const key = `${quest.hexCol}_${quest.hexRow}`;
    const existing = questsByHex.get(key);
    if (!existing) {
      questsByHex.set(key, {
        level: quest.level,
        isRecurring: quest.level === "recurring",
      });
    }
  }

  // Add exploration quest markers for unknown hexes adjacent to known terrain
  for (const key of explorationHexes) {
    if (!questsByHex.has(key)) {
      questsByHex.set(key, { level: "explore", isRecurring: false });
    }
  }

  // Fit content to viewport, preserving aspect ratio
  useEffect(() => {
    const content = computeContentBox(grid);
    const container = containerRef.current;
    if (!container) {
      setViewBox(content);
      return;
    }

    const containerW = container.clientWidth;
    const containerH = container.clientHeight;
    if (containerW === 0 || containerH === 0) {
      setViewBox(content);
      return;
    }

    const contentAspect = content.w / content.h;
    const containerAspect = containerW / containerH;

    let finalW: number;
    let finalH: number;

    if (contentAspect > containerAspect) {
      finalW = content.w;
      finalH = content.w / containerAspect;
    } else {
      finalH = content.h;
      finalW = content.h * containerAspect;
    }

    setViewBox({
      x: content.x - (finalW - content.w) / 2,
      y: content.y - (finalH - content.h) / 2,
      w: finalW,
      h: finalH,
    });
  }, [grid]);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;

      const svg = svgRef.current;
      if (!svg) return;

      const rect = svg.getBoundingClientRect();
      const mouseX = (e.clientX - rect.left) / rect.width;
      const mouseY = (e.clientY - rect.top) / rect.height;

      setViewBox((prev) => {
        const newW = prev.w * zoomFactor;
        const newH = prev.h * zoomFactor;
        return {
          x: prev.x - (newW - prev.w) * mouseX,
          y: prev.y - (newH - prev.h) * mouseY,
          w: newW,
          h: newH,
        };
      });
    },
    []
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 1 && e.button !== 0) return;
      if (e.button === 1 || e.shiftKey) {
        setIsPanning(true);
        panStart.current = { x: e.clientX, y: e.clientY };
        e.preventDefault();
      }
    },
    []
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isPanning) return;
      const svg = svgRef.current;
      if (!svg) return;

      const rect = svg.getBoundingClientRect();
      const dx = ((e.clientX - panStart.current.x) / rect.width) * viewBox.w;
      const dy = ((e.clientY - panStart.current.y) / rect.height) * viewBox.h;

      setViewBox((prev) => ({
        ...prev,
        x: prev.x - dx,
        y: prev.y - dy,
      }));
      panStart.current = { x: e.clientX, y: e.clientY };
    },
    [isPanning, viewBox.w, viewBox.h]
  );

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Pass 1: base hex fills
  const fills: React.ReactNode[] = [];
  // Pass 2: quest/selection overlays
  const overlays: React.ReactNode[] = [];

  for (let col = grid.minCol; col <= grid.maxCol; col++) {
    for (let row = grid.minRow; row <= grid.maxRow; row++) {
      const key = `${col}_${row}`;
      const hexData = hexes.get(key);
      const terrain = hexData?.terrain ?? "unknown";
      const questInfo = questsByHex.get(key);
      const isSelected = selectedHex?.col === col && selectedHex?.row === row;

      fills.push(
        <HexTile
          key={key}
          col={col}
          row={row}
          terrain={terrain}
          onClick={onHexSelect}
        />
      );

      if (questInfo) {
        overlays.push(
          <HexOverlay
            key={`overlay-${key}`}
            col={col}
            row={row}
            questLevel={questInfo.level}
            isRecurring={questInfo.isRecurring}
            isSelected={isSelected}
          />
        );
      } else if (isSelected) {
        // Selection border for hexes without quests
        overlays.push(
          <polygon
            key={`sel-${key}`}
            points={hexPointsString(col, row)}
            fill="none"
            stroke="#ffffff"
            strokeWidth={4}
            pointerEvents="none"
          />
        );
      }
    }
  }

  return (
    <div ref={containerRef} style={{ width: "100%", height: "100%" }}>
      <svg
        ref={svgRef}
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
        preserveAspectRatio="xMidYMid meet"
        style={{
          width: "100%",
          height: "100%",
          cursor: isPanning ? "grabbing" : "default",
        }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <g>{fills}</g>
        <g>{overlays}</g>
      </svg>
    </div>
  );
}
