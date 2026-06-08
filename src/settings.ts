import type {
  FloatingButtonColors,
  FloatingDirectionAction,
  FloatingDirectionActionMap,
  FloatingGestureDirection,
  FloatingButtonOpacity,
  FloatingDirectionCommandMap,
  ObsidianQuickerSettings,
  WheelAction
} from "./types";
import { FLOATING_DIRECTIONS } from "./floating-gesture";

const DEFAULT_ACTIONS: WheelAction[] = [
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
    label: "切换",
    icon: "search",
    type: "command",
    commandId: "switcher:open",
    enabled: true,
    ringIndex: 0,
    slotIndex: 1
  },
  {
    id: "new-note",
    label: "新建",
    icon: "file-plus",
    type: "command",
    commandId: "file-explorer:new-file",
    enabled: true,
    ringIndex: 0,
    slotIndex: 2
  },
  {
    id: "settings",
    label: "设置",
    icon: "settings",
    type: "command",
    commandId: "app:open-settings",
    enabled: true,
    ringIndex: 0,
    slotIndex: 3
  }
];

export const CENTER_ACTION_ID = "quicker-wheel-center";

export function createDefaultCenterAction(): WheelAction {
  return {
    id: CENTER_ACTION_ID,
    label: "插件设置",
    icon: "zap",
    placement: "center",
    type: "command",
    commandId: "quicker-wheel:open-settings",
    enabled: true,
    ringIndex: 0,
    slotIndex: 0
  };
}

const LEGACY_DEFAULT_ACTION_ICONS: Record<string, string[]> = {
  "command-palette": ["⌘", "CMD"],
  "quick-switcher": ["🔎", "SW"],
  "new-note": ["＋", "+"],
  settings: ["⚙", "SET"]
};

const ORIGINAL_DEFAULT_WHEEL_APPEARANCE = {
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
} as const;

const PREVIOUS_DEFAULT_WHEEL_APPEARANCE = {
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
} as const;

export const DEFAULT_SETTINGS: ObsidianQuickerSettings = {
  wheel: {
    ringCount: 2,
    slotsPerRing: 8,
    size: 340,
    textSize: 11,
    timeoutMs: 20000,
    opacity: 100,
    appearance: {
      theme: "soft",
      segmentColor: "#fbfbfc",
      actionSegmentColor: "#fbfbfc",
      emptySegmentColor: "#fbfbfc",
      highlightColor: "#fbfbfc",
      textColor: "#242428",
      selectedBorderColor: "#ef4444",
      dividerColor: "#d8d8de",
      dividerWidth: 1,
      centerColor: "#ffffff",
      centerIconColor: "#7c3aed",
      centerSize: 17,
      shadow: "soft",
      emptySlotDisplay: "hidden"
    }
  },
  floatingButton: {
    mobileEnabled: true,
    desktopEnabled: true,
    x: 24,
    y: 360,
    gesture: {
      tapMaxMs: 260,
      swipeMaxMs: 650,
      longPressMoveMs: 1000,
      swipeDistance: 42,
      dragStartDistance: 8
    },
    directionActions: createEmptyDirectionActions(),
    colors: {
      default: "#7c3aed",
      tap: "#2563eb",
      swipe: "#f97316",
      move: "#16a34a"
    },
    opacity: {
      default: 100,
      tap: 100,
      swipe: 100,
      move: 100
    },
    textColor: "#1f1533",
    edgeHide: {
      enabled: false,
      delayMs: 3000,
      visibleSize: 14,
      tapBehavior: "open"
    }
  },
  actions: [...DEFAULT_ACTIONS, createDefaultCenterAction()]
};

type DeepPartial<T> = {
  [Key in keyof T]?: T[Key] extends Array<infer Item>
    ? Item[]
    : T[Key] extends object
      ? DeepPartial<T[Key]>
      : T[Key];
};

type SettingsInput = DeepPartial<ObsidianQuickerSettings>;

export function normalizeSettings(input: unknown): ObsidianQuickerSettings {
  const source: SettingsInput = isRecord(input) ? input : {};
  const wheel = source.wheel ?? {};
  const storedWheelAppearance = wheel.appearance ?? {};
  const wheelAppearance =
    isOriginalDefaultWheelAppearance(storedWheelAppearance) ||
    isPreviousDefaultWheelAppearance(storedWheelAppearance)
    ? DEFAULT_SETTINGS.wheel.appearance
    : storedWheelAppearance;
  const floatingButton = source.floatingButton ?? {};
  const floatingGesture = floatingButton.gesture ?? {};
  const floatingColors = floatingButton.colors ?? {};
  const floatingOpacity = floatingButton.opacity ?? {};
  const floatingEdgeHide = floatingButton.edgeHide ?? {};

  const normalizedWheel = {
    ringCount: clampInteger(wheel.ringCount, 1, 3, DEFAULT_SETTINGS.wheel.ringCount),
    slotsPerRing: clampInteger(
      wheel.slotsPerRing,
      4,
      16,
      DEFAULT_SETTINGS.wheel.slotsPerRing
    ),
    size: clampInteger(wheel.size, 240, 720, DEFAULT_SETTINGS.wheel.size),
    textSize: clampInteger(wheel.textSize, 8, 24, DEFAULT_SETTINGS.wheel.textSize),
    timeoutMs: clampInteger(wheel.timeoutMs, 1000, 60000, DEFAULT_SETTINGS.wheel.timeoutMs),
    opacity: clampInteger(wheel.opacity, 20, 100, DEFAULT_SETTINGS.wheel.opacity),
    appearance: {
      theme:
        wheelAppearance.theme === "classic" ||
        wheelAppearance.theme === "glass" ||
        wheelAppearance.theme === "soft"
          ? wheelAppearance.theme
          : DEFAULT_SETTINGS.wheel.appearance.theme,
      segmentColor: normalizeHexColor(
        wheelAppearance.segmentColor,
        DEFAULT_SETTINGS.wheel.appearance.segmentColor
      ),
      actionSegmentColor: normalizeHexColor(
        wheelAppearance.actionSegmentColor,
        DEFAULT_SETTINGS.wheel.appearance.actionSegmentColor
      ),
      emptySegmentColor: normalizeHexColor(
        wheelAppearance.emptySegmentColor,
        DEFAULT_SETTINGS.wheel.appearance.emptySegmentColor
      ),
      highlightColor: normalizeHexColor(
        wheelAppearance.highlightColor,
        DEFAULT_SETTINGS.wheel.appearance.highlightColor
      ),
      textColor: normalizeHexColor(
        wheelAppearance.textColor,
        DEFAULT_SETTINGS.wheel.appearance.textColor
      ),
      selectedBorderColor: normalizeHexColor(
        wheelAppearance.selectedBorderColor,
        DEFAULT_SETTINGS.wheel.appearance.selectedBorderColor
      ),
      dividerColor: normalizeHexColor(
        wheelAppearance.dividerColor,
        DEFAULT_SETTINGS.wheel.appearance.dividerColor
      ),
      dividerWidth: clampInteger(
        wheelAppearance.dividerWidth,
        1,
        4,
        DEFAULT_SETTINGS.wheel.appearance.dividerWidth
      ),
      centerColor: normalizeHexColor(
        wheelAppearance.centerColor,
        DEFAULT_SETTINGS.wheel.appearance.centerColor
      ),
      centerIconColor: normalizeHexColor(
        wheelAppearance.centerIconColor,
        DEFAULT_SETTINGS.wheel.appearance.centerIconColor
      ),
      centerSize: clampInteger(
        wheelAppearance.centerSize,
        10,
        24,
        DEFAULT_SETTINGS.wheel.appearance.centerSize
      ),
      shadow:
        wheelAppearance.shadow === "none" ||
        wheelAppearance.shadow === "strong" ||
        wheelAppearance.shadow === "soft"
          ? wheelAppearance.shadow
          : DEFAULT_SETTINGS.wheel.appearance.shadow,
      emptySlotDisplay:
        wheelAppearance.emptySlotDisplay === "icon" ||
        wheelAppearance.emptySlotDisplay === "hidden" ||
        wheelAppearance.emptySlotDisplay === "full"
          ? wheelAppearance.emptySlotDisplay
          : DEFAULT_SETTINGS.wheel.appearance.emptySlotDisplay
    }
  };

  return {
    wheel: normalizedWheel,
    floatingButton: {
      mobileEnabled:
        floatingButton.mobileEnabled ??
        floatingButton.enabled ??
        DEFAULT_SETTINGS.floatingButton.mobileEnabled,
      desktopEnabled:
        floatingButton.desktopEnabled ??
        floatingButton.enabled ??
        DEFAULT_SETTINGS.floatingButton.desktopEnabled,
      x: clampInteger(floatingButton.x, 0, 2000, DEFAULT_SETTINGS.floatingButton.x),
      y: clampInteger(floatingButton.y, 0, 2000, DEFAULT_SETTINGS.floatingButton.y),
      gesture: {
        tapMaxMs: clampInteger(
          floatingGesture.tapMaxMs,
          80,
          1200,
          DEFAULT_SETTINGS.floatingButton.gesture.tapMaxMs
        ),
        swipeMaxMs: clampInteger(
          floatingGesture.swipeMaxMs,
          120,
          2000,
          DEFAULT_SETTINGS.floatingButton.gesture.swipeMaxMs
        ),
        longPressMoveMs: clampInteger(
          floatingGesture.longPressMoveMs,
          250,
          3000,
          DEFAULT_SETTINGS.floatingButton.gesture.longPressMoveMs
        ),
        swipeDistance: clampInteger(
          floatingGesture.swipeDistance,
          12,
          180,
          DEFAULT_SETTINGS.floatingButton.gesture.swipeDistance
        ),
        dragStartDistance: clampInteger(
          floatingGesture.dragStartDistance,
          1,
          80,
          DEFAULT_SETTINGS.floatingButton.gesture.dragStartDistance
        )
      },
      directionCommands: normalizeDirectionCommands(floatingButton.directionCommands),
      directionActions: normalizeDirectionActions(
        floatingButton.directionActions,
        floatingButton.directionCommands
      ),
      colors: normalizeFloatingColors(floatingColors),
      opacity: normalizeFloatingOpacity(floatingOpacity),
      textColor: normalizeHexColor(
        floatingButton.textColor,
        DEFAULT_SETTINGS.floatingButton.textColor
      ),
      edgeHide: {
        enabled:
          floatingEdgeHide.enabled ??
          DEFAULT_SETTINGS.floatingButton.edgeHide.enabled,
        delayMs: clampInteger(
          floatingEdgeHide.delayMs,
          500,
          10000,
          DEFAULT_SETTINGS.floatingButton.edgeHide.delayMs
        ),
        visibleSize: clampInteger(
          floatingEdgeHide.visibleSize,
          8,
          32,
          DEFAULT_SETTINGS.floatingButton.edgeHide.visibleSize
        ),
        tapBehavior:
          floatingEdgeHide.tapBehavior === "reveal"
            ? "reveal"
            : DEFAULT_SETTINGS.floatingButton.edgeHide.tapBehavior
      }
    },
    actions: normalizeActions(source.actions, normalizedWheel.ringCount, normalizedWheel.slotsPerRing)
  };
}

function isRecord(value: unknown): value is SettingsInput {
  return typeof value === "object" && value !== null;
}

function isOriginalDefaultWheelAppearance(
  appearance: DeepPartial<ObsidianQuickerSettings["wheel"]["appearance"]>
): boolean {
  return Object.entries(ORIGINAL_DEFAULT_WHEEL_APPEARANCE).every(
    ([key, value]) =>
      appearance[key as keyof typeof ORIGINAL_DEFAULT_WHEEL_APPEARANCE] === value
  );
}

function isPreviousDefaultWheelAppearance(
  appearance: DeepPartial<ObsidianQuickerSettings["wheel"]["appearance"]>
): boolean {
  return Object.entries(PREVIOUS_DEFAULT_WHEEL_APPEARANCE).every(
    ([key, value]) =>
      appearance[key as keyof typeof PREVIOUS_DEFAULT_WHEEL_APPEARANCE] === value
  );
}

function normalizeFloatingOpacity(input: Partial<FloatingButtonOpacity>): FloatingButtonOpacity {
  return {
    default: clampInteger(input.default, 1, 100, DEFAULT_SETTINGS.floatingButton.opacity.default),
    tap: clampInteger(input.tap, 1, 100, DEFAULT_SETTINGS.floatingButton.opacity.tap),
    swipe: clampInteger(input.swipe, 1, 100, DEFAULT_SETTINGS.floatingButton.opacity.swipe),
    move: clampInteger(input.move, 1, 100, DEFAULT_SETTINGS.floatingButton.opacity.move)
  };
}

function normalizeFloatingColors(input: Partial<FloatingButtonColors>): FloatingButtonColors {
  return {
    default: normalizeHexColor(input.default, DEFAULT_SETTINGS.floatingButton.colors.default),
    tap: normalizeHexColor(input.tap, DEFAULT_SETTINGS.floatingButton.colors.tap),
    swipe: normalizeHexColor(input.swipe, DEFAULT_SETTINGS.floatingButton.colors.swipe),
    move: normalizeHexColor(input.move, DEFAULT_SETTINGS.floatingButton.colors.move)
  };
}

function normalizeHexColor(value: string | undefined, fallback: string): string {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  return /^#[0-9a-f]{6}$/.test(normalized) ? normalized : fallback;
}

function createEmptyDirectionCommands(): FloatingDirectionCommandMap {
  return {
    up: "",
    "up-right": "",
    right: "",
    "down-right": "",
    down: "",
    "down-left": "",
    left: "",
    "up-left": ""
  };
}

function createEmptyDirectionActions(): FloatingDirectionActionMap {
  return {
    up: createEmptyDirectionAction(),
    "up-right": createEmptyDirectionAction(),
    right: createEmptyDirectionAction(),
    "down-right": createEmptyDirectionAction(),
    down: createEmptyDirectionAction(),
    "down-left": createEmptyDirectionAction(),
    left: createEmptyDirectionAction(),
    "up-left": createEmptyDirectionAction()
  };
}

function createEmptyDirectionAction(): FloatingDirectionAction {
  return {
    type: "command",
    actionId: "",
    commandId: "",
    filePath: "",
    uri: "",
    script: "",
    enabled: true
  };
}

function normalizeDirectionActions(
  input: Partial<Record<FloatingGestureDirection, Partial<FloatingDirectionAction>>> | undefined,
  legacyCommands: Partial<FloatingDirectionCommandMap> | undefined
): FloatingDirectionActionMap {
  const actions = createEmptyDirectionActions();
  for (const direction of FLOATING_DIRECTIONS) {
    const source = input?.[direction];
    const legacyCommand = legacyCommands?.[direction];
    actions[direction] = normalizeDirectionAction(source, legacyCommand);
  }

  return actions;
}

function normalizeDirectionAction(
  action: Partial<FloatingDirectionAction> | undefined,
  legacyCommand: string | undefined
): FloatingDirectionAction {
  const commandId =
    typeof action?.commandId === "string"
      ? action.commandId.trim()
      : typeof legacyCommand === "string"
        ? legacyCommand.trim()
        : "";

  return {
    type:
      action?.type === "file" ||
      action?.type === "uri" ||
      action?.type === "script" ||
      action?.type === "wheelAction"
        ? action.type
        : "command",
    actionId: typeof action?.actionId === "string" ? action.actionId.trim() : "",
    commandId,
    filePath: typeof action?.filePath === "string" ? action.filePath.trim() : "",
    uri: typeof action?.uri === "string" ? action.uri.trim() : "",
    script: typeof action?.script === "string" ? action.script : "",
    enabled: action?.enabled ?? true
  };
}

function normalizeDirectionCommands(
  input: Partial<FloatingDirectionCommandMap> | undefined
): FloatingDirectionCommandMap {
  const commands = createEmptyDirectionCommands();
  for (const direction of FLOATING_DIRECTIONS) {
    const commandId = input?.[direction];
    commands[direction] = typeof commandId === "string" ? commandId.trim() : "";
  }

  return commands;
}

export function createBlankAction(ringIndex: number, slotIndex: number): WheelAction {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    id: `action-${suffix}`,
    label: "新动作",
    icon: "star",
    type: "command",
    commandId: "",
    filePath: "",
    enabled: true,
    ringIndex,
    slotIndex
  };
}

export function createOrSelectActionForSlot(
  settings: ObsidianQuickerSettings,
  ringIndex: number,
  slotIndex: number
): { action: WheelAction; created: boolean } {
  const existing = settings.actions.find(
    (action) =>
      action.placement !== "center" &&
      action.ringIndex === ringIndex &&
      action.slotIndex === slotIndex
  );
  if (existing) {
    return { action: existing, created: false };
  }

  const action = createBlankAction(ringIndex, slotIndex);
  settings.actions.push(action);
  return { action, created: true };
}

export function getCenterAction(actions: WheelAction[]): WheelAction | undefined {
  return actions.find((action) => action.placement === "center");
}

export function resetCenterAction(settings: ObsidianQuickerSettings): WheelAction {
  const centerIndex = settings.actions.findIndex((action) => action.placement === "center");
  const centerAction = createDefaultCenterAction();

  settings.actions = settings.actions.filter((action) => action.placement !== "center");
  if (centerIndex >= 0) {
    settings.actions.splice(Math.min(centerIndex, settings.actions.length), 0, centerAction);
  } else {
    settings.actions.push(centerAction);
  }

  return centerAction;
}

function normalizeActions(
  actions: WheelAction[] | undefined,
  ringCount: number,
  slotsPerRing: number
): WheelAction[] {
  const normalized = !actions || actions.length === 0
    ? DEFAULT_SETTINGS.actions.map((action, index) =>
      normalizeAction({ ...action }, index, ringCount, slotsPerRing)
    )
    : actions.map((action, index) => normalizeAction(action, index, ringCount, slotsPerRing));

  let foundCenter = false;
  const uniqueActions = normalized.filter((action) => {
    if (action.placement !== "center") {
      return true;
    }
    if (foundCenter) {
      return false;
    }
    foundCenter = true;
    return true;
  });

  if (!foundCenter) {
    uniqueActions.push(createDefaultCenterAction());
  }

  return uniqueActions;
}

function normalizeAction(
  action: WheelAction,
  index: number,
  ringCount: number,
  slotsPerRing: number
): WheelAction {
  action.id = stringOr(action.id, `action-${index}`);
  action.label = stringOr(action.label, "未命名");
  action.icon = stringOr(action.icon, "•");
  action.icon = migrateLegacyDefaultActionIcon(action.id, action.icon);
  action.placement = action.placement === "center" ? "center" : "wheel";
  action.type =
    action.type === "file" || action.type === "uri" || action.type === "script"
      ? action.type
      : "command";
  action.commandId = action.commandId ?? "";
  action.filePath = action.filePath ?? "";
  action.uri = action.uri ?? "";
  action.script = action.script ?? "";
  action.enabled = action.enabled ?? true;
  action.ringIndex = clampInteger(action.ringIndex, 0, ringCount - 1, 0);
  action.slotIndex = clampInteger(action.slotIndex, 0, slotsPerRing - 1, index % slotsPerRing);

  return action;
}

function migrateLegacyDefaultActionIcon(actionId: string, icon: string): string {
  const legacyIcons = LEGACY_DEFAULT_ACTION_ICONS[actionId];
  const defaultAction = DEFAULT_ACTIONS.find((action) => action.id === actionId);

  if (!legacyIcons || !defaultAction) {
    return icon;
  }

  return legacyIcons.includes(icon) ? defaultAction.icon : icon;
}

function clampInteger(
  value: number | undefined,
  min: number,
  max: number,
  fallback: number
): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.round(value)));
}

function stringOr(value: string | undefined, fallback: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    return fallback;
  }

  return value;
}
