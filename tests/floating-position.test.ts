import { describe, expect, test } from "vitest";
import { clampFloatingButtonPosition } from "../src/floating-position";

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
