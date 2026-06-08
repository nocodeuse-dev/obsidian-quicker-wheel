import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

const styles = readFileSync(new URL("../styles.css", import.meta.url), "utf8");

describe("wheel segment styles", () => {
  test("uses a red outline without recoloring the selected segment", () => {
    expect(styles).toMatch(
      /\.obsidian-quicker-wheel-segment\.is-selected\s*\{[^}]*fill:\s*var\(--quicker-wheel-action-color\);[^}]*stroke:\s*var\(--quicker-wheel-selected-border-color\);/s
    );
  });

  test("uses the configured readable color for action labels", () => {
    expect(styles).toMatch(
      /\.obsidian-quicker-wheel-label\s*\{[^}]*color:\s*var\(--quicker-wheel-text-color\);/s
    );
  });

  test("does not display content in empty slots", () => {
    expect(styles).toMatch(
      /\.obsidian-quicker-wheel-label\.is-empty\s*\{[^}]*display:\s*none;/s
    );
  });
});
