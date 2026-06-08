import { describe, expect, test } from "vitest";
import {
  getWheelSlotActivation,
  isWheelActionSelected
} from "../src/wheel-interaction";
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

  test("never treats an empty slot as selected", () => {
    expect(isWheelActionSelected(undefined, undefined)).toBe(false);
  });

  test("selects only an action with the requested id", () => {
    expect(isWheelActionSelected(action, "action")).toBe(true);
    expect(isWheelActionSelected(action, "another-action")).toBe(false);
  });
});
