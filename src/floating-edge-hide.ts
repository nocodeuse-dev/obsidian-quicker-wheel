import type { FloatingEdgeTapBehavior } from "./types";

export type HiddenTapOutcome = "open" | "reveal";

export function getHiddenTapOutcome(
  startedHidden: boolean,
  tapBehavior: FloatingEdgeTapBehavior
): HiddenTapOutcome {
  return startedHidden && tapBehavior === "reveal" ? "reveal" : "open";
}
