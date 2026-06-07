import { setIcon } from "obsidian";

export const DEFAULT_EMPTY_SLOT_ICON = "plus";
export const DEFAULT_CENTER_ICON = "zap";

export function renderConfiguredIcon(
  container: HTMLElement,
  icon: string,
  fallbackText = "*"
): void {
  container.empty();
  const value = icon.trim();

  if (!value) {
    container.setText(fallbackText);
    return;
  }

  if (isSvgIcon(value)) {
    const svg = createSafeSvgElement(container.ownerDocument, value);
    if (svg) {
      container.appendChild(svg);
      return;
    }
  }

  if (isObsidianIconName(value)) {
    setIcon(container, value);
    if (container.childElementCount > 0) {
      return;
    }
  }

  container.setText(value);
}

function isSvgIcon(value: string): boolean {
  return value.trimStart().toLowerCase().startsWith("<svg");
}

function isObsidianIconName(value: string): boolean {
  return /^[a-z][a-z0-9-]*$/i.test(value);
}

function createSafeSvgElement(document: Document, value: string): SVGSVGElement | null {
  const parser = new (document.defaultView?.DOMParser ?? DOMParser)();
  const parsed = parser.parseFromString(value, "image/svg+xml");
  const svg = parsed.documentElement;

  if (svg.localName.toLowerCase() !== "svg") {
    return null;
  }

  removeUnsafeSvgContent(svg);
  return document.importNode(svg, true) as unknown as SVGSVGElement;
}

function removeUnsafeSvgContent(root: Element): void {
  for (const element of Array.from(root.querySelectorAll("*"))) {
    const tagName = element.localName.toLowerCase();
    if (
      tagName === "script" ||
      tagName === "foreignobject" ||
      tagName === "iframe" ||
      tagName === "object" ||
      tagName === "embed"
    ) {
      element.remove();
      continue;
    }

    removeUnsafeAttributes(element);
  }

  removeUnsafeAttributes(root);
}

function removeUnsafeAttributes(element: Element): void {
  for (const attribute of Array.from(element.attributes)) {
    const name = attribute.name.toLowerCase();
    const value = attribute.value.trim().toLowerCase();
    if (name.startsWith("on") || value.startsWith("javascript:")) {
      element.removeAttribute(attribute.name);
    }
  }
}
