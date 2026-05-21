import { hexToPixel, HEX_SIZE } from "../utils/hexMath";
import type { Landmark } from "../types";

interface LandmarkIconProps {
  col: number;
  row: number;
  landmark: Landmark;
  /** Optional override; defaults to HEX_SIZE * 0.5 (icon half-width). */
  size?: number;
}

/**
 * Draws a simple line-art icon for a hex landmark, centered on the hex.
 * Rendered between the hex fill and the quest-pin layer so pins always
 * stack on top.
 */
export function LandmarkIcon({
  col,
  row,
  landmark,
  size = HEX_SIZE * 0.5,
}: LandmarkIconProps) {
  const { x: cx, y: cy } = hexToPixel(col, row);
  const s = size;

  switch (landmark) {
    case "village":
      // A small thatched house: brown roof, cream walls, dark door.
      return (
        <g transform={`translate(${cx},${cy})`} pointerEvents="none">
          <path
            d={`M ${-s * 0.85},${-s * 0.05} L 0,${-s * 0.75} L ${s * 0.85},${-s * 0.05} Z`}
            fill="#7c2d12"
            stroke="#1a1a2e"
            strokeWidth={1}
            strokeLinejoin="round"
          />
          <rect
            x={-s * 0.65}
            y={-s * 0.05}
            width={s * 1.3}
            height={s * 0.7}
            fill="#fde68a"
            stroke="#1a1a2e"
            strokeWidth={1}
          />
          <rect
            x={-s * 0.15}
            y={s * 0.25}
            width={s * 0.3}
            height={s * 0.4}
            fill="#1a1a2e"
          />
        </g>
      );

    case "dungeon":
      // A stone archway with a black interior.
      return (
        <g transform={`translate(${cx},${cy})`} pointerEvents="none">
          <path
            d={`M ${-s * 0.7},${s * 0.65}
                L ${-s * 0.7},${-s * 0.15}
                A ${s * 0.7},${s * 0.7} 0 0,1 ${s * 0.7},${-s * 0.15}
                L ${s * 0.7},${s * 0.65} Z`}
            fill="#6b7280"
            stroke="#1a1a2e"
            strokeWidth={1}
            strokeLinejoin="round"
          />
          <path
            d={`M ${-s * 0.4},${s * 0.65}
                L ${-s * 0.4},${0}
                A ${s * 0.4},${s * 0.4} 0 0,1 ${s * 0.4},${0}
                L ${s * 0.4},${s * 0.65} Z`}
            fill="#0a0a0a"
          />
          {/* Keystone */}
          <rect
            x={-s * 0.08}
            y={-s * 0.5}
            width={s * 0.16}
            height={s * 0.18}
            fill="#9ca3af"
            stroke="#1a1a2e"
            strokeWidth={0.5}
          />
        </g>
      );

    case "ruins":
      // Two broken stone columns of differing heights with jagged tops.
      return (
        <g transform={`translate(${cx},${cy})`} pointerEvents="none">
          <path
            d={`M ${-s * 0.7},${s * 0.65}
                L ${-s * 0.7},${-s * 0.45}
                L ${-s * 0.55},${-s * 0.25}
                L ${-s * 0.4},${-s * 0.6}
                L ${-s * 0.25},${-s * 0.3}
                L ${-s * 0.15},${-s * 0.5}
                L ${-s * 0.15},${s * 0.65} Z`}
            fill="#9ca3af"
            stroke="#1a1a2e"
            strokeWidth={1}
            strokeLinejoin="round"
          />
          <path
            d={`M ${s * 0.15},${s * 0.65}
                L ${s * 0.15},${-s * 0.1}
                L ${s * 0.3},${-s * 0.3}
                L ${s * 0.45},${0}
                L ${s * 0.6},${-s * 0.25}
                L ${s * 0.7},${-s * 0.05}
                L ${s * 0.7},${s * 0.65} Z`}
            fill="#9ca3af"
            stroke="#1a1a2e"
            strokeWidth={1}
            strokeLinejoin="round"
          />
        </g>
      );

    case "tower":
      // Tall narrow tower with battlements on top, single window, door.
      return (
        <g transform={`translate(${cx},${cy})`} pointerEvents="none">
          {/* Body */}
          <rect
            x={-s * 0.4}
            y={-s * 0.55}
            width={s * 0.8}
            height={s * 1.2}
            fill="#9ca3af"
            stroke="#1a1a2e"
            strokeWidth={1}
          />
          {/* Battlements */}
          <path
            d={`M ${-s * 0.5},${-s * 0.55}
                L ${-s * 0.5},${-s * 0.8}
                L ${-s * 0.28},${-s * 0.8}
                L ${-s * 0.28},${-s * 0.65}
                L ${-s * 0.1},${-s * 0.65}
                L ${-s * 0.1},${-s * 0.8}
                L ${s * 0.1},${-s * 0.8}
                L ${s * 0.1},${-s * 0.65}
                L ${s * 0.28},${-s * 0.65}
                L ${s * 0.28},${-s * 0.8}
                L ${s * 0.5},${-s * 0.8}
                L ${s * 0.5},${-s * 0.55} Z`}
            fill="#9ca3af"
            stroke="#1a1a2e"
            strokeWidth={1}
            strokeLinejoin="miter"
          />
          {/* Window */}
          <rect
            x={-s * 0.09}
            y={-s * 0.3}
            width={s * 0.18}
            height={s * 0.22}
            fill="#1a1a2e"
          />
          {/* Door */}
          <rect
            x={-s * 0.13}
            y={s * 0.25}
            width={s * 0.26}
            height={s * 0.4}
            fill="#1a1a2e"
          />
        </g>
      );

    default:
      return null;
  }
}
