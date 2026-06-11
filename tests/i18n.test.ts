import { afterEach, describe, expect, test } from "vitest";
import {
  getPluginLocale,
  resolvePluginLocale,
  setPluginLocale,
  t
} from "../src/i18n";
import {
  localizeBuiltinActionLabels,
  normalizeSettings
} from "../src/settings";
import { getActionSavedNotice } from "../src/action-editor";
import { executeWheelAction } from "../src/action-executor";

afterEach(() => {
  setPluginLocale("zh-cn");
});

describe("plugin internationalization", () => {
  test("uses Chinese for Chinese Obsidian locales", () => {
    expect(getPluginLocale("zh-cn")).toBe("zh");
    expect(getPluginLocale("zh-tw")).toBe("zh");
    setPluginLocale("zh-cn");
    expect(t("command.openWheel")).toBe("打开轮盘");
  });

  test("uses English for English and unsupported Obsidian locales", () => {
    expect(getPluginLocale("en")).toBe("en");
    expect(getPluginLocale("fr")).toBe("en");
    setPluginLocale("en-gb");
    expect(t("command.openWheel")).toBe("Open wheel");
  });

  test("resolves automatic and explicit language preferences", () => {
    expect(resolvePluginLocale("auto", "zh-cn")).toBe("zh");
    expect(resolvePluginLocale("auto", "en-gb")).toBe("en");
    expect(resolvePluginLocale("en", "zh-cn")).toBe("en");
    expect(resolvePluginLocale("zh", "en")).toBe("zh");
  });

  test("interpolates translated values", () => {
    setPluginLocale("en");
    expect(t("error.commandNotFound", { value: "app:test" }))
      .toBe("Command not found: app:test");
  });

  test("localizes untouched built-in action labels but preserves custom names", () => {
    const settings = normalizeSettings({
      actions: [
        {
          id: "command-palette",
          label: "命令",
          icon: "terminal",
          type: "command",
          commandId: "command-palette:open",
          enabled: true,
          ringIndex: 0,
          slotIndex: 0
        },
        {
          id: "quick-switcher",
          label: "My switcher",
          icon: "search",
          type: "command",
          commandId: "switcher:open",
          enabled: true,
          ringIndex: 0,
          slotIndex: 1
        }
      ]
    });

    setPluginLocale("en");
    localizeBuiltinActionLabels(settings);

    expect(settings.actions.find((action) => action.id === "command-palette")?.label)
      .toBe("Commands");
    expect(settings.actions.find((action) => action.id === "quick-switcher")?.label)
      .toBe("My switcher");
    expect(settings.actions.find((action) => action.placement === "center")?.label)
      .toBe("Plugin settings");
  });

  test("localizes notices and action execution errors", () => {
    setPluginLocale("en");

    expect(getActionSavedNotice("Test")).toBe('Action "Test" saved');
    expect(
      executeWheelAction(
        {
          id: "missing-command",
          label: "Test",
          icon: "star",
          type: "command",
          commandId: "missing:id",
          enabled: true,
          ringIndex: 0,
          slotIndex: 0
        },
        { executeCommandById: () => false }
      )
    ).toEqual({ ok: false, message: "Command not found: missing:id" });
  });
});
