import { describe, expect, test, vi } from "vitest";
import { executeFloatingDirectionAction, executeWheelAction } from "../src/action-executor";
import type { WheelAction } from "../src/types";

describe("executeWheelAction", () => {
  test("executes an Obsidian command action", () => {
    const executeCommandById = vi.fn(() => true);
    const action: WheelAction = {
      id: "open-settings",
      label: "设置",
      icon: "⚙",
      type: "command",
      commandId: "app:open-settings",
      enabled: true,
      ringIndex: 0,
      slotIndex: 0
    };

    const result = executeWheelAction(action, { executeCommandById });

    expect(result).toEqual({ ok: true });
    expect(executeCommandById).toHaveBeenCalledWith("app:open-settings");
  });

  test("returns a user-facing error when command is missing", () => {
    const result = executeWheelAction(
      {
        id: "missing",
        label: "缺失",
        icon: "!",
        type: "command",
        commandId: "missing:command",
        enabled: true,
        ringIndex: 0,
        slotIndex: 1
      },
      { executeCommandById: () => false }
    );

    expect(result).toEqual({
      ok: false,
      message: "未找到命令：missing:command"
    });
  });

  test("opens a file action by vault path", () => {
    const openFileByPath = vi.fn(() => true);
    const action: WheelAction = {
      id: "open-file",
      label: "打开文件",
      icon: "📄",
      type: "file",
      filePath: "Inbox/Test.md",
      enabled: true,
      ringIndex: 0,
      slotIndex: 2
    };

    const result = executeWheelAction(action, {
      executeCommandById: () => false,
      openFileByPath
    });

    expect(result).toEqual({ ok: true });
    expect(openFileByPath).toHaveBeenCalledWith("Inbox/Test.md");
  });

  test("returns a user-facing error when a file path is missing", () => {
    const result = executeWheelAction(
      {
        id: "missing-file",
        label: "缺失文件",
        icon: "📄",
        type: "file",
        filePath: "Missing.md",
        enabled: true,
        ringIndex: 0,
        slotIndex: 2
      },
      {
        executeCommandById: () => false,
        openFileByPath: () => false
      }
    );

    expect(result).toEqual({
      ok: false,
      message: "未找到文件：Missing.md"
    });
  });

  test("keeps future action types explicit", () => {
    const result = executeWheelAction(
      {
        id: "script",
        label: "脚本",
        icon: "JS",
        type: "script",
        script: "return true",
        enabled: true,
        ringIndex: 0,
        slotIndex: 2
      },
      { executeCommandById: () => true }
    );

    expect(result).toEqual({
      ok: false,
      message: "脚本动作将在后续版本支持"
    });
  });

  test("executes a floating direction action by reusing a wheel action", () => {
    const executeCommandById = vi.fn(() => true);
    const wheelAction: WheelAction = {
      id: "collect",
      label: "收集",
      icon: "★",
      type: "command",
      commandId: "quickadd:choice:collect",
      enabled: true,
      ringIndex: 0,
      slotIndex: 0
    };

    const result = executeFloatingDirectionAction(
      {
        type: "wheelAction",
        actionId: "collect",
        enabled: true
      },
      [wheelAction],
      { executeCommandById }
    );

    expect(result).toEqual({ ok: true });
    expect(executeCommandById).toHaveBeenCalledWith("quickadd:choice:collect");
  });

  test("executes an inline floating direction command action", () => {
    const executeCommandById = vi.fn(() => true);

    const result = executeFloatingDirectionAction(
      {
        type: "command",
        commandId: "app:open-settings",
        enabled: true
      },
      [],
      { executeCommandById }
    );

    expect(result).toEqual({ ok: true });
    expect(executeCommandById).toHaveBeenCalledWith("app:open-settings");
  });
});
