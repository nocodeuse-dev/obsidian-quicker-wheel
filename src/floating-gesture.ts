import type {
  FloatingGestureDirection,
  FloatingGestureSettings
} from "./types";
import { tr } from "./i18n";

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

export function getFloatingDirectionLabel(direction: FloatingGestureDirection): string {
  const labels: Record<FloatingGestureDirection, [string, string]> = {
    up: ["上", "Up"],
    "up-right": ["右上", "Up right"],
    right: ["右", "Right"],
    "down-right": ["右下", "Down right"],
    down: ["下", "Down"],
    "down-left": ["左下", "Down left"],
    left: ["左", "Left"],
    "up-left": ["左上", "Up left"]
  };
  return tr(...labels[direction]);
}

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
