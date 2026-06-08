import type { WheelAction } from "./types";

export type WheelSlotActivation = "action" | "slot" | "none";

export function isWheelActionSelected(
  action: WheelAction | undefined,
  selectedActionId: string | undefined
): boolean {
  return action !== undefined && action.id === selectedActionId;
}

export function getWheelSlotActivation(
  action: WheelAction | undefined,
  interactive: boolean
): WheelSlotActivation {
  if (action) {
    return "action";
  }

  return interactive ? "slot" : "slot";
}
