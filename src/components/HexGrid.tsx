import { useState, useCallback, useRef, useEffect } from "react";
import { HexTile } from "./HexTile";
import { useGridSize } from "../hooks/useGridSize";
import { hexToPixel, hexPointsString, HEX_SIZE } from "../utils/hexMath";
import { QUEST_LEVEL_COLORS } from "../utils/colors";
import type { HexData, Quest } from "../types";

interface HexGridProps {
  hexes: Map<string, HexData>;
  quests: Quest[];
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
  selectedHex,
  onHexSelect,
}: HexGridProps) {
  const grid = useGridSize(hexes);
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0 });

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

  const fills: React.ReactNode[] = [];
  const selectionOverlays: React.ReactNode[] = [];

  for (let col = grid.minCol; col <= grid.maxCol; col++) {
    for (let row = grid.minRow; row <= grid.maxRow; row++) {
      const key = `${col}_${row}`;
      const hexData = hexes.get(key);
      const terrain = hexData?.terrain ?? "unknown";
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

      if (isSelected) {
        selectionOverlays.push(
          <polygon
            key={`sel-${key}`}
            points={hexPointsString(col, row)}
            fill="none"
            stroke="#ffffff"
            strokeWidth={3}
            pointerEvents="none"
          />
        );
      }
    }
  }

  const pinSize = HEX_SIZE * 0.35;

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
        <g>{selectionOverlays}</g>
        <g>
          {quests
            .filter((q) => q.status !== "completed")
            .map((quest) => {
              const start = hexToPixel(quest.hexCol, quest.hexRow);
              const color = QUEST_LEVEL_COLORS[quest.level];
              const hasEnd =
                quest.endHexCol != null && quest.endHexRow != null;
              const end = hasEnd
                ? hexToPixel(quest.endHexCol!, quest.endHexRow!)
                : null;

              return (
                <g key={`route-${quest.id}`} pointerEvents="none">
                  {/* Dotted line between start and end */}
                  {end && (
                    <line
                      x1={start.x}
                      y1={start.y}
                      x2={end.x}
                      y2={end.y}
                      stroke={color}
                      strokeWidth={2}
                      strokeDasharray="6 4"
                      opacity={0.7}
                    />
                  )}
                  {/* Start pin */}
                  <QuestPin x={start.x} y={start.y} color={color} size={pinSize} />
                  {/* End pin */}
                  {end && (
                    <QuestPin x={end.x} y={end.y} color={color} size={pinSize} />
                  )}
                </g>
              );
            })}
        </g>
      </svg>
    </div>
  );
}

function QuestPin({
  x,
  y,
  color,
  size,
}: {
  x: number;
  y: number;
  color: string;
  size: number;
}) {
  // Pin shape: teardrop pointing down, centered on hex
  const pinHeight = size * 2.5;
  const pinTop = y - pinHeight;
  const r = size;

  return (
    <g>
      {/* Pin shadow */}
      <ellipse
        cx={x}
        cy={y + 2}
        rx={r * 0.5}
        ry={r * 0.2}
        fill="rgba(0,0,0,0.3)"
      />
      {/* Pin body: path from circle top down to point */}
      <path
        d={`M ${x} ${y}
            Q ${x - r * 1.2} ${pinTop + r * 0.8} ${x} ${pinTop}
            Q ${x + r * 1.2} ${pinTop + r * 0.8} ${x} ${y} Z`}
        fill={color}
        stroke="#000"
        strokeWidth={0.5}
      />
      {/* Inner dot */}
      <circle
        cx={x}
        cy={pinTop + r * 0.55}
        r={r * 0.35}
        fill="#000"
        opacity={0.3}
      />
    </g>
  );
}
