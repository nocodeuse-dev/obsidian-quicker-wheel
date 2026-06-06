export type WheelActionType = "command" | "file" | "uri" | "script";
export type FloatingDirectionActionType = WheelActionType | "wheelAction";

export interface WheelMenuSettings {
  ringCount: number;
  slotsPerRing: number;
  size: number;
  textSize: number;
  timeoutMs: number;
  opacity: number;
}

export interface FloatingButtonSettings {
  enabled?: boolean;
  mobileEnabled: boolean;
  desktopEnabled: boolean;
  x: number;
  y: number;
  gesture: FloatingGestureSettings;
  directionCommands?: Partial<FloatingDirectionCommandMap>;
  directionActions: FloatingDirectionActionMap;
  colors: FloatingButtonColors;
  opacity: FloatingButtonOpacity;
}

export type FloatingGestureDirection =
  | "up"
  | "up-right"
  | "right"
  | "down-right"
  | "down"
  | "down-left"
  | "left"
  | "up-left";

export interface FloatingGestureSettings {
  tapMaxMs: number;
  swipeMaxMs: number;
  longPressMoveMs: number;
  swipeDistance: number;
  dragStartDistance: number;
}

export type FloatingDirectionCommandMap = Record<FloatingGestureDirection, string>;
export type FloatingDirectionActionMap = Record<FloatingGestureDirection, FloatingDirectionAction>;

export interface FloatingDirectionAction {
  type: FloatingDirectionActionType;
  actionId?: string;
  commandId?: string;
  filePath?: string;
  uri?: string;
  script?: string;
  enabled: boolean;
}

export interface FloatingButtonColors {
  default: string;
  tap: string;
  swipe: string;
  move: string;
}

export interface FloatingButtonOpacity {
  default: number;
  tap: number;
  swipe: number;
  move: number;
}

export interface WheelAction {
  id: string;
  label: string;
  icon: string;
  type: WheelActionType;
  commandId?: string;
  filePath?: string;
  uri?: string;
  script?: string;
  enabled: boolean;
  ringIndex: number;
  slotIndex: number;
}

export interface ObsidianQuickerSettings {
  wheel: WheelMenuSettings;
  floatingButton: FloatingButtonSettings;
  actions: WheelAction[];
}

export interface WheelSlot {
  id: string;
  ringIndex: number;
  slotIndex: number;
  startAngle: number;
  endAngle: number;
  innerRadiusRatio: number;
  outerRadiusRatio: number;
  labelRadiusRatio: number;
  labelAngle: number;
}

export interface WheelLayoutInput {
  ringCount: number;
  slotsPerRing: number;
}
