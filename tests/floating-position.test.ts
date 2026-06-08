import { describe, expect, test } from "vitest";
import {
  clampFloatingButtonPosition,
  getEdgeHiddenOffset,
  snapFloatingButtonToEdge
} from "../src/floating-position";

describe("clampFloatingButtonPosition", () => {
  test("moves a desktop position back inside an iPhone viewport", () => {
    expect(
      clampFloatingButtonPosition(
        { x: 1461, y: 552 },
        { width: 390, height: 844 },
        48,
        8
      )
    ).toEqual({ x: 334, y: 552 });
  });

  test("keeps the button inside every viewport edge", () => {
    expect(
      clampFloatingButtonPosition(
        { x: -50, y: 2000 },
        { width: 390, height: 844 },
        48,
        8
      )
    ).toEqual({ x: 8, y: 788 });
  });
});

describe("floating edge hiding", () => {
  test("snaps to the nearest horizontal edge without changing vertical position", () => {
    expect(
      snapFloatingButtonToEdge(
        { x: 40, y: 320 },
        { width: 390, height: 844 }
      )
    ).toEqual({ position: { x: 8, y: 320 }, side: "left" });

    expect(
      snapFloatingButtonToEdge(
        { x: 300, y: 320 },
        { width: 390, height: 844 }
      )
    ).toEqual({ position: { x: 334, y: 320 }, side: "right" });
  });

  test("computes the translation needed to leave the configured width visible", () => {
    expect(getEdgeHiddenOffset("left", 14, 48, 8)).toBe(-42);
    expect(getEdgeHiddenOffset("right", 14, 48, 8)).toBe(42);
    expect(getEdgeHiddenOffset("left", 32, 48, 8)).toBe(-24);
  });
});
