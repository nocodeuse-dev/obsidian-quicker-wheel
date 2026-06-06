export function shouldCloseWheelFromPointerTarget(
  target: EventTarget | null,
  blankHost: EventTarget
): boolean {
  return target === blankHost;
}
