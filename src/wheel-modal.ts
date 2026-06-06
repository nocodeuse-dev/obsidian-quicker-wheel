import { Modal, Notice, TFile } from "obsidian";
import type { App } from "obsidian";
import { executeWheelAction } from "./action-executor";
import { shouldCloseWheelFromPointerTarget } from "./dom-events";
import { executeObsidianCommand } from "./obsidian-commands";
import { getWheelSlotActivation } from "./wheel-interaction";
import {
  buildWheelSlots,
  calculateWheelRenderSize,
  describeArcSegment,
  findActionForSlot,
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
    this.modalEl.addClass("obsidian-quicker-modal");
    this.contentEl.empty();
    this.contentEl.addClass("obsidian-quicker-wheel-host");
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
    const file = this.app.vault.getFileByPath(path);
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
  onSlot?: (slot: WheelSlot) => void;
  onCenterClick?: () => void;
}

export function renderWheelPreview(
  container: HTMLElement,
  settings: ObsidianQuickerSettings,
  options: RenderWheelOptions
): void {
  container.empty();

  const size = calculateWheelRenderSize({
    preferredSize: settings.wheel.size,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight
  });
  const center = size / 2;
  const slots = buildWheelSlots(settings.wheel);
  const wrapper = container.createDiv({ cls: "obsidian-quicker-wheel" });
  wrapper.addEventListener("click", (event) => {
    event.stopPropagation();
  });
  wrapper.style.setProperty("--quicker-wheel-size", `${size}px`);
  wrapper.style.setProperty("--quicker-text-size", `${settings.wheel.textSize}px`);
  wrapper.style.width = `${size}px`;
  wrapper.style.height = `${size}px`;
  wrapper.style.opacity = `${settings.wheel.opacity / 100}`;

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${size} ${size}`);
  svg.addClass("obsidian-quicker-wheel-svg");
  wrapper.appendChild(svg);

  const labels = wrapper.createDiv({ cls: "obsidian-quicker-wheel-labels" });
  labels.style.width = `${size}px`;
  labels.style.height = `${size}px`;

  for (const slot of slots) {
    const action = findActionForSlot(settings.actions, slot.ringIndex, slot.slotIndex);
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    const innerRadius = center * slot.innerRadiusRatio;
    const outerRadius = center * slot.outerRadiusRatio;
    path.setAttribute(
      "d",
      describeArcSegment(center, innerRadius, outerRadius, slot.startAngle, slot.endAngle)
    );
    path.addClass("obsidian-quicker-wheel-segment");
    if (action) {
      path.addClass("is-filled");
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
        options.onSlot(slot);
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
        options.onSlot(slot);
      }
    });

    if (action) {
      label.createDiv({ cls: "obsidian-quicker-wheel-icon", text: action.icon });
      label.createDiv({ cls: "obsidian-quicker-wheel-text", text: action.label });
    } else {
      label.createDiv({ cls: "obsidian-quicker-wheel-icon", text: "＋" });
      label.createDiv({ cls: "obsidian-quicker-wheel-text", text: "空" });
    }
  }

  const centerButton = wrapper.createDiv({
    cls: "obsidian-quicker-wheel-center",
    text: "⌁"
  });
  centerButton.addEventListener("click", (event) => {
    event.stopPropagation();
    options.onCenterClick?.();
  });
}
