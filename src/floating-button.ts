import type { Plugin } from "obsidian";
import {
  getFloatingDirectionAngle,
  getFloatingGestureIntent
} from "./floating-gesture";
import { hexToRgba } from "./color";
import { getHiddenTapOutcome } from "./floating-edge-hide";
import {
  clampFloatingButtonPosition,
  getEdgeHiddenOffset,
  snapFloatingButtonToEdge
} from "./floating-position";
import { DEFAULT_CENTER_ICON, renderConfiguredIcon } from "./icons";
import type {
  FloatingButtonColors,
  FloatingEdgeHideSettings,
  FloatingEdgeSide,
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
  textColor: string;
  edgeHide: FloatingEdgeHideSettings;
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
  private edgeSide: FloatingEdgeSide = "left";
  private edgeHidden = false;
  private edgeHideTimer: number | null = null;
  private pointerStartedHidden = false;

  constructor(private readonly options: FloatingButtonOptions) {}

  show(): void {
    if (!this.options.settings.enabled) {
      this.hide();
      return;
    }

    if (this.buttonEl) {
      this.revealFromEdge();
      this.applyPosition();
      this.applyColor("default");
      this.hideDirectionArrow();
      this.scheduleEdgeHide();
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
    this.scheduleEdgeHide();

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
      this.options.plugin.registerDomEvent(this.activeWindow, "resize", () =>
        this.handleViewportResize()
      );
      this.windowEventsRegistered = true;
    }
  }

  hide(): void {
    this.clearEdgeHideTimer();
    this.buttonEl?.remove();
    this.buttonEl = null;
    this.arrowEl = null;
    this.dragging = false;
    this.edgeHidden = false;
  }

  refresh(settings: FloatingButtonRuntimeSettings): void {
    this.options.settings.enabled = settings.enabled;
    this.options.settings.x = settings.x;
    this.options.settings.y = settings.y;
    this.options.settings.gesture = settings.gesture;
    this.options.settings.colors = settings.colors;
    this.options.settings.opacity = settings.opacity;
    this.options.settings.textColor = settings.textColor;
    this.options.settings.edgeHide = settings.edgeHide;
    this.show();
  }

  private applyPosition(): void {
    if (!this.buttonEl) {
      return;
    }

    const viewport = this.activeWindow ?? this.buttonEl.ownerDocument.defaultView ?? window;
    const position = clampFloatingButtonPosition(
      {
        x: this.options.settings.x,
        y: this.options.settings.y
      },
      {
        width: viewport.innerWidth,
        height: viewport.innerHeight
      }
    );
    const next = this.options.settings.edgeHide.enabled
      ? snapFloatingButtonToEdge(
          position,
          {
            width: viewport.innerWidth,
            height: viewport.innerHeight
          }
        )
      : { position, side: this.edgeSide };
    this.edgeSide = next.side;
    this.options.settings.x = next.position.x;
    this.options.settings.y = next.position.y;
    this.buttonEl.style.left = `${next.position.x}px`;
    this.buttonEl.style.top = `${next.position.y}px`;
  }

  private handlePointerDown(event: PointerEvent): void {
    if (!this.buttonEl) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    this.pointerStartedHidden = this.edgeHidden;
    this.clearEdgeHideTimer();
    this.revealFromEdge();
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
      this.snapToEdge();
      await this.options.onMove(this.options.settings.x, this.options.settings.y);
      this.applyColor("default");
      this.hideDirectionArrow();
      this.scheduleEdgeHide();
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
      this.pointerStartedHidden = false;
      this.scheduleEdgeHide();
      return;
    }

    if (intent.type === "open-wheel") {
      const outcome = getHiddenTapOutcome(
        this.pointerStartedHidden,
        this.options.settings.edgeHide.tapBehavior
      );
      if (outcome === "open") {
        this.options.onOpen();
      }
    }
    this.pointerStartedHidden = false;
    this.applyColor("default");
    this.hideDirectionArrow();
    this.scheduleEdgeHide();
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
    this.pointerStartedHidden = false;
    this.scheduleEdgeHide();
  }

  private applyColor(color: keyof FloatingButtonColors): void {
    if (!this.buttonEl) {
      return;
    }

    this.buttonEl.style.backgroundColor = hexToRgba(
      this.options.settings.colors[color],
      this.options.settings.opacity[color]
    );
    this.buttonEl.style.color = this.options.settings.textColor;
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

  private snapToEdge(): void {
    if (!this.buttonEl || !this.options.settings.edgeHide.enabled) {
      return;
    }

    const viewport = this.activeWindow ?? window;
    const snapped = snapFloatingButtonToEdge(
      { x: this.options.settings.x, y: this.options.settings.y },
      { width: viewport.innerWidth, height: viewport.innerHeight }
    );
    this.edgeSide = snapped.side;
    this.options.settings.x = snapped.position.x;
    this.options.settings.y = snapped.position.y;
    this.buttonEl.style.left = `${snapped.position.x}px`;
    this.buttonEl.style.top = `${snapped.position.y}px`;
  }

  private scheduleEdgeHide(): void {
    this.clearEdgeHideTimer();
    if (
      !this.buttonEl ||
      !this.options.settings.edgeHide.enabled ||
      this.dragging
    ) {
      return;
    }

    const viewport = this.activeWindow ?? window;
    this.edgeHideTimer = viewport.setTimeout(() => {
      this.hideAtEdge();
    }, this.options.settings.edgeHide.delayMs);
  }

  private clearEdgeHideTimer(): void {
    if (this.edgeHideTimer === null) {
      return;
    }

    const viewport = this.activeWindow ?? window;
    viewport.clearTimeout(this.edgeHideTimer);
    this.edgeHideTimer = null;
  }

  private hideAtEdge(): void {
    if (!this.buttonEl || this.dragging || !this.options.settings.edgeHide.enabled) {
      return;
    }

    this.snapToEdge();
    const offset = getEdgeHiddenOffset(
      this.edgeSide,
      this.options.settings.edgeHide.visibleSize
    );
    this.buttonEl.style.setProperty("--quicker-floating-edge-offset", `${offset}px`);
    this.buttonEl.addClass("is-edge-hidden");
    this.edgeHidden = true;
    this.edgeHideTimer = null;
  }

  private revealFromEdge(): void {
    if (!this.buttonEl) {
      return;
    }

    this.buttonEl.removeClass("is-edge-hidden");
    this.buttonEl.style.removeProperty("--quicker-floating-edge-offset");
    this.edgeHidden = false;
  }

  private handleViewportResize(): void {
    if (!this.buttonEl) {
      return;
    }

    this.clearEdgeHideTimer();
    this.revealFromEdge();
    this.applyPosition();
    this.scheduleEdgeHide();
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
