import type { FloatingDirectionAction, WheelAction } from "./types";
import { t, tr } from "./i18n";

export interface ActionExecutionContext {
  executeCommandById(commandId: string): boolean;
  openFileByPath?: (path: string) => boolean;
  openUri?: (uri: string) => void;
}

export interface ActionExecutionResult {
  ok: boolean;
  message?: string;
}

export function executeWheelAction(
  action: WheelAction,
  context: ActionExecutionContext
): ActionExecutionResult {
  if (!action.enabled) {
    return { ok: false, message: tr("动作已禁用", "Action is disabled") };
  }

  if (action.type === "command") {
    if (!action.commandId) {
      return { ok: false, message: tr("动作未绑定命令", "No command is assigned") };
    }

    return context.executeCommandById(action.commandId)
      ? { ok: true }
      : { ok: false, message: t("error.commandNotFound", { value: action.commandId }) };
  }

  if (action.type === "uri") {
    if (!action.uri) {
      return { ok: false, message: tr("动作未填写 URI", "No URI is configured") };
    }

    if (!context.openUri) {
      return { ok: false, message: tr("当前环境无法打开 URI", "URI opening is unavailable") };
    }

    context.openUri(action.uri);
    return { ok: true };
  }

  if (action.type === "file") {
    if (!action.filePath) {
      return { ok: false, message: tr("动作未选择文件", "No file is selected") };
    }

    if (!context.openFileByPath) {
      return { ok: false, message: tr("当前环境无法打开文件", "File opening is unavailable") };
    }

    return context.openFileByPath(action.filePath)
      ? { ok: true }
      : {
          ok: false,
          message: tr(`未找到文件：${action.filePath}`, `File not found: ${action.filePath}`)
        };
  }

  return {
    ok: false,
    message: tr(
      "脚本动作将在后续版本支持",
      "Script actions are reserved for a future version"
    )
  };
}

export function executeFloatingDirectionAction(
  action: FloatingDirectionAction,
  wheelActions: WheelAction[],
  context: ActionExecutionContext
): ActionExecutionResult {
  if (!action.enabled) {
    return { ok: false, message: tr("方向动作已禁用", "Direction action is disabled") };
  }

  if (action.type === "wheelAction") {
    if (!action.actionId) {
      return { ok: false, message: tr("方向动作未选择轮盘动作", "No wheel action is selected") };
    }

    const wheelAction = wheelActions.find((candidate) => candidate.id === action.actionId);
    if (!wheelAction) {
      return { ok: false, message: tr("未找到轮盘动作", "Wheel action not found") };
    }

    return executeWheelAction(wheelAction, context);
  }

  const inlineAction: WheelAction = {
    ...action,
    id: "floating-direction",
    label: tr("方向动作", "Direction action"),
    icon: "→",
    type: action.type,
    ringIndex: 0,
    slotIndex: 0
  };

  return executeWheelAction(inlineAction, context);
}
