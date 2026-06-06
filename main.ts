import { Notice, Platform, Plugin, TFile } from "obsidian";
import { executeFloatingDirectionAction } from "./src/action-executor";
import { FloatingWheelButton } from "./src/floating-button";
import {
  createOrSelectActionForSlot,
  DEFAULT_SETTINGS,
  normalizeSettings
} from "./src/settings";
import { ObsidianQuickerSettingTab } from "./src/settings-tab";
import type { ObsidianQuickerSettings } from "./src/types";
import type { WheelSlot } from "./src/types";
import type { FloatingGestureDirection } from "./src/types";
import { executeObsidianCommand } from "./src/obsidian-commands";
import { QuickerWheelModal } from "./src/wheel-modal";

type AppWithSettings = typeof Plugin.prototype.app & {
  setting?: {
    open(): void;
    openTabById(id: string): void;
  };
};

export default class ObsidianQuickerPlugin extends Plugin {
  settings: ObsidianQuickerSettings = DEFAULT_SETTINGS;
  private floatingButton: FloatingWheelButton | null = null;
  private settingTab: ObsidianQuickerSettingTab | null = null;

  async onload(): Promise<void> {
    await this.loadSettings();

    this.addCommand({
      id: "open-quicker-wheel",
      name: "打开 Obsidian Quicker 轮盘",
      callback: () => this.openWheel()
    });

    this.addCommand({
      id: "toggle-floating-button",
      name: "开关 Obsidian Quicker 悬浮按钮",
      callback: () => this.toggleFloatingButton()
    });

    this.addCommand({
      id: "open-quicker-settings",
      name: "打开 Obsidian Quicker 设置",
      callback: () => this.openPluginSettings()
    });

    this.settingTab = new ObsidianQuickerSettingTab(this.app, this);
    this.addSettingTab(this.settingTab);
    this.app.workspace.onLayoutReady(() => this.mountFloatingButton());
  }

  onunload(): void {
    this.floatingButton?.hide();
    this.floatingButton = null;
  }

  openWheel(): void {
    new QuickerWheelModal(this.app, this.settings, (slot) =>
      this.createActionFromWheelSlot(slot)
    ).open();
  }

  async createActionFromWheelSlot(slot: WheelSlot): Promise<void> {
    const result = createOrSelectActionForSlot(this.settings, slot.ringIndex, slot.slotIndex);
    await this.saveSettingsAndRefresh();
    this.openActionSettings(result.action.id);
    new Notice(result.created ? "已为空位创建新动作" : "已打开该位置的动作设置");
  }

  async toggleFloatingButton(): Promise<void> {
    if (Platform.isMobileApp) {
      this.settings.floatingButton.mobileEnabled = !this.settings.floatingButton.mobileEnabled;
    } else {
      this.settings.floatingButton.desktopEnabled = !this.settings.floatingButton.desktopEnabled;
    }
    await this.saveSettingsAndRefresh();
    const enabled = Platform.isMobileApp
      ? this.settings.floatingButton.mobileEnabled
      : this.settings.floatingButton.desktopEnabled;
    new Notice(
      enabled
        ? "Obsidian Quicker 悬浮按钮已开启"
        : "Obsidian Quicker 悬浮按钮已关闭"
    );
  }

  async loadSettings(): Promise<void> {
    this.settings = normalizeSettings(await this.loadData());
    await this.saveData(this.settings);
  }

  async saveSettingsAndRefresh(): Promise<void> {
    this.settings = normalizeSettings(this.settings);
    await this.saveData(this.settings);
    this.app.workspace.onLayoutReady(() => this.mountFloatingButton());
  }

  openPluginSettings(): void {
    const appWithSettings = this.app as AppWithSettings;

    if (!appWithSettings.setting) {
      new Notice("请打开 Obsidian 设置中的 Obsidian Quicker 页面");
      return;
    }

    appWithSettings.setting.open();
    appWithSettings.setting.openTabById(this.manifest.id);
  }

  private mountFloatingButton(): void {
    if (!this.floatingButton) {
      this.floatingButton = new FloatingWheelButton({
        plugin: this,
        settings: this.currentFloatingButtonSettings(),
        onOpen: () => this.openWheel(),
        onDirection: (direction) => this.executeFloatingDirectionCommand(direction),
        onMove: async (x, y) => {
          this.settings.floatingButton.x = x;
          this.settings.floatingButton.y = y;
          await this.saveData(this.settings);
        }
      });
    }

    this.floatingButton.refresh(this.currentFloatingButtonSettings());
  }

  private openActionSettings(actionId: string): void {
    this.settingTab?.focusAction(actionId);
    this.openPluginSettings();
    this.settingTab?.focusAction(actionId);
  }

  private executeFloatingDirectionCommand(direction: FloatingGestureDirection): void {
    const action = this.settings.floatingButton.directionActions[direction];
    if (!action) {
      new Notice("这个方向还没有设置动作");
      return;
    }

    const result = executeFloatingDirectionAction(
      action,
      this.settings.actions,
      {
        executeCommandById: (commandId) => executeObsidianCommand(this.app, commandId),
        openFileByPath: (path) => this.openFileByPath(path),
        openUri: (uri) => window.open(uri, "_blank")
      }
    );

    if (!result.ok) {
      new Notice(result.message ?? "方向动作执行失败");
    }
  }

  private openFileByPath(path: string): boolean {
    const file = this.app.vault.getFileByPath(path);
    if (!(file instanceof TFile)) {
      return false;
    }

    void this.app.workspace.getLeaf(false).openFile(file);
    return true;
  }

  private currentFloatingButtonSettings(): {
    enabled: boolean;
    x: number;
    y: number;
    gesture: ObsidianQuickerSettings["floatingButton"]["gesture"];
    colors: ObsidianQuickerSettings["floatingButton"]["colors"];
    opacity: ObsidianQuickerSettings["floatingButton"]["opacity"];
  } {
    return {
      enabled: Platform.isMobileApp
        ? this.settings.floatingButton.mobileEnabled
        : this.settings.floatingButton.desktopEnabled,
      x: this.settings.floatingButton.x,
      y: this.settings.floatingButton.y,
      gesture: this.settings.floatingButton.gesture,
      colors: this.settings.floatingButton.colors,
      opacity: this.settings.floatingButton.opacity
    };
  }
}
