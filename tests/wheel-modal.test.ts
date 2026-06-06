import { describe, expect, test } from "vitest";
import { shouldCloseWheelFromPointerTarget } from "../src/dom-events";

describe("shouldCloseWheelFromPointerTarget", () => {
  test("closes when tapping the blank modal host", () => {
    const host = new EventTarget();

    expect(shouldCloseWheelFromPointerTarget(host, host)).toBe(true);
  });

  test("keeps the wheel open when tapping inside the wheel", () => {
    const host = new EventTarget();
    const wheelButton = new EventTarget();

    expect(shouldCloseWheelFromPointerTarget(wheelButton, host)).toBe(false);
  });
});
