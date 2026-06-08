import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

const iconsSource = readFileSync(new URL("../src/icons.ts", import.meta.url), "utf8");
const wheelModalSource = readFileSync(
  new URL("../src/wheel-modal.ts", import.meta.url),
  "utf8"
);

describe("Obsidian review compliance", () => {
  test("does not assign SVG markup through innerHTML", () => {
    expect(iconsSource).not.toMatch(/\.innerHTML\s*=/);
    expect(iconsSource).toContain("DOMParser");
  });

  test("uses window timer cleanup", () => {
    expect(wheelModalSource).not.toContain("activeWindow.clearTimeout");
    expect(wheelModalSource).toContain("window.clearTimeout(this.closeTimer)");
  });
});
