import { describe, expect, test } from "vitest";
import {
  getFloatingDirectionAngle,
  getFloatingGestureDirection,
  getFloatingGestureIntent
} from "../src/floating-gesture";
import type { FloatingGestureSettings } from "../src/types";

const gestureSettings: FloatingGestureSettings = {
  tapMaxMs: 260,
  swipeMaxMs: 650,
  longPressMoveMs: 1000,
  swipeDistance: 42,
  dragStartDistance: 8
};

describe("floating gesture detection", () => {
  test("treats a short stationary press as opening the wheel", () => {
    expect(
      getFloatingGestureIntent(
        { elapsedMs: 120, deltaX: 2, deltaY: -3 },
        gestureSettings
      )
    ).toEqual({ type: "open-wheel" });
  });

  test("maps a quick swipe to one of eight directions", () => {
    expect(getFloatingGestureDirection(60, 0)).toBe("right");
    expect(getFloatingGestureDirection(50, -50)).toBe("up-right");
    expect(getFloatingGestureDirection(0, -80)).toBe("up");
    expect(getFloatingGestureDirection(-50, -50)).toBe("up-left");
    expect(getFloatingGestureDirection(-70, 0)).toBe("left");
    expect(getFloatingGestureDirection(-50, 50)).toBe("down-left");
    expect(getFloatingGestureDirection(0, 70)).toBe("down");
    expect(getFloatingGestureDirection(50, 50)).toBe("down-right");

    expect(
      getFloatingGestureIntent(
        { elapsedMs: 240, deltaX: 64, deltaY: -12 },
        gestureSettings
      )
    ).toEqual({ type: "direction", direction: "right" });
  });

  test("maps directions to arrow angles", () => {
    expect(getFloatingDirectionAngle("right")).toBe(0);
    expect(getFloatingDirectionAngle("down-right")).toBe(45);
    expect(getFloatingDirectionAngle("down")).toBe(90);
    expect(getFloatingDirectionAngle("down-left")).toBe(135);
    expect(getFloatingDirectionAngle("left")).toBe(180);
    expect(getFloatingDirectionAngle("up-left")).toBe(225);
    expect(getFloatingDirectionAngle("up")).toBe(270);
    expect(getFloatingDirectionAngle("up-right")).toBe(315);
  });

  test("uses long press plus movement for moving the floating button", () => {
    expect(
      getFloatingGestureIntent(
        { elapsedMs: 1200, deltaX: 18, deltaY: 3 },
        gestureSettings
      )
    ).toEqual({ type: "move" });
  });
});
