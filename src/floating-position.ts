import type { FloatingEdgeSide } from "./types";

interface FloatingPosition {
  x: number;
  y: number;
}

interface FloatingEdgePosition {
  position: FloatingPosition;
  side: FloatingEdgeSide;
}

interface FloatingViewport {
  width: number;
  height: number;
}

export function snapFloatingButtonToEdge(
  position: FloatingPosition,
  viewport: FloatingViewport,
  buttonSize = 48,
  margin = 8
): FloatingEdgePosition {
  const clamped = clampFloatingButtonPosition(position, viewport, buttonSize, margin);
  const leftX = margin;
  const rightX = Math.max(margin, viewport.width - buttonSize - margin);
  const side: FloatingEdgeSide =
    Math.abs(clamped.x - leftX) <= Math.abs(clamped.x - rightX) ? "left" : "right";

  return {
    position: {
      x: side === "left" ? leftX : rightX,
      y: clamped.y
    },
    side
  };
}

export function getEdgeHiddenOffset(
  side: FloatingEdgeSide,
  visibleSize: number,
  buttonSize = 48,
  margin = 8
): number {
  const distance = Math.max(0, buttonSize - visibleSize + margin);
  return side === "left" ? -distance : distance;
}

export function clampFloatingButtonPosition(
  position: FloatingPosition,
  viewport: FloatingViewport,
  buttonSize = 48,
  margin = 8
): FloatingPosition {
  const maxX = Math.max(margin, viewport.width - buttonSize - margin);
  const maxY = Math.max(margin, viewport.height - buttonSize - margin);

  return {
    x: clamp(position.x, margin, maxX),
    y: clamp(position.y, margin, maxY)
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
