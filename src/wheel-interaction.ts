import type { WheelAction } from "./types";

export type WheelSlotActivation = "action" | "slot" | "none";

export function getWheelSlotActivation(
  action: WheelAction | undefined,
  interactive: boolean
): WheelSlotActivation {
  if (action) {
    return "action";
  }

  return interactive ? "slot" : "slot";
}
