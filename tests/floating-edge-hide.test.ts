import { describe, expect, test } from "vitest";
import { getHiddenTapOutcome } from "../src/floating-edge-hide";

describe("floating edge-hide tap behavior", () => {
  test("opens the wheel from a hidden button when configured to open", () => {
    expect(getHiddenTapOutcome(true, "open")).toBe("open");
  });

  test("only reveals a hidden button when configured to reveal", () => {
    expect(getHiddenTapOutcome(true, "reveal")).toBe("reveal");
  });

  test("keeps normal short taps opening the wheel when already visible", () => {
    expect(getHiddenTapOutcome(false, "reveal")).toBe("open");
  });
});
