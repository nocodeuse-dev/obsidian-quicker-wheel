import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

const styles = readFileSync(new URL("../styles.css", import.meta.url), "utf8");

describe("wheel segment styles", () => {
  test("keeps divider lines visible when a wheel segment is highlighted", () => {
    expect(styles).toMatch(
      /\.obsidian-quicker-wheel-segment:hover,\s*\.obsidian-quicker-wheel-segment\.is-selected\s*\{[^}]*stroke:\s*var\(--quicker-wheel-divider-color\);/s
    );
  });
});
