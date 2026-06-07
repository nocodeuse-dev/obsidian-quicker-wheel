import type { Plugin } from "obsidian";
import {
  getFloatingDirectionAngle,
  getFloatingGestureIntent
} from "./floating-gesture";
import { hexToRgba } from "./color";
import { DEFAULT_CENTER_ICON, renderConfiguredIcon } from "./icons";
import type {
  FloatingButtonColors,
  FloatingButtonOpacity,
  FloatingGestureDirection,
  FloatingGestureSettings
} from "./types";

interface FloatingButtonRuntimeSettings {
  enabled: boolean;
  x: number;
  y: number;
  gesture: FloatingGestureSettings;
  colors: FloatingButtonColors;
  opacity: FloatingButtonOpacity;
}

interface FloatingButtonOptions {
  plugin: Plugin;
  settings: FloatingButtonRuntimeSettings;
  onOpen: () => void;
  onDirection: (direction: FloatingGestureDirection) => void | Promise<void>;
  onMove: (x: number, y: number) => Promise<void>;
}

export class FloatingWheelButton {
  private buttonEl: HTMLButtonElement | null = null;
  private arrowEl: HTMLSpanElement | null = null;
  private dragging = false;
  private moving = false;
  private moved = false;
  private pointerDownAt = 0;
  private startX = 0;
  private startY = 0;
  private originX = 0;
  private originY = 0;
  private windowEventsRegistered = false;
  private activeWindow: Window | null = null;

  constructor(private readonly options: FloatingButtonOptions) {}

  show(): void {
    if (!this.options.settings.enabled) {
      this.hide();
      return;
    }

    if (this.buttonEl) {
      this.applyPosition();
      this.applyColor("default");
      this.hideDirectionArrow();
      return;
    }

    const ownerDocument = this.options.plugin.app.workspace.containerEl.ownerDocument;
    const button = ownerDocument.createElement("button");
    button.type = "button";
    button.addClass("obsidian-quicker-floating-button");
    button.setAttr("aria-label", "打开 Quicker Wheel 轮盘");
    renderConfiguredIcon(
      button.createSpan({ cls: "obsidian-quicker-floating-symbol" }),
      DEFAULT_CENTER_ICON,
      "Q"
    );
    this.arrowEl = button.createSpan({
      cls: "obsidian-quicker-floating-arrow",
      text: "→"
    });
    ownerDocument.body.appendChild(button);
    this.buttonEl = button;
    this.activeWindow = ownerDocument.defaultView ?? window;
    this.applyPosition();
    this.applyColor("default");
    this.hideDirectionArrow();

    this.options.plugin.registerDomEvent(button, "pointerdown", (event: PointerEvent) =>
      this.handlePointerDown(event)
    );
    this.options.plugin.registerDomEvent(button, "click", (event: MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
    });

    if (!this.windowEventsRegistered) {
      this.options.plugin.registerDomEvent(this.activeWindow, "pointermove", (event: PointerEvent) =>
        this.handlePointerMove(event)
      );
      this.options.plugin.registerDomEvent(this.activeWindow, "pointerup", (event: PointerEvent) =>
        this.handlePointerUp(event)
      );
      this.options.plugin.registerDomEvent(this.activeWindow, "pointercancel", (event: PointerEvent) =>
        this.handlePointerCancel(event)
      );
      this.windowEventsRegistered = true;
    }
  }

  hide(): void {
    this.buttonEl?.remove();
    this.buttonEl = null;
    this.arrowEl = null;
    this.dragging = false;
  }

  refresh(settings: FloatingButtonRuntimeSettings): void {
    this.options.settings.enabled = settings.enabled;
    this.options.settings.x = settings.x;
    this.options.settings.y = settings.y;
    this.options.settings.gesture = settings.gesture;
    this.options.settings.colors = settings.colors;
    this.options.settings.opacity = settings.opacity;
    this.show();
  }

  private applyPosition(): void {
    if (!this.buttonEl) {
      return;
    }

    this.buttonEl.style.left = `${this.options.settings.x}px`;
    this.buttonEl.style.top = `${this.options.settings.y}px`;
  }

  private handlePointerDown(event: PointerEvent): void {
    if (!this.buttonEl) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    this.dragging = true;
    this.moving = false;
    this.moved = false;
    this.pointerDownAt = Date.now();
    this.startX = event.clientX;
    this.startY = event.clientY;
    this.originX = this.options.settings.x;
    this.originY = this.options.settings.y;
    this.buttonEl.setPointerCapture(event.pointerId);
    this.applyColor("tap");
    this.hideDirectionArrow();
  }

  private handlePointerMove(event: PointerEvent): void {
    if (!this.dragging || !this.buttonEl) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    const deltaX = event.clientX - this.startX;
    const deltaY = event.clientY - this.startY;
    const elapsedMs = Date.now() - this.pointerDownAt;
    const intent = getFloatingGestureIntent(
      { elapsedMs, deltaX, deltaY },
      this.options.settings.gesture
    );

    if (intent.type !== "move" && !this.moving) {
      if (intent.type === "direction") {
        this.applyColor("swipe");
        this.showDirectionArrow(intent.direction);
      } else {
        this.hideDirectionArrow();
      }
      return;
    }

    this.moving = true;
    this.applyColor("move");
    this.hideDirectionArrow();
    const viewport = this.activeWindow ?? window;
    const nextX = clamp(this.originX + event.clientX - this.startX, 8, viewport.innerWidth - 56);
    const nextY = clamp(this.originY + event.clientY - this.startY, 8, viewport.innerHeight - 56);
    this.moved = this.moved || Math.abs(nextX - this.originX) > 4 || Math.abs(nextY - this.originY) > 4;
    this.options.settings.x = nextX;
    this.options.settings.y = nextY;
    this.buttonEl.style.left = `${nextX}px`;
    this.buttonEl.style.top = `${nextY}px`;
  }

  private async handlePointerUp(event: PointerEvent): Promise<void> {
    if (!this.dragging || !this.buttonEl) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    this.dragging = false;
    if (this.buttonEl.hasPointerCapture(event.pointerId)) {
      this.buttonEl.releasePointerCapture(event.pointerId);
    }

    if (this.moving && this.moved) {
      await this.options.onMove(this.options.settings.x, this.options.settings.y);
      this.applyColor("default");
      this.hideDirectionArrow();
      return;
    }

    const intent = getFloatingGestureIntent(
      {
        elapsedMs: Date.now() - this.pointerDownAt,
        deltaX: event.clientX - this.startX,
        deltaY: event.clientY - this.startY
      },
      this.options.settings.gesture
    );

    if (intent.type === "direction") {
      await this.options.onDirection(intent.direction);
      this.applyColor("default");
      this.hideDirectionArrow();
      return;
    }

    if (intent.type === "open-wheel") {
      this.options.onOpen();
    }
    this.applyColor("default");
    this.hideDirectionArrow();
  }

  private handlePointerCancel(event: PointerEvent): void {
    if (!this.dragging || !this.buttonEl) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    this.dragging = false;
    this.moving = false;
    this.moved = false;
    if (this.buttonEl.hasPointerCapture(event.pointerId)) {
      this.buttonEl.releasePointerCapture(event.pointerId);
    }
    this.applyColor("default");
    this.hideDirectionArrow();
  }

  private applyColor(color: keyof FloatingButtonColors): void {
    if (!this.buttonEl) {
      return;
    }

    this.buttonEl.style.backgroundColor = hexToRgba(
      this.options.settings.colors[color],
      this.options.settings.opacity[color]
    );
  }

  private showDirectionArrow(direction: FloatingGestureDirection): void {
    if (!this.arrowEl) {
      return;
    }

    const angle = getFloatingDirectionAngle(direction);
    this.arrowEl.style.setProperty("--quicker-floating-arrow-angle", `${angle}deg`);
    this.arrowEl.addClass("is-visible");
  }

  private hideDirectionArrow(): void {
    this.arrowEl?.removeClass("is-visible");
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
