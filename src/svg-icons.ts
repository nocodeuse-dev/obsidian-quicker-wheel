export function getSvgIconMarkup(value: string): string | null {
  let markup = value.trim();

  markup = markup.replace(/^<\?xml[\s\S]*?\?>\s*/i, "");
  markup = markup.replace(/^<!--[\s\S]*?-->\s*/i, "");

  return markup.toLowerCase().startsWith("<svg") ? markup : null;
}
