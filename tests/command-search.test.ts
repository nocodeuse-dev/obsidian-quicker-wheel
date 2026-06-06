import { describe, expect, test } from "vitest";
import {
  filterObsidianCommands,
  getCommandInputDisplayValue
} from "../src/obsidian-commands";
import type { ObsidianCommand } from "../src/obsidian-commands";

const commands: ObsidianCommand[] = [
  { id: "app:open-settings", name: "打开设置" },
  { id: "command-palette:open", name: "打开命令面板" },
  { id: "file-explorer:new-file", name: "新建笔记" }
];

describe("filterObsidianCommands", () => {
  test("filters by command name", () => {
    expect(filterObsidianCommands(commands, "设置").map((command) => command.id)).toEqual([
      "app:open-settings"
    ]);
  });

  test("filters by command id case-insensitively and trims input", () => {
    expect(filterObsidianCommands(commands, "  OPEN  ").map((command) => command.id)).toEqual([
      "app:open-settings",
      "command-palette:open"
    ]);
  });

  test("returns all commands for empty query", () => {
    expect(filterObsidianCommands(commands, "").map((command) => command.id)).toEqual([
      "app:open-settings",
      "command-palette:open",
      "file-explorer:new-file"
    ]);
  });

  test("limits command suggestions when requested", () => {
    expect(filterObsidianCommands(commands, "", 2).map((command) => command.id)).toEqual([
      "app:open-settings",
      "command-palette:open"
    ]);
    expect(filterObsidianCommands(commands, "打开", 1).map((command) => command.id)).toEqual([
      "app:open-settings"
    ]);
  });
});

describe("getCommandInputDisplayValue", () => {
  test("uses command name when id is known", () => {
    expect(getCommandInputDisplayValue(commands, "app:open-settings")).toBe("打开设置");
  });

  test("keeps unknown command id visible", () => {
    expect(getCommandInputDisplayValue(commands, "custom:missing")).toBe("custom:missing");
  });
});
