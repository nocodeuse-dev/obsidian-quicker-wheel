import type { WheelAction, WheelLayoutInput, WheelSlot } from "./types";

export function buildWheelSlots(input: WheelLayoutInput): WheelSlot[] {
  const slots: WheelSlot[] = [];
  const angleStep = 360 / input.slotsPerRing;
  const centerHoleRatio = 0.15;
  const usableRatio = 1 - centerHoleRatio;
  const ringWidth = usableRatio / input.ringCount;

  for (let ringIndex = 0; ringIndex < input.ringCount; ringIndex += 1) {
    const innerRadiusRatio = centerHoleRatio + ringWidth * ringIndex;
    const outerRadiusRatio = centerHoleRatio + ringWidth * (ringIndex + 1);

    for (let slotIndex = 0; slotIndex < input.slotsPerRing; slotIndex += 1) {
      const startAngle = -90 + slotIndex * angleStep;
      const endAngle = startAngle + angleStep;

      slots.push({
        id: `${ringIndex}:${slotIndex}`,
        ringIndex,
        slotIndex,
        startAngle,
        endAngle,
        innerRadiusRatio,
        outerRadiusRatio,
        labelRadiusRatio: (innerRadiusRatio + outerRadiusRatio) / 2,
        labelAngle: startAngle + angleStep / 2
      });
    }
  }

  return slots;
}

export function findActionForSlot(
  actions: WheelAction[],
  ringIndex: number,
  slotIndex: number
): WheelAction | undefined {
  return actions.find(
    (action) =>
      action.enabled && action.ringIndex === ringIndex && action.slotIndex === slotIndex
  );
}

export interface WheelRenderSizeInput {
  preferredSize: number;
  viewportWidth: number;
  viewportHeight: number;
}

export interface WheelViewportSize {
  width: number;
  height: number;
}

export function calculateWheelRenderSize(input: WheelRenderSizeInput): number {
  const safeWidth = Math.max(0, input.viewportWidth - 48);
  const safeHeight = Math.max(0, input.viewportHeight - 96);
  const constrained = Math.min(input.preferredSize, safeWidth, safeHeight);

  return Math.max(220, Math.round(constrained));
}

export function getWheelViewportSize(ownerWindow: Window): WheelViewportSize {
  const visualViewport = ownerWindow.visualViewport;
  const width = visualViewport?.width ?? ownerWindow.innerWidth;
  const height = visualViewport?.height ?? ownerWindow.innerHeight;

  return {
    width: Math.round(width),
    height: Math.round(height)
  };
}

export function polarToCartesian(
  center: number,
  radius: number,
  angleDegrees: number
): { x: number; y: number } {
  const angleRadians = (angleDegrees * Math.PI) / 180;
  return {
    x: center + radius * Math.cos(angleRadians),
    y: center + radius * Math.sin(angleRadians)
  };
}

export function describeArcSegment(
  center: number,
  innerRadius: number,
  outerRadius: number,
  startAngle: number,
  endAngle: number
): string {
  const outerStart = polarToCartesian(center, outerRadius, startAngle);
  const outerEnd = polarToCartesian(center, outerRadius, endAngle);
  const innerEnd = polarToCartesian(center, innerRadius, endAngle);
  const innerStart = polarToCartesian(center, innerRadius, startAngle);
  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${innerStart.x} ${innerStart.y}`,
    "Z"
  ].join(" ");
}
