import { moment, Notice, Platform, Plugin, TFile } from "obsidian";
import { executeFloatingDirectionAction } from "./src/action-executor";
import { FloatingWheelButton } from "./src/floating-button";
import {
  createOrSelectActionForSlot,
  DEFAULT_SETTINGS,
  localizeBuiltinActionLabels,
  normalizeSettings
} from "./src/settings";
import { ObsidianQuickerSettingTab } from "./src/settings-tab";
import type { ObsidianQuickerSettings } from "./src/types";
import type { WheelSlot } from "./src/types";
import type { FloatingGestureDirection } from "./src/types";
import { executeObsidianCommand } from "./src/obsidian-commands";
import { AndroidQuickerWheelOverlay, QuickerWheelModal } from "./src/wheel-modal";
import {
  resolvePluginLocale,
  setPluginLocale,
  t,
  tr
} from "./src/i18n";
import type { PluginLanguage } from "./src/types";

type AppWithSettings = typeof Plugin.prototype.app & {
  setting?: {
    open(): void;
    openTabById(id: string): void;
  };
};

export default class ObsidianQuickerPlugin extends Plugin {
  settings: ObsidianQuickerSettings = DEFAULT_SETTINGS;
  private floatingButton: FloatingWheelButton | null = null;
  private isLayoutReady = false;
  private saveQueue: Promise<void> = Promise.resolve();
  private settingTab: ObsidianQuickerSettingTab | null = null;

  async onload(): Promise<void> {
    setPluginLocale(resolvePluginLocale("auto", moment.locale()));
    try {
      await this.loadSettings();
    } catch (error) {
      console.error("Quicker Wheel failed to load settings", error);
      this.settings = DEFAULT_SETTINGS;
    }

    this.addCommand({
      id: "open-wheel",
      name: t("command.openWheel"),
      callback: () => this.openWheel()
    });

    this.addCommand({
      id: "toggle-floating-button",
      name: t("command.toggleFloating"),
      callback: () => this.toggleFloatingButton()
    });

    this.addCommand({
      id: "open-settings",
      name: t("command.openSettings"),
      callback: () => this.openPluginSettings()
    });

    this.settingTab = new ObsidianQuickerSettingTab(this.app, this);
    this.addSettingTab(this.settingTab);
    this.app.workspace.onLayoutReady(() => {
      this.isLayoutReady = true;
      this.safeMountFloatingButton();
    });
  }

  onunload(): void {
    this.floatingButton?.hide();
    this.floatingButton = null;
  }

  openWheel(): void {
    if (Platform.isAndroidApp) {
      new AndroidQuickerWheelOverlay(this.app, this.settings, (slot) =>
        this.createActionFromWheelSlot(slot)
      ).open();
      return;
    }

    new QuickerWheelModal(this.app, this.settings, (slot) =>
      this.createActionFromWheelSlot(slot)
    ).open();
  }

  async createActionFromWheelSlot(slot: WheelSlot): Promise<void> {
    const result = createOrSelectActionForSlot(this.settings, slot.ringIndex, slot.slotIndex);
    await this.saveSettingsAndRefresh();
    this.openActionSettings(result.action.id);
    new Notice(
      result.created
        ? tr("已为空位创建新动作", "Created a new action for the empty slot")
        : tr("已打开该位置的动作设置", "Opened the action settings for this slot")
    );
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
        ? tr("Quicker Wheel 悬浮按钮已开启", "Quicker Wheel floating button enabled")
        : tr("Quicker Wheel 悬浮按钮已关闭", "Quicker Wheel floating button disabled")
    );
  }

  async loadSettings(): Promise<void> {
    const savedData: unknown = await this.loadData();
    const language = getSavedLanguage(savedData);
    setPluginLocale(resolvePluginLocale(language, moment.locale()));
    this.settings = normalizeSettings(savedData);
    localizeBuiltinActionLabels(this.settings);
  }

  async saveSettingsAndRefresh(): Promise<void> {
    this.settings = normalizeSettings(this.settings);
    setPluginLocale(resolvePluginLocale(this.settings.language, moment.locale()));
    localizeBuiltinActionLabels(this.settings);
    this.saveQueue = this.saveQueue.then(async () => {
      await this.saveData(this.settings);
      if (this.isLayoutReady) {
        this.safeMountFloatingButton();
      }
    });
    await this.saveQueue;
  }

  openPluginSettings(): void {
    const appWithSettings = this.app as AppWithSettings;

    if (!appWithSettings.setting) {
      new Notice(
        tr(
          "请打开 Obsidian 设置中的 Quicker Wheel 页面",
          "Open the Quicker Wheel page in Obsidian settings"
        )
      );
      return;
    }

    appWithSettings.setting.open();
    appWithSettings.setting.openTabById(this.manifest.id);
  }

  async setLanguagePreference(language: PluginLanguage): Promise<void> {
    this.settings.language = language;
    setPluginLocale(resolvePluginLocale(language, moment.locale()));
    localizeBuiltinActionLabels(this.settings);
    await this.saveSettingsAndRefresh();
    this.settingTab?.display();
  }

  private safeMountFloatingButton(): void {
    try {
      this.mountFloatingButton();
    } catch (error) {
      console.error("Quicker Wheel failed to mount floating button", error);
    }
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
      new Notice(tr("这个方向还没有设置动作", "No action is assigned to this direction"));
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
      new Notice(result.message ?? tr("方向动作执行失败", "Direction action failed"));
    }
  }

  private openFileByPath(path: string): boolean {
    const file = this.app.vault.getAbstractFileByPath(path);
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
    textColor: string;
    edgeHide: ObsidianQuickerSettings["floatingButton"]["edgeHide"];
  } {
    return {
      enabled: Platform.isMobileApp
        ? this.settings.floatingButton.mobileEnabled
        : this.settings.floatingButton.desktopEnabled,
      x: this.settings.floatingButton.x,
      y: this.settings.floatingButton.y,
      gesture: this.settings.floatingButton.gesture,
      colors: this.settings.floatingButton.colors,
      opacity: this.settings.floatingButton.opacity,
      textColor: this.settings.floatingButton.textColor,
      edgeHide: this.settings.floatingButton.edgeHide
    };
  }
}

function getSavedLanguage(data: unknown): PluginLanguage {
  if (
    typeof data === "object" &&
    data !== null &&
    "language" in data &&
    (data.language === "zh" || data.language === "en")
  ) {
    return data.language;
  }

  return "auto";
}
