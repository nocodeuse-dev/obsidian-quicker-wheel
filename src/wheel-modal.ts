import { Modal, Notice, TFile } from "obsidian";
import type { App } from "obsidian";
import { executeWheelAction } from "./action-executor";
import { shouldCloseWheelFromPointerTarget } from "./dom-events";
import { executeObsidianCommand } from "./obsidian-commands";
import {
  DEFAULT_CENTER_ICON,
  DEFAULT_EMPTY_SLOT_ICON,
  renderConfiguredIcon
} from "./icons";
import { getWheelSlotActivation } from "./wheel-interaction";
import {
  buildWheelSlots,
  calculateWheelRenderSize,
  describeArcSegment,
  findActionForSlot,
  getWheelViewportSize,
  polarToCartesian
} from "./wheel-layout";
import type { ObsidianQuickerSettings, WheelAction, WheelSlot } from "./types";

export class QuickerWheelModal extends Modal {
  private closeTimer: number | null = null;

  constructor(
    app: App,
    private readonly settings: ObsidianQuickerSettings,
    private readonly onEmptySlot?: (slot: WheelSlot) => void | Promise<void>
  ) {
    super(app);
  }

  onOpen(): void {
    this.containerEl.addClass("obsidian-quicker-modal-container");
    this.modalEl.addClass("obsidian-quicker-modal");
    this.contentEl.empty();
    this.contentEl.addClass("obsidian-quicker-wheel-host");
    this.contentEl.addEventListener("touchmove", (event) => {
      event.preventDefault();
      event.stopPropagation();
    });
    this.contentEl.addEventListener("click", (event) => {
      if (shouldCloseWheelFromPointerTarget(event.target, this.contentEl)) {
        this.close();
      }
    });
    this.renderWheel(this.contentEl, this.settings, (action) => this.executeAction(action));

    if (this.settings.wheel.timeoutMs > 0) {
      this.closeTimer = window.setTimeout(() => this.close(), this.settings.wheel.timeoutMs);
    }
  }

  onClose(): void {
    if (this.closeTimer !== null) {
      window.clearTimeout(this.closeTimer);
      this.closeTimer = null;
    }
    this.contentEl.empty();
  }

  private executeAction(action: WheelAction): void {
    const result = executeWheelAction(action, {
      executeCommandById: (commandId) => executeObsidianCommand(this.app, commandId),
      openFileByPath: (path) => this.openFileByPath(path),
      openUri: (uri) => window.open(uri, "_blank")
    });

    if (!result.ok) {
      new Notice(result.message ?? "动作执行失败");
      return;
    }

    this.close();
  }

  private openFileByPath(path: string): boolean {
    const file = this.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof TFile)) {
      return false;
    }

    void this.app.workspace.getLeaf(false).openFile(file);
    return true;
  }

  private renderWheel(
    container: HTMLElement,
    settings: ObsidianQuickerSettings,
    onAction: (action: WheelAction) => void
  ): void {
    renderWheelPreview(container, settings, {
      interactive: true,
      onAction,
      onSlot: (slot) => {
        this.close();
        void this.onEmptySlot?.(slot);
      },
      onCenterClick: () => this.close()
    });
  }
}

export class AndroidQuickerWheelOverlay {
  private closeTimer: number | null = null;
  private overlayEl: HTMLElement | null = null;
  private readonly openedAt = Date.now();

  constructor(
    private readonly app: App,
    private readonly settings: ObsidianQuickerSettings,
    private readonly onEmptySlot?: (slot: WheelSlot) => void | Promise<void>
  ) {}

  open(): void {
    const activeDocument = this.app.workspace.containerEl.ownerDocument;
    const overlay = activeDocument.body.createDiv({
      cls: "obsidian-quicker-android-overlay obsidian-quicker-wheel-host"
    });
    this.overlayEl = overlay;
    overlay.addEventListener("touchmove", (event) => {
      event.preventDefault();
      event.stopPropagation();
    });
    overlay.addEventListener("click", (event) => {
      if (Date.now() - this.openedAt < 300) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      if (shouldCloseWheelFromPointerTarget(event.target, overlay)) {
        this.close();
      }
    });
    this.renderWheel(overlay, this.settings, (action) => this.executeAction(action));

    if (this.settings.wheel.timeoutMs > 0) {
      this.closeTimer = activeDocument.defaultView?.setTimeout(
        () => this.close(),
        this.settings.wheel.timeoutMs
      ) ?? null;
    }
  }

  close(): void {
    if (this.closeTimer !== null) {
      const activeWindow = this.overlayEl?.ownerDocument.defaultView ?? window;
      activeWindow.clearTimeout(this.closeTimer);
      this.closeTimer = null;
    }

    this.overlayEl?.remove();
    this.overlayEl = null;
  }

  private executeAction(action: WheelAction): void {
    const result = executeWheelAction(action, {
      executeCommandById: (commandId) => executeObsidianCommand(this.app, commandId),
      openFileByPath: (path) => this.openFileByPath(path),
      openUri: (uri) => window.open(uri, "_blank")
    });

    if (!result.ok) {
      new Notice(result.message ?? "动作执行失败");
      return;
    }

    this.close();
  }

  private openFileByPath(path: string): boolean {
    const file = this.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof TFile)) {
      return false;
    }

    void this.app.workspace.getLeaf(false).openFile(file);
    return true;
  }

  private renderWheel(
    container: HTMLElement,
    settings: ObsidianQuickerSettings,
    onAction: (action: WheelAction) => void
  ): void {
    renderWheelPreview(container, settings, {
      interactive: true,
      onAction,
      onSlot: (slot) => {
        this.close();
        void this.onEmptySlot?.(slot);
      },
      onCenterClick: () => this.close()
    });
  }
}

interface RenderWheelOptions {
  interactive: boolean;
  selectedActionId?: string;
  onAction?: (action: WheelAction) => void;
  onSlot?: (slot: WheelSlot) => void | Promise<void>;
  onCenterClick?: () => void;
}

export function renderWheelPreview(
  container: HTMLElement,
  settings: ObsidianQuickerSettings,
  options: RenderWheelOptions
): void {
  container.empty();

  const viewportSize = getWheelViewportSize(container.ownerDocument.defaultView ?? window);
  const size = calculateWheelRenderSize({
    preferredSize: settings.wheel.size,
    viewportWidth: viewportSize.width,
    viewportHeight: viewportSize.height
  });
  const center = size / 2;
  const slots = buildWheelSlots(settings.wheel);
  const wrapper = container.createDiv({ cls: "obsidian-quicker-wheel" });
  wrapper.addClass(`obsidian-quicker-wheel-theme-${settings.wheel.appearance.theme}`);
  wrapper.addClass(`obsidian-quicker-wheel-shadow-${settings.wheel.appearance.shadow}`);
  wrapper.addEventListener("click", (event) => {
    event.stopPropagation();
  });
  wrapper.style.setProperty("--quicker-wheel-size", `${size}px`);
  wrapper.style.setProperty("--quicker-text-size", `${settings.wheel.textSize}px`);
  wrapper.style.setProperty("--quicker-wheel-segment-color", settings.wheel.appearance.segmentColor);
  wrapper.style.setProperty("--quicker-wheel-action-color", settings.wheel.appearance.actionSegmentColor);
  wrapper.style.setProperty("--quicker-wheel-empty-color", settings.wheel.appearance.emptySegmentColor);
  wrapper.style.setProperty("--quicker-wheel-highlight-color", settings.wheel.appearance.highlightColor);
  wrapper.style.setProperty("--quicker-wheel-divider-color", settings.wheel.appearance.dividerColor);
  wrapper.style.setProperty("--quicker-wheel-divider-width", `${settings.wheel.appearance.dividerWidth}`);
  wrapper.style.setProperty("--quicker-wheel-center-color", settings.wheel.appearance.centerColor);
  wrapper.style.setProperty("--quicker-wheel-center-icon-color", settings.wheel.appearance.centerIconColor);
  wrapper.style.setProperty("--quicker-wheel-center-size", `${settings.wheel.appearance.centerSize}%`);
  wrapper.style.width = `${size}px`;
  wrapper.style.height = `${size}px`;
  wrapper.style.opacity = `${settings.wheel.opacity / 100}`;

  const activeDocument = container.ownerDocument;
  const svg = activeDocument.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${size} ${size}`);
  svg.addClass("obsidian-quicker-wheel-svg");
  wrapper.appendChild(svg);

  const labels = wrapper.createDiv({ cls: "obsidian-quicker-wheel-labels" });
  labels.style.width = `${size}px`;
  labels.style.height = `${size}px`;

  for (const slot of slots) {
    const action = findActionForSlot(settings.actions, slot.ringIndex, slot.slotIndex);
    const path = activeDocument.createElementNS("http://www.w3.org/2000/svg", "path");
    const innerRadius = center * slot.innerRadiusRatio;
    const outerRadius = center * slot.outerRadiusRatio;
    path.setAttribute(
      "d",
      describeArcSegment(center, innerRadius, outerRadius, slot.startAngle, slot.endAngle)
    );
    path.addClass("obsidian-quicker-wheel-segment");
    if (action) {
      path.addClass("is-filled");
    } else {
      path.addClass("is-empty");
    }
    if (action?.id === options.selectedActionId) {
      path.addClass("is-selected");
    }
    path.addEventListener("click", (event) => {
      event.stopPropagation();
      const activation = getWheelSlotActivation(action, options.interactive);
      if (activation === "action" && action && options.onAction) {
        options.onAction(action);
        return;
      }
      if (activation === "slot" && options.onSlot) {
        void options.onSlot(slot);
      }
    });
    svg.appendChild(path);

    const labelPoint = polarToCartesian(center, center * slot.labelRadiusRatio, slot.labelAngle);
    const label = labels.createDiv({ cls: "obsidian-quicker-wheel-label" });
    label.style.left = `${labelPoint.x}px`;
    label.style.top = `${labelPoint.y}px`;
    label.toggleClass("is-empty", !action);
    label.toggleClass("is-selected", action?.id === options.selectedActionId);
    label.setAttr("aria-label", action ? action.label : "空动作");
    label.addEventListener("click", (event) => {
      event.stopPropagation();
      const activation = getWheelSlotActivation(action, options.interactive);
      if (activation === "action" && action && options.onAction) {
        options.onAction(action);
        return;
      }
      if (activation === "slot" && options.onSlot) {
        void options.onSlot(slot);
      }
    });

    if (action) {
      renderConfiguredIcon(
        label.createDiv({ cls: "obsidian-quicker-wheel-icon" }),
        action.icon
      );
      label.createDiv({ cls: "obsidian-quicker-wheel-text", text: action.label });
    } else {
      if (settings.wheel.appearance.emptySlotDisplay !== "hidden") {
        renderConfiguredIcon(
          label.createDiv({ cls: "obsidian-quicker-wheel-icon" }),
          DEFAULT_EMPTY_SLOT_ICON,
          "+"
        );
      }
      if (settings.wheel.appearance.emptySlotDisplay === "full") {
        label.createDiv({ cls: "obsidian-quicker-wheel-text", text: "空" });
      }
    }
  }

  const centerButton = wrapper.createDiv({
    cls: "obsidian-quicker-wheel-center"
  });
  renderConfiguredIcon(centerButton, DEFAULT_CENTER_ICON, "Q");
  centerButton.addEventListener("click", (event) => {
    event.stopPropagation();
    options.onCenterClick?.();
  });
}
