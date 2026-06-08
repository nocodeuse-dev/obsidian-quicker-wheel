interface FloatingPosition {
  x: number;
  y: number;
}

interface FloatingViewport {
  width: number;
  height: number;
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
