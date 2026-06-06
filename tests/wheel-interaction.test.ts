import { describe, expect, test } from "vitest";
import { getWheelSlotActivation } from "../src/wheel-interaction";
import type { WheelAction } from "../src/types";

const action: WheelAction = {
  id: "action",
  label: "Action",
  icon: "★",
  type: "command",
  commandId: "app:open-settings",
  enabled: true,
  ringIndex: 0,
  slotIndex: 0
};

describe("getWheelSlotActivation", () => {
  test("activates an existing action slot as an action", () => {
    expect(getWheelSlotActivation(action, true)).toBe("action");
  });

  test("activates an empty interactive slot for setup", () => {
    expect(getWheelSlotActivation(undefined, true)).toBe("slot");
  });

  test("also activates an empty settings preview slot for setup", () => {
    expect(getWheelSlotActivation(undefined, false)).toBe("slot");
  });
});
