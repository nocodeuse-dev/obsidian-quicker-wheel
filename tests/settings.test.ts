import { describe, expect, test } from "vitest";
import {
  createDefaultCenterAction,
  createOrSelectActionForSlot,
  DEFAULT_SETTINGS,
  getCenterAction,
  resetCenterAction,
  normalizeSettings
} from "../src/settings";

describe("normalizeSettings", () => {
  test("fills missing settings with mobile-friendly defaults", () => {
    const settings = normalizeSettings({});

    expect(settings.language).toBe("auto");
    expect(settings.wheel.ringCount).toBe(2);
    expect(settings.wheel.slotsPerRing).toBe(8);
    expect(settings.wheel.size).toBe(340);
    expect(settings.wheel.textSize).toBe(11);
    expect(settings.wheel.timeoutMs).toBe(20000);
    expect(settings.wheel.opacity).toBe(100);
    expect(settings.wheel.appearance.theme).toBe("soft");
    expect(settings.wheel.appearance.segmentColor).toBe("#fbfbfc");
    expect(settings.wheel.appearance.actionSegmentColor).toBe("#fbfbfc");
    expect(settings.wheel.appearance.emptySegmentColor).toBe("#fbfbfc");
    expect(settings.wheel.appearance.textColor).toBe("#242428");
    expect(settings.wheel.appearance.selectedBorderColor).toBe("#ef4444");
    expect(settings.wheel.appearance.dividerColor).toBe("#d8d8de");
    expect(settings.wheel.appearance.centerSize).toBe(17);
    expect(settings.wheel.appearance.emptySlotDisplay).toBe("hidden");
    expect(settings.floatingButton.mobileEnabled).toBe(true);
    expect(settings.floatingButton.desktopEnabled).toBe(true);
    expect(settings.floatingButton.gesture.tapMaxMs).toBe(260);
    expect(settings.floatingButton.gesture.swipeMaxMs).toBe(650);
    expect(settings.floatingButton.gesture.longPressMoveMs).toBe(1000);
    expect(settings.floatingButton.directionActions.right.commandId).toBe("");
    expect(settings.floatingButton.directionActions.right.type).toBe("command");
    expect(settings.floatingButton.colors.default).toBe("#7c3aed");
    expect(settings.floatingButton.colors.tap).toBe("#2563eb");
    expect(settings.floatingButton.colors.swipe).toBe("#f97316");
    expect(settings.floatingButton.colors.move).toBe("#16a34a");
    expect(settings.floatingButton.textColor).toBe("#1f1533");
    expect(settings.floatingButton.opacity.default).toBe(100);
    expect(settings.floatingButton.opacity.tap).toBe(100);
    expect(settings.floatingButton.opacity.swipe).toBe(100);
    expect(settings.floatingButton.opacity.move).toBe(100);
    expect(settings.floatingButton.edgeHide).toEqual({
      enabled: false,
      delayMs: 3000,
      visibleSize: 14,
      tapBehavior: "open"
    });
    expect(settings.actions.length).toBeGreaterThan(0);
    expect(settings.actions[0]).toMatchObject({
      type: "command",
      enabled: true,
      ringIndex: 0,
      slotIndex: 0
    });
    expect(getCenterAction(settings.actions)).toMatchObject({
      label: "插件设置",
      icon: "zap",
      type: "command",
      commandId: "quicker-wheel:open-settings",
      placement: "center"
    });
  });

  test("adds the default center action when migrating existing actions", () => {
    const settings = normalizeSettings({
      actions: [
        {
          id: "existing",
          label: "Existing",
          icon: "star",
          type: "command",
          commandId: "app:open-settings",
          enabled: true,
          ringIndex: 0,
          slotIndex: 0
        }
      ]
    });

    expect(settings.actions).toHaveLength(2);
    expect(getCenterAction(settings.actions)?.commandId).toBe("quicker-wheel:open-settings");
  });

  test("preserves a customized center action", () => {
    const settings = normalizeSettings({
      actions: [
        {
          id: "custom-center",
          label: "主页",
          icon: "home",
          type: "file",
          filePath: "主页.md",
          enabled: true,
          ringIndex: 0,
          slotIndex: 0,
          placement: "center"
        }
      ]
    });

    expect(getCenterAction(settings.actions)).toMatchObject({
      id: "custom-center",
      label: "主页",
      icon: "home",
      type: "file",
      filePath: "主页.md"
    });
  });

  test("restores the default action when resetting the center", () => {
    const settings = normalizeSettings({
      actions: [
        {
          ...createDefaultCenterAction(),
          label: "Custom",
          icon: "home",
          commandId: "app:open-settings"
        }
      ]
    });

    const restored = resetCenterAction(settings);

    expect(restored).toMatchObject({
      label: "插件设置",
      icon: "zap",
      commandId: "quicker-wheel:open-settings",
      placement: "center"
    });
    expect(getCenterAction(settings.actions)).toBe(restored);
  });

  test("falls back to defaults for invalid stored data", () => {
    const settings = normalizeSettings("broken");

    expect(settings.wheel.ringCount).toBe(DEFAULT_SETTINGS.wheel.ringCount);
    expect(settings.floatingButton.mobileEnabled).toBe(true);
    expect(settings.actions.length).toBeGreaterThan(0);
  });

  test("normalizes language preference", () => {
    expect(normalizeSettings({ language: "en" }).language).toBe("en");
    expect(normalizeSettings({ language: "zh" }).language).toBe("zh");
    expect(normalizeSettings({ language: "broken" }).language).toBe("auto");
  });

  test("accepts 1 percent floating opacity and clamps invalid values", () => {
    const settings = normalizeSettings({
      floatingButton: {
        opacity: {
          default: 1,
          tap: 50,
          swipe: 0,
          move: 101
        }
      }
    });

    expect(settings.floatingButton.opacity).toEqual({
      default: 1,
      tap: 50,
      swipe: 1,
      move: 100
    });
  });

  test("normalizes edge-hide settings without changing existing positions", () => {
    const settings = normalizeSettings({
      floatingButton: {
        x: 280,
        y: 640,
        edgeHide: {
          enabled: true,
          delayMs: 12000,
          visibleSize: 4,
          tapBehavior: "reveal"
        }
      }
    });

    expect(settings.floatingButton.x).toBe(280);
    expect(settings.floatingButton.y).toBe(640);
    expect(settings.floatingButton.edgeHide).toEqual({
      enabled: true,
      delayMs: 10000,
      visibleSize: 8,
      tapBehavior: "reveal"
    });
  });

  test("upgrades the original default wheel appearance without overriding customized values", () => {
    const migrated = normalizeSettings({
      wheel: {
        appearance: {
          theme: "soft",
          segmentColor: "#ffffff",
          actionSegmentColor: "#f2edff",
          emptySegmentColor: "#ffffff",
          highlightColor: "#c4b5fd",
          dividerColor: "#ded8ea",
          dividerWidth: 1,
          centerColor: "#ffffff",
          centerIconColor: "#7c3aed",
          centerSize: 15,
          shadow: "soft",
          emptySlotDisplay: "full"
        }
      }
    });
    const customized = normalizeSettings({
      wheel: {
        appearance: {
          theme: "soft",
          segmentColor: "#ffffff",
          actionSegmentColor: "#abcdef",
          emptySegmentColor: "#ffffff",
          highlightColor: "#c4b5fd",
          dividerColor: "#ded8ea",
          dividerWidth: 1,
          centerColor: "#ffffff",
          centerIconColor: "#7c3aed",
          centerSize: 15,
          shadow: "soft",
          emptySlotDisplay: "full"
        }
      }
    });

    expect(migrated.wheel.appearance).toEqual(DEFAULT_SETTINGS.wheel.appearance);
    expect(customized.wheel.appearance.actionSegmentColor).toBe("#abcdef");
    expect(customized.wheel.appearance.emptySlotDisplay).toBe("full");
  });

  test("upgrades the previous colorful default wheel appearance", () => {
    const settings = normalizeSettings({
      wheel: {
        appearance: {
          theme: "soft",
          segmentColor: "#f8f7fc",
          actionSegmentColor: "#eee9ff",
          emptySegmentColor: "#fbfaff",
          highlightColor: "#ddd2ff",
          dividerColor: "#d9d4e3",
          dividerWidth: 1,
          centerColor: "#ffffff",
          centerIconColor: "#7c3aed",
          centerSize: 17,
          shadow: "soft",
          emptySlotDisplay: "icon"
        }
      }
    });

    expect(settings.wheel.appearance).toEqual(DEFAULT_SETTINGS.wheel.appearance);
  });

  test("clamps unsafe numeric values and preserves known action data", () => {
    const settings = normalizeSettings({
      wheel: {
        ringCount: 9,
        slotsPerRing: 2,
        size: 100,
        textSize: 40,
        timeoutMs: 100,
        opacity: 1,
        appearance: {
          theme: "broken",
          segmentColor: "#123456",
          actionSegmentColor: "bad",
          emptySegmentColor: "#abcdef",
          highlightColor: "#ABCDEF",
          dividerColor: "#123",
          dividerWidth: 99,
          centerColor: "#654321",
          centerIconColor: "nope",
          centerSize: 99,
          shadow: "wild",
          emptySlotDisplay: "gone"
        }
      },
      actions: [
        {
          id: "custom",
          label: "自定义",
          icon: "⭐",
          type: "command",
          commandId: "app:open-settings",
          enabled: true,
          ringIndex: 5,
          slotIndex: 99
        }
      ]
    });

    expect(settings.wheel).toMatchObject({
      ringCount: 3,
      slotsPerRing: 4,
      size: 240,
      textSize: 24,
      timeoutMs: 1000,
      opacity: 20,
      appearance: {
        theme: DEFAULT_SETTINGS.wheel.appearance.theme,
        segmentColor: "#123456",
        actionSegmentColor: DEFAULT_SETTINGS.wheel.appearance.actionSegmentColor,
        emptySegmentColor: "#abcdef",
        highlightColor: "#abcdef",
        textColor: DEFAULT_SETTINGS.wheel.appearance.textColor,
        selectedBorderColor: DEFAULT_SETTINGS.wheel.appearance.selectedBorderColor,
        dividerColor: DEFAULT_SETTINGS.wheel.appearance.dividerColor,
        dividerWidth: 4,
        centerColor: "#654321",
        centerIconColor: DEFAULT_SETTINGS.wheel.appearance.centerIconColor,
        centerSize: 24,
        shadow: DEFAULT_SETTINGS.wheel.appearance.shadow,
        emptySlotDisplay: DEFAULT_SETTINGS.wheel.appearance.emptySlotDisplay
      }
    });
    expect(settings.actions[0]).toMatchObject({
      id: "custom",
      label: "自定义",
      commandId: "app:open-settings",
      ringIndex: 2,
      slotIndex: 3
    });
  });

  test("does not share mutable defaults between calls", () => {
    const first = normalizeSettings({});
    first.actions[0].label = "Changed";

    const second = normalizeSettings({});

    expect(second.actions[0].label).toBe(DEFAULT_SETTINGS.actions[0].label);
  });

  test("migrates built-in default action icons away from emoji and text fallbacks", () => {
    const settings = normalizeSettings({
      actions: [
        {
          id: "command-palette",
          label: "命令",
          icon: "CMD",
          type: "command",
          commandId: "command-palette:open",
          enabled: true,
          ringIndex: 0,
          slotIndex: 0
        },
        {
          id: "quick-switcher",
          label: "切换",
          icon: "🔎",
          type: "command",
          commandId: "switcher:open",
          enabled: true,
          ringIndex: 0,
          slotIndex: 1
        },
        {
          id: "new-note",
          label: "新建",
          icon: "＋",
          type: "command",
          commandId: "file-explorer:new-file",
          enabled: true,
          ringIndex: 0,
          slotIndex: 2
        },
        {
          id: "settings",
          label: "设置",
          icon: "SET",
          type: "command",
          commandId: "app:open-settings",
          enabled: true,
          ringIndex: 0,
          slotIndex: 3
        }
      ]
    });

    expect(settings.actions.map((action) => action.icon)).toEqual([
      "terminal",
      "search",
      "file-plus",
      "settings",
      "zap"
    ]);
  });

  test("preserves existing action object references while normalizing saved settings", () => {
    const settings = normalizeSettings({
      actions: [
        {
          id: "action",
          label: "新动作",
          icon: "★",
          type: "command",
          commandId: "",
          enabled: true,
          ringIndex: 0,
          slotIndex: 0
        }
      ]
    });
    const actionRef = settings.actions[0];

    const normalized = normalizeSettings(settings);

    expect(normalized.actions[0]).toBe(actionRef);
  });

  test("migrates the legacy floating button enabled flag to platform-specific switches", () => {
    const enabledSettings = normalizeSettings({ floatingButton: { enabled: true } });
    const disabledSettings = normalizeSettings({ floatingButton: { enabled: false } });

    expect(enabledSettings.floatingButton.mobileEnabled).toBe(true);
    expect(enabledSettings.floatingButton.desktopEnabled).toBe(true);
    expect(disabledSettings.floatingButton.mobileEnabled).toBe(false);
    expect(disabledSettings.floatingButton.desktopEnabled).toBe(false);
  });

  test("clamps floating gesture timings and migrates legacy direction commands", () => {
    const settings = normalizeSettings({
      floatingButton: {
        gesture: {
          tapMaxMs: 20,
          swipeMaxMs: 9000,
          longPressMoveMs: 99,
          swipeDistance: 500,
          dragStartDistance: -1
        },
        directionCommands: {
          up: "app:open-settings",
          right: "command-palette:open"
        }
      }
    });

    expect(settings.floatingButton.gesture).toMatchObject({
      tapMaxMs: 80,
      swipeMaxMs: 2000,
      longPressMoveMs: 250,
      swipeDistance: 180,
      dragStartDistance: 1
    });
    expect(settings.floatingButton.directionActions.up.commandId).toBe("app:open-settings");
    expect(settings.floatingButton.directionActions.right.commandId).toBe("command-palette:open");
    expect(settings.floatingButton.directionActions.down.commandId).toBe("");
  });

  test("preserves floating direction file actions", () => {
    const settings = normalizeSettings({
      floatingButton: {
        directionActions: {
          up: {
            type: "file",
            filePath: "Projects/Index.md",
            enabled: true
          }
        }
      }
    });

    expect(settings.floatingButton.directionActions.up).toMatchObject({
      type: "file",
      filePath: "Projects/Index.md",
      enabled: true
    });
  });

  test("preserves floating direction wheel action references", () => {
    const settings = normalizeSettings({
      floatingButton: {
        directionActions: {
          right: {
            type: "wheelAction",
            actionId: "collect",
            enabled: true
          }
        }
      }
    });

    expect(settings.floatingButton.directionActions.right).toMatchObject({
      type: "wheelAction",
      actionId: "collect",
      enabled: true
    });
  });

  test("normalizes floating button colors", () => {
    const settings = normalizeSettings({
      floatingButton: {
        colors: {
          default: "#123abc",
          tap: "not-a-color",
          swipe: "#ABCDEF",
          move: "#000"
        }
      }
    });

    expect(settings.floatingButton.colors.default).toBe("#123abc");
    expect(settings.floatingButton.colors.tap).toBe(DEFAULT_SETTINGS.floatingButton.colors.tap);
    expect(settings.floatingButton.colors.swipe).toBe("#abcdef");
    expect(settings.floatingButton.colors.move).toBe(DEFAULT_SETTINGS.floatingButton.colors.move);
  });

  test("normalizes the floating button text color", () => {
    expect(
      normalizeSettings({
        floatingButton: {
          textColor: "#ABCDEF"
        }
      }).floatingButton.textColor
    ).toBe("#abcdef");
    expect(
      normalizeSettings({
        floatingButton: {
          textColor: "not-a-color"
        }
      }).floatingButton.textColor
    ).toBe(DEFAULT_SETTINGS.floatingButton.textColor);
  });

  test("normalizes floating button opacity", () => {
    const settings = normalizeSettings({
      floatingButton: {
        opacity: {
          default: 10,
          tap: 50,
          swipe: 120,
          move: Number.NaN
        }
      }
    });

    expect(settings.floatingButton.opacity.default).toBe(10);
    expect(settings.floatingButton.opacity.tap).toBe(50);
    expect(settings.floatingButton.opacity.swipe).toBe(100);
    expect(settings.floatingButton.opacity.move).toBe(100);
  });

  test("preserves file actions and file paths", () => {
    const settings = normalizeSettings({
      actions: [
        {
          id: "file-action",
          label: "打开项目",
          icon: "📄",
          type: "file",
          filePath: "Projects/Index.md",
          enabled: true,
          ringIndex: 0,
          slotIndex: 4
        }
      ]
    });

    expect(settings.actions[0]).toMatchObject({
      id: "file-action",
      type: "file",
      filePath: "Projects/Index.md"
    });
  });

  test("creates an action for an empty wheel slot", () => {
    const settings = normalizeSettings({ actions: [] });
    settings.actions = [];

    const result = createOrSelectActionForSlot(settings, 1, 3);

    expect(result.created).toBe(true);
    expect(result.action).toMatchObject({
      label: "新动作",
      ringIndex: 1,
      slotIndex: 3
    });
    expect(settings.actions).toContain(result.action);
  });

  test("reuses an existing action for a wheel slot", () => {
    const settings = normalizeSettings({
      actions: [
        {
          id: "existing",
          label: "Existing",
          icon: "★",
          type: "command",
          commandId: "",
          enabled: false,
          ringIndex: 1,
          slotIndex: 3
        }
      ]
    });

    const result = createOrSelectActionForSlot(settings, 1, 3);

    expect(result.created).toBe(false);
    expect(result.action.id).toBe("existing");
    expect(settings.actions).toHaveLength(2);
    expect(getCenterAction(settings.actions)).toBeDefined();
  });
});
