import type { FloatingDirectionAction, WheelAction } from "./types";

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
    return { ok: false, message: "动作已禁用" };
  }

  if (action.type === "command") {
    if (!action.commandId) {
      return { ok: false, message: "动作未绑定命令" };
    }

    return context.executeCommandById(action.commandId)
      ? { ok: true }
      : { ok: false, message: `未找到命令：${action.commandId}` };
  }

  if (action.type === "uri") {
    if (!action.uri) {
      return { ok: false, message: "动作未填写 URI" };
    }

    if (!context.openUri) {
      return { ok: false, message: "当前环境无法打开 URI" };
    }

    context.openUri(action.uri);
    return { ok: true };
  }

  if (action.type === "file") {
    if (!action.filePath) {
      return { ok: false, message: "动作未选择文件" };
    }

    if (!context.openFileByPath) {
      return { ok: false, message: "当前环境无法打开文件" };
    }

    return context.openFileByPath(action.filePath)
      ? { ok: true }
      : { ok: false, message: `未找到文件：${action.filePath}` };
  }

  return { ok: false, message: "脚本动作将在后续版本支持" };
}

export function executeFloatingDirectionAction(
  action: FloatingDirectionAction,
  wheelActions: WheelAction[],
  context: ActionExecutionContext
): ActionExecutionResult {
  if (!action.enabled) {
    return { ok: false, message: "方向动作已禁用" };
  }

  if (action.type === "wheelAction") {
    if (!action.actionId) {
      return { ok: false, message: "方向动作未选择轮盘动作" };
    }

    const wheelAction = wheelActions.find((candidate) => candidate.id === action.actionId);
    if (!wheelAction) {
      return { ok: false, message: "未找到轮盘动作" };
    }

    return executeWheelAction(wheelAction, context);
  }

  const inlineAction: WheelAction = {
    ...action,
    id: "floating-direction",
    label: "方向动作",
    icon: "→",
    type: action.type,
    ringIndex: 0,
    slotIndex: 0
  };

  return executeWheelAction(inlineAction, context);
}
