import { describe, expect, test } from "vitest";
import { hexToRgba } from "../src/color";

describe("hexToRgba", () => {
  test("converts a hex color and percent opacity to rgba", () => {
    expect(hexToRgba("#7c3aed", 100)).toBe("rgba(124, 58, 237, 1)");
    expect(hexToRgba("#2563eb", 50)).toBe("rgba(37, 99, 235, 0.5)");
    expect(hexToRgba("#f97316", 20)).toBe("rgba(249, 115, 22, 0.2)");
  });
});
