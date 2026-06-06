import type {
  FloatingGestureDirection,
  FloatingGestureSettings
} from "./types";

export interface FloatingGestureInput {
  elapsedMs: number;
  deltaX: number;
  deltaY: number;
}

export type FloatingGestureIntent =
  | { type: "open-wheel" }
  | { type: "direction"; direction: FloatingGestureDirection }
  | { type: "move" }
  | { type: "none" };

export const FLOATING_DIRECTIONS: FloatingGestureDirection[] = [
  "up",
  "up-right",
  "right",
  "down-right",
  "down",
  "down-left",
  "left",
  "up-left"
];

export const FLOATING_DIRECTION_LABELS: Record<FloatingGestureDirection, string> = {
  up: "上",
  "up-right": "右上",
  right: "右",
  "down-right": "右下",
  down: "下",
  "down-left": "左下",
  left: "左",
  "up-left": "左上"
};

export const FLOATING_DIRECTION_ANGLES: Record<FloatingGestureDirection, number> = {
  right: 0,
  "down-right": 45,
  down: 90,
  "down-left": 135,
  left: 180,
  "up-left": 225,
  up: 270,
  "up-right": 315
};

export function getFloatingDirectionAngle(direction: FloatingGestureDirection): number {
  return FLOATING_DIRECTION_ANGLES[direction];
}

export function getFloatingGestureIntent(
  input: FloatingGestureInput,
  settings: FloatingGestureSettings
): FloatingGestureIntent {
  const distance = Math.hypot(input.deltaX, input.deltaY);

  if (
    input.elapsedMs >= settings.longPressMoveMs &&
    distance >= settings.dragStartDistance
  ) {
    return { type: "move" };
  }

  if (
    input.elapsedMs <= settings.swipeMaxMs &&
    distance >= settings.swipeDistance
  ) {
    return {
      type: "direction",
      direction: getFloatingGestureDirection(input.deltaX, input.deltaY)
    };
  }

  if (
    input.elapsedMs <= settings.tapMaxMs &&
    distance < settings.dragStartDistance
  ) {
    return { type: "open-wheel" };
  }

  return { type: "none" };
}

export function getFloatingGestureDirection(
  deltaX: number,
  deltaY: number
): FloatingGestureDirection {
  const normalizedAngle = (Math.atan2(deltaY, deltaX) * 180) / Math.PI;
  const angle = (normalizedAngle + 360 + 22.5) % 360;
  const index = Math.floor(angle / 45);

  return [
    "right",
    "down-right",
    "down",
    "down-left",
    "left",
    "up-left",
    "up",
    "up-right"
  ][index] as FloatingGestureDirection;
}
