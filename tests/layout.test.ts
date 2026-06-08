import { describe, expect, test } from "vitest";
import {
  buildWheelSlots,
  calculateWheelRenderSize,
  findActionForSlot,
  getWheelViewportSize
} from "../src/wheel-layout";
import type { WheelAction } from "../src/types";

describe("buildWheelSlots", () => {
  test("builds slots for every ring and sector", () => {
    const slots = buildWheelSlots({ ringCount: 2, slotsPerRing: 8 });

    expect(slots).toHaveLength(16);
    expect(slots[0]).toMatchObject({
      ringIndex: 0,
      slotIndex: 0,
      startAngle: -90,
      endAngle: -45
    });
    expect(slots[15]).toMatchObject({
      ringIndex: 1,
      slotIndex: 7,
      startAngle: 225,
      endAngle: 270
    });
  });

  test("finds only enabled actions in the requested slot", () => {
    const actions: WheelAction[] = [
      {
        id: "disabled",
        label: "Disabled",
        icon: "x",
        type: "command",
        commandId: "app:disabled",
        enabled: false,
        ringIndex: 0,
        slotIndex: 0
      },
      {
        id: "enabled",
        label: "Enabled",
        icon: "ok",
        type: "command",
        commandId: "app:enabled",
        enabled: true,
        ringIndex: 0,
        slotIndex: 0
      }
    ];

    expect(findActionForSlot(actions, 0, 0)?.id).toBe("enabled");
    expect(findActionForSlot(actions, 1, 0)).toBeUndefined();
  });

  test("does not treat the center action as a ring slot action", () => {
    const actions: WheelAction[] = [
      {
        id: "center",
        label: "插件设置",
        icon: "zap",
        type: "command",
        commandId: "quicker-wheel:open-settings",
        enabled: true,
        ringIndex: 0,
        slotIndex: 0,
        placement: "center"
      }
    ];

    expect(findActionForSlot(actions, 0, 0)).toBeUndefined();
  });

  test("calculates a phone-safe render size from viewport constraints", () => {
    expect(calculateWheelRenderSize({ preferredSize: 420, viewportWidth: 390, viewportHeight: 740 })).toBe(342);
    expect(calculateWheelRenderSize({ preferredSize: 320, viewportWidth: 390, viewportHeight: 740 })).toBe(320);
    expect(calculateWheelRenderSize({ preferredSize: 720, viewportWidth: 280, viewportHeight: 520 })).toBe(232);
  });

  test("uses visual viewport dimensions when available", () => {
    const ownerWindow = {
      innerWidth: 800,
      innerHeight: 900,
      visualViewport: {
        width: 390.4,
        height: 701.6
      }
    } as Window;

    expect(getWheelViewportSize(ownerWindow)).toEqual({ width: 390, height: 702 });
  });

  test("falls back to inner window dimensions without visual viewport", () => {
    const ownerWindow = {
      innerWidth: 412,
      innerHeight: 732
    } as Window;

    expect(getWheelViewportSize(ownerWindow)).toEqual({ width: 412, height: 732 });
  });
});
