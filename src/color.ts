export function hexToRgba(hex: string, opacityPercent: number): string {
  const normalized = hex.trim().replace("#", "");
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  const alpha = Math.round(opacityPercent) / 100;

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}
