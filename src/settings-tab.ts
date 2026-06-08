import {
  AbstractInputSuggest,
  ColorComponent,
  Notice,
  PluginSettingTab,
  SliderComponent,
  Setting,
  TextComponent
} from "obsidian";
import type { App } from "obsidian";
import type ObsidianQuickerPlugin from "../main";
import { getActionSavedNotice, getPreviewSelectedActionId } from "./action-editor";
import {
  filterObsidianCommands,
  getCommandInputDisplayValue,
  listObsidianCommands
} from "./obsidian-commands";
import {
  FLOATING_DIRECTION_LABELS,
  FLOATING_DIRECTIONS
} from "./floating-gesture";
import { DEFAULT_CENTER_ICON, renderConfiguredIcon } from "./icons";
import type { ObsidianCommand } from "./obsidian-commands";
import { filterObsidianFiles } from "./obsidian-files";
import type { ObsidianFileItem } from "./obsidian-files";
import { createBlankAction } from "./settings";
import { renderWheelPreview } from "./wheel-modal";
import type { WheelAction } from "./types";
import type { FloatingDirectionAction, FloatingGestureDirection } from "./types";

type SettingsView = "menu" | "actions" | "floating" | "floatingActions" | "other";

export class ObsidianQuickerSettingTab extends PluginSettingTab {
  private activeView: SettingsView = "menu";
  private selectedActionId: string | null = null;
  private selectedDirection: FloatingGestureDirection = "up";
  private commandCache: ObsidianCommand[] | null = null;
  private fileCache: ObsidianFileItem[] | null = null;
  private directionDrafts: Partial<Record<FloatingGestureDirection, FloatingDirectionAction>> = {};
  private query = "";

  constructor(app: App, private readonly plugin: ObsidianQuickerPlugin) {
    super(app, plugin);
  }

  focusAction(actionId: string): void {
    this.activeView = "actions";
    this.selectedActionId = actionId;
    if (this.containerEl.isShown()) {
      this.display();
    }
  }

  display(): void {
    this.containerEl.empty();
    this.containerEl.addClass("obsidian-quicker-settings");

    const tabs = this.containerEl.createDiv({ cls: "obsidian-quicker-tabs" });
    this.createTab(tabs, "menu", "轮盘菜单设置");
    this.createTab(tabs, "actions", "轮盘动作管理");
    this.createTab(tabs, "floating", "悬浮窗设置");
    this.createTab(tabs, "floatingActions", "悬浮窗动作管理");
    this.createTab(tabs, "other", "其他");

    try {
      this.renderActiveView();
    } catch (error) {
      this.renderSettingsError(error);
    }
  }

  private rerenderPreservingScroll(): void {
    const scrollContainer = this.getScrollContainer();
    const scrollTop = scrollContainer?.scrollTop ?? 0;

    this.display();

    if (!scrollContainer) {
      return;
    }

    const ownerWindow = this.containerEl.ownerDocument.defaultView ?? window;
    ownerWindow.requestAnimationFrame(() => {
      scrollContainer.scrollTop = scrollTop;
    });
  }

  private getScrollContainer(): HTMLElement | null {
    let element = this.containerEl.parentElement;

    while (element) {
      const style = element.ownerDocument.defaultView?.getComputedStyle(element);
      const overflowY = style?.overflowY ?? "";
      if (
        element.scrollHeight > element.clientHeight &&
        (overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay")
      ) {
        return element;
      }

      element = element.parentElement;
    }

    return this.containerEl.parentElement;
  }

  private renderActiveView(): void {
    if (this.activeView === "menu") {
      this.renderMenuSettings();
    } else if (this.activeView === "actions") {
      this.renderActionManager();
    } else if (this.activeView === "floating") {
      this.renderFloatingSettings();
    } else if (this.activeView === "floatingActions") {
      this.renderFloatingActionSettings();
    } else {
      this.renderOtherSettings();
    }
  }

  private renderSettingsError(error: unknown): void {
    console.error("Quicker Wheel settings render failed", error);
    new Notice("Quicker Wheel 设置页渲染失败，已进入安全模式");

    const section = this.containerEl.createDiv({ cls: "obsidian-quicker-settings-section" });
    this.addHeading(section, "设置页安全模式");
    section.createDiv({
      cls: "setting-item-description",
      text: "当前页面渲染时出现错误。你可以切换到基础设置，或重新打开插件设置。"
    });

    new Setting(section)
      .setName("返回基础设置")
      .setDesc(error instanceof Error ? error.message : String(error))
      .addButton((button) =>
        button
          .setButtonText("打开")
          .setCta()
          .onClick(() => {
            this.activeView = "menu";
            this.display();
          })
      );
  }

  private createTab(container: HTMLElement, view: SettingsView, label: string): void {
    const button = container.createEl("button", {
      cls: "obsidian-quicker-tab",
      text: label
    });
    button.toggleClass("is-active", this.activeView === view);
    button.addEventListener("click", () => {
      this.activeView = view;
      this.display();
    });
  }

  private addHeading(container: HTMLElement, text: string): void {
    new Setting(container).setName(text).setHeading();
  }

  private renderMenuSettings(): void {
    const section = this.containerEl.createDiv({ cls: "obsidian-quicker-settings-section" });
    this.addHeading(section, "基础设置");

    this.addNumberSetting(section, "轮盘圈数", "1 到 3 圈。", 1, 3, this.plugin.settings.wheel.ringCount, async (value) => {
      this.plugin.settings.wheel.ringCount = value;
      await this.plugin.saveSettingsAndRefresh();
    });
    this.addNumberSetting(section, "每圈格数", "每圈 4 到 16 格。", 4, 16, this.plugin.settings.wheel.slotsPerRing, async (value) => {
      this.plugin.settings.wheel.slotsPerRing = value;
      await this.plugin.saveSettingsAndRefresh();
    });
    this.addNumberSetting(section, "轮盘尺寸", "移动端建议 320 到 480。", 240, 720, this.plugin.settings.wheel.size, async (value) => {
      this.plugin.settings.wheel.size = value;
      await this.plugin.saveSettingsAndRefresh();
    });
    this.addNumberSetting(section, "文字大小", "轮盘标签字号。", 8, 24, this.plugin.settings.wheel.textSize, async (value) => {
      this.plugin.settings.wheel.textSize = value;
      await this.plugin.saveSettingsAndRefresh();
    });
    this.addNumberSetting(section, "超时取消", "轮盘自动关闭时间，单位毫秒。", 1000, 60000, this.plugin.settings.wheel.timeoutMs, async (value) => {
      this.plugin.settings.wheel.timeoutMs = value;
      await this.plugin.saveSettingsAndRefresh();
    });
    this.addNumberSetting(section, "轮盘透明度", "轮盘整体透明度，20 到 100。", 20, 100, this.plugin.settings.wheel.opacity, async (value) => {
      this.plugin.settings.wheel.opacity = value;
      await this.plugin.saveSettingsAndRefresh();
    });

    this.addHeading(section, "轮盘外观");
    new Setting(section)
      .setName("轮盘主题")
      .setDesc("只改变轻量 CSS 变量，不增加复杂动画。")
      .addDropdown((dropdown) =>
        dropdown
          .addOption("soft", "柔和")
          .addOption("classic", "经典")
          .addOption("glass", "玻璃")
          .setValue(this.plugin.settings.wheel.appearance.theme)
          .onChange(async (value) => {
            this.plugin.settings.wheel.appearance.theme = value as typeof this.plugin.settings.wheel.appearance.theme;
            await this.plugin.saveSettingsAndRefresh();
          })
      );
    this.addColorSetting(section, "普通扇区颜色", "轮盘基础扇区背景色。", this.plugin.settings.wheel.appearance.segmentColor, async (value) => {
      this.plugin.settings.wheel.appearance.segmentColor = value;
      await this.plugin.saveSettingsAndRefresh();
    });
    this.addColorSetting(section, "动作扇区颜色", "已经绑定动作的扇区背景色。", this.plugin.settings.wheel.appearance.actionSegmentColor, async (value) => {
      this.plugin.settings.wheel.appearance.actionSegmentColor = value;
      await this.plugin.saveSettingsAndRefresh();
    });
    this.addColorSetting(section, "空位扇区颜色", "没有动作的扇区背景色。", this.plugin.settings.wheel.appearance.emptySegmentColor, async (value) => {
      this.plugin.settings.wheel.appearance.emptySegmentColor = value;
      await this.plugin.saveSettingsAndRefresh();
    });
    this.addColorSetting(section, "高亮颜色", "选中或悬停扇区的颜色。", this.plugin.settings.wheel.appearance.highlightColor, async (value) => {
      this.plugin.settings.wheel.appearance.highlightColor = value;
      await this.plugin.saveSettingsAndRefresh();
    });
    this.addColorSetting(section, "分割线颜色", "轮盘扇区之间的线条颜色。", this.plugin.settings.wheel.appearance.dividerColor, async (value) => {
      this.plugin.settings.wheel.appearance.dividerColor = value;
      await this.plugin.saveSettingsAndRefresh();
    });
    this.addNumberSetting(section, "分割线粗细", "建议 1 到 2，过粗会显得拥挤。", 1, 4, this.plugin.settings.wheel.appearance.dividerWidth, async (value) => {
      this.plugin.settings.wheel.appearance.dividerWidth = value;
      await this.plugin.saveSettingsAndRefresh();
    });
    this.addColorSetting(section, "中心按钮颜色", "轮盘中心按钮背景色。", this.plugin.settings.wheel.appearance.centerColor, async (value) => {
      this.plugin.settings.wheel.appearance.centerColor = value;
      await this.plugin.saveSettingsAndRefresh();
    });
    this.addColorSetting(section, "中心图标颜色", "轮盘中心图标颜色。", this.plugin.settings.wheel.appearance.centerIconColor, async (value) => {
      this.plugin.settings.wheel.appearance.centerIconColor = value;
      await this.plugin.saveSettingsAndRefresh();
    });
    this.addNumberSetting(section, "中心按钮大小", "中心按钮占轮盘直径百分比，10 到 24。", 10, 24, this.plugin.settings.wheel.appearance.centerSize, async (value) => {
      this.plugin.settings.wheel.appearance.centerSize = value;
      await this.plugin.saveSettingsAndRefresh();
    });
    new Setting(section)
      .setName("轮盘阴影")
      .setDesc("轻量阴影，不影响交互速度。")
      .addDropdown((dropdown) =>
        dropdown
          .addOption("soft", "轻微")
          .addOption("none", "无")
          .addOption("strong", "明显")
          .setValue(this.plugin.settings.wheel.appearance.shadow)
          .onChange(async (value) => {
            this.plugin.settings.wheel.appearance.shadow = value as typeof this.plugin.settings.wheel.appearance.shadow;
            await this.plugin.saveSettingsAndRefresh();
          })
      );
    new Setting(section)
      .setName("空位显示")
      .setDesc("减少空位文字可以让轮盘更清爽。")
      .addDropdown((dropdown) =>
        dropdown
          .addOption("full", "显示 + 和空")
          .addOption("icon", "只显示 +")
          .addOption("hidden", "隐藏空位标记")
          .setValue(this.plugin.settings.wheel.appearance.emptySlotDisplay)
          .onChange(async (value) => {
            this.plugin.settings.wheel.appearance.emptySlotDisplay = value as typeof this.plugin.settings.wheel.appearance.emptySlotDisplay;
            await this.plugin.saveSettingsAndRefresh();
          })
      );
  }

  private renderFloatingSettings(): void {
    const section = this.containerEl.createDiv({ cls: "obsidian-quicker-settings-section obsidian-quicker-floating-settings" });
    this.addHeading(section, "悬浮窗设置");

    new Setting(section)
      .setName("移动端悬浮按钮")
      .setDesc("短按打开轮盘，快速朝方向滑动执行命令，长按后拖动可移动位置。")
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.floatingButton.mobileEnabled).onChange(async (value) => {
          this.plugin.settings.floatingButton.mobileEnabled = value;
          await this.plugin.saveSettingsAndRefresh();
        })
      );

    new Setting(section)
      .setName("桌面端悬浮按钮")
      .setDesc("开启后桌面端显示悬浮按钮；左侧 Ribbon 开关按钮已关闭。")
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.floatingButton.desktopEnabled).onChange(async (value) => {
          this.plugin.settings.floatingButton.desktopEnabled = value;
          await this.plugin.saveSettingsAndRefresh();
        })
      );

    this.addHeading(section, "触发时间");
    this.addNumberSetting(section, "短按最大时间", "短按不移动时打开轮盘，单位毫秒。", 80, 1200, this.plugin.settings.floatingButton.gesture.tapMaxMs, async (value) => {
      this.plugin.settings.floatingButton.gesture.tapMaxMs = value;
      await this.plugin.saveSettingsAndRefresh();
    });
    this.addNumberSetting(section, "方向滑动最大时间", "在这个时间内滑够距离，会触发方向命令。", 120, 2000, this.plugin.settings.floatingButton.gesture.swipeMaxMs, async (value) => {
      this.plugin.settings.floatingButton.gesture.swipeMaxMs = value;
      await this.plugin.saveSettingsAndRefresh();
    });
    this.addNumberSetting(section, "长按移动触发时间", "按住超过这个时间后拖动，才会移动悬浮按钮位置。", 250, 3000, this.plugin.settings.floatingButton.gesture.longPressMoveMs, async (value) => {
      this.plugin.settings.floatingButton.gesture.longPressMoveMs = value;
      await this.plugin.saveSettingsAndRefresh();
    });
    this.addNumberSetting(section, "方向滑动距离", "快速滑动至少达到这个距离才触发方向命令，单位像素。", 12, 180, this.plugin.settings.floatingButton.gesture.swipeDistance, async (value) => {
      this.plugin.settings.floatingButton.gesture.swipeDistance = value;
      await this.plugin.saveSettingsAndRefresh();
    });
    this.addNumberSetting(section, "移动起始距离", "长按后拖动超过这个距离才开始移动按钮，单位像素。", 1, 80, this.plugin.settings.floatingButton.gesture.dragStartDistance, async (value) => {
      this.plugin.settings.floatingButton.gesture.dragStartDistance = value;
      await this.plugin.saveSettingsAndRefresh();
    });

    this.addHeading(section, "颜色与透明度设置");
    const colorGrid = section.createDiv({ cls: "obsidian-quicker-color-grid" });
    this.renderFloatingColorCard(colorGrid, "default", "默认", "空闲");
    this.renderFloatingColorCard(colorGrid, "tap", "短按", "打开轮盘");
    this.renderFloatingColorCard(colorGrid, "swipe", "方向滑动", "8 方向");
    this.renderFloatingColorCard(colorGrid, "move", "长按移动", "拖动位置");
  }

  private renderFloatingActionSettings(): void {
    const section = this.containerEl.createDiv({ cls: "obsidian-quicker-settings-section obsidian-quicker-floating-action-settings" });
    this.addHeading(section, "悬浮窗动作管理");
    this.renderFloatingDirectionPanel(section, this.getCommands());
  }

  private renderOtherSettings(): void {
    const section = this.containerEl.createDiv({ cls: "obsidian-quicker-settings-section obsidian-quicker-other-settings" });
    const support = section.createDiv({ cls: "obsidian-quicker-support-card" });
    const text = support.createDiv({ cls: "obsidian-quicker-support-copy" });
    this.addHeading(text, "反馈、帮助、支持插件");
    text.createDiv({
      cls: "setting-item-description",
      text: "查看使用帮助、提交反馈，或支持 Quicker Wheel 的持续开发。"
    });

    const button = support.createEl("button", {
      cls: "mod-cta obsidian-quicker-support-button",
      text: "打开页面"
    });
    button.addEventListener("click", () => {
      window.open("https://d00d1uhgsxk.feishu.cn/docx/E4RqddkYjoAItOxGzZJcN4C1nIf?from=from_copylink", "_blank");
    });
  }

  private renderActionManager(): void {
    const layout = this.containerEl.createDiv({ cls: "obsidian-quicker-action-manager" });
    const sidebar = layout.createDiv({ cls: "obsidian-quicker-action-sidebar" });
    const preview = layout.createDiv({ cls: "obsidian-quicker-action-preview" });

    const search = sidebar.createEl("input", {
      cls: "obsidian-quicker-action-search",
      attr: { type: "search", placeholder: "筛选..." }
    });
    search.value = this.query;
    search.addEventListener("input", () => {
      this.query = search.value;
      this.rerenderPreservingScroll();
    });

    const list = sidebar.createDiv({ cls: "obsidian-quicker-action-list" });
    for (const action of this.filteredActions()) {
      const item = list.createDiv({ cls: "obsidian-quicker-action-item" });
      item.toggleClass("is-selected", action.id === this.selectedActionId);
      renderConfiguredIcon(
        item.createDiv({ cls: "obsidian-quicker-action-item-icon" }),
        action.icon
      );
      const body = item.createDiv({ cls: "obsidian-quicker-action-item-body" });
      body.createDiv({ cls: "obsidian-quicker-action-item-label", text: action.label });
      body.createDiv({
        cls: "obsidian-quicker-action-item-meta",
        text: action.commandId || action.filePath || action.type
      });
      item.addEventListener("click", () => {
        this.selectedActionId = action.id;
        this.rerenderPreservingScroll();
      });
    }

    const buttons = sidebar.createDiv({ cls: "obsidian-quicker-action-buttons" });
    this.addSmallButton(buttons, "+", "新增动作", () => this.addAction());
    this.addSmallButton(buttons, "✎", "编辑动作", () => this.focusSelectedAction());
    this.addSmallButton(buttons, "🗑", "删除动作", () => this.deleteSelectedAction());
    this.addSmallButton(buttons, "↑", "上移", () => this.moveSelectedAction(-1));

    this.addHeading(preview, "轮盘预览");
    const wheelHost = preview.createDiv({ cls: "obsidian-quicker-settings-preview-wheel" });
    renderWheelPreview(wheelHost, this.plugin.settings, {
      interactive: false,
      selectedActionId: this.selectedActionId ?? undefined,
      onAction: (action) => {
        this.selectedActionId = getPreviewSelectedActionId(action);
        this.rerenderPreservingScroll();
      },
      onSlot: async (slot) => {
        const selected = this.selectedAction;
        if (!selected) {
          const action = createBlankAction(slot.ringIndex, slot.slotIndex);
          this.plugin.settings.actions.push(action);
          this.selectedActionId = action.id;
        } else {
          selected.ringIndex = slot.ringIndex;
          selected.slotIndex = slot.slotIndex;
        }
        await this.plugin.saveSettingsAndRefresh();
        this.rerenderPreservingScroll();
      }
    });

    this.renderActionEditor(preview);
  }

  private renderActionEditor(container: HTMLElement): void {
    const action = this.selectedAction;
    const editor = container.createDiv({ cls: "obsidian-quicker-action-editor" });
    this.addHeading(editor, "动作编辑");

    if (!action) {
      editor.createDiv({ cls: "setting-item-description", text: "选择一个动作，或点击轮盘空格创建动作。" });
      return;
    }

    new Setting(editor)
      .setName("名称")
      .addText((text) =>
        text.setValue(action.label).onChange((value) => {
          action.label = value;
        })
      );

    new Setting(editor)
      .setName("图标")
      .setDesc("填写 Obsidian 图标名称、SVG，或短文本。建议移动端优先使用图标名称。")
      .addText((text) =>
        text.setValue(action.icon).onChange((value) => {
          action.icon = value || "•";
        })
      );

    new Setting(editor)
      .setName("启用")
      .addToggle((toggle) =>
        toggle.setValue(action.enabled).onChange(async (value) => {
          action.enabled = value;
          await this.plugin.saveSettingsAndRefresh();
        })
      );

    new Setting(editor)
      .setName("动作类型")
      .setDesc("支持 Obsidian 命令和打开文件；URI 和脚本为后续扩展预留。")
      .addDropdown((dropdown) =>
        dropdown
          .addOption("command", "Obsidian 命令")
          .addOption("file", "打开文件")
          .addOption("uri", "URI（预留）")
          .addOption("script", "脚本（预留）")
          .setValue(action.type)
          .onChange((value) => {
            action.type = value as WheelAction["type"];
            this.rerenderPreservingScroll();
          })
      );

    if (action.type === "command") {
      new Setting(editor)
        .setName("Obsidian 命令")
        .setDesc("搜索命令名称，或直接粘贴命令 ID。")
        .addText((text) => {
          text
            .setPlaceholder("搜索命令或输入 command id")
            .setValue(getCommandInputDisplayValue(this.getCommands(), action.commandId))
            .onChange((value) => {
              action.commandId = this.resolveCommandInputValue(value);
            });

        new CommandInputSuggest(
          this.app,
          text.inputEl,
          this.getCommands(),
          (command) => {
            action.commandId = command.id;
            text.setValue(command.name);
          }
        );
        });
    } else if (action.type === "file") {
      let fileInput: TextComponent | null = null;
      new Setting(editor)
        .setName("打开文件")
        .setDesc("输入 vault 内文件路径，或使用当前打开文件。")
        .addText((text) => {
          fileInput = text;
          text
            .setPlaceholder("搜索文件或输入文件路径")
            .setValue(action.filePath ?? "")
            .onChange((value) => {
              action.filePath = value.trim();
            });

          new FilePathInputSuggest(this.app, text.inputEl, () => this.getFiles(), (file) => {
            action.filePath = file.path;
            text.setValue(file.path);
          });
        })
        .addButton((button) =>
          button
            .setButtonText("使用当前文件")
            .onClick(() => {
              const activePath = this.getActiveFilePath();
              if (!activePath) {
                new Notice("当前没有打开的 Markdown 文件");
                return;
              }
              action.filePath = activePath;
              fileInput?.setValue(activePath);
            })
        );
    } else if (action.type === "uri") {
      new Setting(editor)
        .setName("URI")
        .setDesc("可先保存，执行能力将在后续版本继续增强。")
        .addText((text) =>
          text.setValue(action.uri ?? "").onChange((value) => {
            action.uri = value;
          })
        );
    } else {
      new Setting(editor)
        .setName("脚本")
        .setDesc("脚本动作预留字段，当前版本不会执行。")
        .addTextArea((text) =>
          text.setValue(action.script ?? "").onChange((value) => {
            action.script = value;
          })
        );
    }

    const actions = editor.createDiv({ cls: "obsidian-quicker-action-editor-actions" });
    const saveButton = actions.createEl("button", {
      cls: "mod-cta obsidian-quicker-save-action-button",
      text: "保存动作"
    });
    saveButton.addEventListener("click", () => {
      void (async () => {
        await this.plugin.saveSettingsAndRefresh();
        new Notice(getActionSavedNotice(action.label));
      })();
    });
  }

  private addNumberSetting(
    container: HTMLElement,
    name: string,
    desc: string,
    min: number,
    max: number,
    value: number,
    onChange: (value: number) => Promise<void>
  ): void {
    new Setting(container)
      .setName(name)
      .setDesc(desc)
      .addSlider((slider) =>
        slider
          .setLimits(min, max, 1)
          .setValue(value)
          .setDynamicTooltip()
          .onChange(onChange)
      )
      .addText((text) =>
        text
          .setValue(String(value))
          .onChange(async (raw) => {
            const next = Number.parseInt(raw, 10);
            if (!Number.isNaN(next)) {
              await onChange(Math.min(max, Math.max(min, next)));
            }
          })
      );
  }

  private addColorSetting(
    container: HTMLElement,
    name: string,
    desc: string,
    value: string,
    onChange: (value: string) => Promise<void>
  ): void {
    new Setting(container)
      .setName(name)
      .setDesc(desc)
      .addColorPicker((color) =>
        color
          .setValue(value)
          .onChange(async (next) => {
            await onChange(next);
          })
      );
  }

  private renderFloatingColorCard(
    container: HTMLElement,
    key: keyof ObsidianQuickerPlugin["settings"]["floatingButton"]["colors"],
    label: string,
    hint: string
  ): void {
    const card = container.createDiv({ cls: "obsidian-quicker-color-card" });
    const title = card.createDiv({ cls: "obsidian-quicker-color-card-title" });
    title.createDiv({ cls: "obsidian-quicker-color-card-label", text: label });
    title.createDiv({ cls: "obsidian-quicker-color-card-hint", text: hint });

    const controls = card.createDiv({ cls: "obsidian-quicker-color-card-controls" });
    new ColorComponent(controls)
      .setValue(this.plugin.settings.floatingButton.colors[key])
      .onChange(async (value) => {
        this.plugin.settings.floatingButton.colors[key] = value;
        await this.plugin.saveSettingsAndRefresh();
      });

    const opacity = this.plugin.settings.floatingButton.opacity[key];
    const slider = new SliderComponent(controls)
      .setLimits(20, 100, 1)
      .setValue(opacity)
      .setDynamicTooltip();
    const text = new TextComponent(controls)
      .setValue(String(opacity))
      .onChange(async (raw) => {
        const next = Number.parseInt(raw, 10);
        if (Number.isNaN(next)) {
          return;
        }
        const clamped = Math.min(100, Math.max(20, next));
        this.plugin.settings.floatingButton.opacity[key] = clamped;
        slider.setValue(clamped);
        await this.plugin.saveSettingsAndRefresh();
      });
    text.inputEl.addClass("obsidian-quicker-color-card-opacity-input");
    slider.onChange(async (value) => {
      this.plugin.settings.floatingButton.opacity[key] = value;
      text.setValue(String(value));
      await this.plugin.saveSettingsAndRefresh();
    });
  }

  private addSmallButton(
    container: HTMLElement,
    icon: string,
    label: string,
    onClick: () => void | Promise<void>
  ): void {
    const button = container.createEl("button", {
      cls: "obsidian-quicker-icon-button",
      text: icon,
      attr: { "aria-label": label, title: label }
    });
    button.addEventListener("click", () => {
      void onClick();
    });
  }

  private async addAction(): Promise<void> {
    const action = createBlankAction(0, 0);
    this.plugin.settings.actions.push(action);
    this.selectedActionId = action.id;
    await this.plugin.saveSettingsAndRefresh();
    this.rerenderPreservingScroll();
  }

  private focusSelectedAction(): void {
    if (!this.selectedActionId && this.plugin.settings.actions[0]) {
      this.selectedActionId = this.plugin.settings.actions[0].id;
      this.rerenderPreservingScroll();
    }
  }

  private async deleteSelectedAction(): Promise<void> {
    if (!this.selectedActionId) {
      return;
    }

    this.plugin.settings.actions = this.plugin.settings.actions.filter(
      (action) => action.id !== this.selectedActionId
    );
    this.selectedActionId = this.plugin.settings.actions[0]?.id ?? null;
    await this.plugin.saveSettingsAndRefresh();
    this.rerenderPreservingScroll();
  }

  private async moveSelectedAction(delta: number): Promise<void> {
    if (!this.selectedActionId) {
      return;
    }

    const index = this.plugin.settings.actions.findIndex((action) => action.id === this.selectedActionId);
    const nextIndex = index + delta;
    if (index < 0 || nextIndex < 0 || nextIndex >= this.plugin.settings.actions.length) {
      return;
    }

    const [action] = this.plugin.settings.actions.splice(index, 1);
    this.plugin.settings.actions.splice(nextIndex, 0, action);
    await this.plugin.saveSettingsAndRefresh();
    this.rerenderPreservingScroll();
  }

  private filteredActions(): WheelAction[] {
    const normalizedQuery = this.query.trim().toLowerCase();
    if (!normalizedQuery) {
      return this.plugin.settings.actions;
    }

    return this.plugin.settings.actions.filter((action) =>
      `${action.label} ${action.commandId ?? ""} ${action.filePath ?? ""} ${action.type}`.toLowerCase().includes(normalizedQuery)
    );
  }

  private resolveCommandInputValue(value: string): string {
    const trimmed = value.trim();
    const command = this.getCommands().find(
      (candidate) => candidate.name === trimmed || candidate.id === trimmed
    );

    return command?.id ?? trimmed;
  }

  private getCommands(): ObsidianCommand[] {
    this.commandCache ??= listObsidianCommands(this.app);
    return this.commandCache;
  }

  private getFiles(): ObsidianFileItem[] {
    this.fileCache ??= this.app.vault.getFiles().map((file) => ({
      name: file.basename || file.name,
      path: file.path
    }));
    return this.fileCache;
  }

  private renderFloatingDirectionPanel(
    container: HTMLElement,
    commands: ObsidianCommand[]
  ): void {
    const panel = container.createDiv({ cls: "obsidian-quicker-direction-panel" });
    const map = panel.createDiv({ cls: "obsidian-quicker-direction-map" });
    renderConfiguredIcon(
      map.createDiv({ cls: "obsidian-quicker-direction-center" }),
      DEFAULT_CENTER_ICON,
      "Q"
    );

    for (const direction of FLOATING_DIRECTIONS) {
      this.renderFloatingDirectionButton(map, direction);
    }

    this.renderSelectedFloatingDirectionEditor(panel, commands);
  }

  private renderFloatingDirectionButton(
    container: HTMLElement,
    direction: FloatingGestureDirection
  ): void {
    const action = this.plugin.settings.floatingButton.directionActions[direction];
    const button = container.createEl("button", {
      cls: `obsidian-quicker-direction-arrow obsidian-quicker-direction-arrow-${direction}`,
      attr: {
        "aria-label": `${FLOATING_DIRECTION_LABELS[direction]}滑动作`,
        title: `${FLOATING_DIRECTION_LABELS[direction]}滑`
      }
    });
    button.toggleClass("is-selected", direction === this.selectedDirection);
    button.toggleClass("is-configured", this.isDirectionActionConfigured(action));
    button.createDiv({ cls: "obsidian-quicker-direction-arrow-icon", text: this.getDirectionArrowGlyph(direction) });
    button.createDiv({
      cls: "obsidian-quicker-direction-arrow-label",
      text: FLOATING_DIRECTION_LABELS[direction]
    });
    button.createDiv({
      cls: "obsidian-quicker-direction-arrow-summary",
      text: this.getDirectionActionSummary(action)
    });
    button.addEventListener("click", () => {
      this.selectedDirection = direction;
      this.rerenderPreservingScroll();
    });
  }

  private renderSelectedFloatingDirectionEditor(
    container: HTMLElement,
    commands: ObsidianCommand[]
  ): void {
    const direction = this.selectedDirection;
    const action = this.getDirectionDraft(direction);
    const card = container.createDiv({ cls: "obsidian-quicker-direction-editor" });
    const header = card.createDiv({ cls: "obsidian-quicker-direction-editor-header" });
    header.createDiv({
      cls: "obsidian-quicker-direction-editor-title",
      text: `${FLOATING_DIRECTION_LABELS[direction]}滑动作`
    });
    header.createDiv({
      cls: "obsidian-quicker-direction-editor-summary",
      text: this.getDirectionActionSummary(action)
    });

    new Setting(card)
      .setName("启用")
      .addToggle((toggle) =>
        toggle.setValue(action.enabled).onChange((value) => {
          action.enabled = value;
        })
      );

    new Setting(card)
      .setName("动作来源")
      .setDesc("可以直接复用轮盘动作，也可以单独设置命令、文件、URI 或脚本。")
      .addDropdown((dropdown) =>
        dropdown
          .addOption("wheelAction", "轮盘动作")
          .addOption("command", "命令")
          .addOption("file", "文件")
          .addOption("uri", "URI")
          .addOption("script", "脚本")
          .setValue(action.type)
          .onChange((value) => {
            action.type = value as FloatingDirectionAction["type"];
            this.rerenderPreservingScroll();
          })
      );

    const body = card.createDiv({ cls: "obsidian-quicker-direction-editor-body" });

    if (action.type === "wheelAction") {
      new Setting(body)
        .setName("轮盘动作")
        .setDesc("选择一个已经在轮盘动作管理中配置好的动作。")
        .addDropdown((dropdown) => {
          dropdown.addOption("", "选择轮盘动作...");
          for (const wheelAction of this.plugin.settings.actions) {
            dropdown.addOption(wheelAction.id, `${wheelAction.icon} ${wheelAction.label}`);
          }
          dropdown.setValue(action.actionId ?? "").onChange((value) => {
            action.actionId = value;
          });
        });
      this.renderDirectionEditorActions(card, direction, action);
      return;
    }

    this.renderInlineDirectionActionFields(body, action, commands);
    this.renderDirectionEditorActions(card, direction, action);
  }

  private renderInlineDirectionActionFields(
    container: HTMLElement,
    action: FloatingDirectionAction,
    commands: ObsidianCommand[]
  ): void {
    if (action.type === "command") {
      new Setting(container)
        .setName("命令")
        .setDesc("搜索命令名称，或直接粘贴 command id。")
        .addText((text) => {
          text
            .setPlaceholder("搜索命令或输入 command id")
            .setValue(getCommandInputDisplayValue(commands, action.commandId))
            .onChange((value) => {
              action.commandId = this.resolveCommandInputValue(value);
            });

          new CommandInputSuggest(this.app, text.inputEl, commands, (command) => {
            action.commandId = command.id;
            text.setValue(command.name);
          });
        });
      return;
    }

    if (action.type === "file") {
      let fileInput: TextComponent | null = null;
      new Setting(container)
        .setName("文件路径")
        .setDesc("搜索文件名，或直接输入 vault 内文件路径。")
        .addText((text) => {
          fileInput = text;
          text
            .setPlaceholder("搜索文件或输入文件路径")
            .setValue(action.filePath ?? "")
            .onChange((value) => {
              action.filePath = value.trim();
            });

          new FilePathInputSuggest(this.app, text.inputEl, () => this.getFiles(), (file) => {
            action.filePath = file.path;
            text.setValue(file.path);
          });
        })
        .addButton((button) =>
          button
            .setButtonText("使用当前文件")
            .onClick(() => {
              const activePath = this.getActiveFilePath();
              if (!activePath) {
                new Notice("当前没有打开的 Markdown 文件");
                return;
              }
              action.filePath = activePath;
              fileInput?.setValue(activePath);
            })
        );
      return;
    }

    if (action.type === "uri") {
      new Setting(container)
        .setName("URI")
        .setDesc("输入要打开的链接。")
        .addText((text) =>
          text
            .setPlaceholder("输入 URI")
            .setValue(action.uri ?? "")
            .onChange((value) => {
              action.uri = value;
            })
        );
      return;
    }

    new Setting(container)
      .setName("脚本")
      .setDesc("脚本动作预留字段，当前版本不会执行。")
      .addTextArea((text) =>
        text
          .setPlaceholder("脚本预留，当前不会执行")
          .setValue(action.script ?? "")
          .onChange((value) => {
            action.script = value;
          })
      );
  }

  private getActiveFilePath(): string | null {
    return this.app.workspace.getActiveFile()?.path ?? null;
  }

  private renderDirectionEditorActions(
    container: HTMLElement,
    direction: FloatingGestureDirection,
    draft: FloatingDirectionAction
  ): void {
    const actions = container.createDiv({ cls: "obsidian-quicker-direction-editor-actions" });
    const saveButton = actions.createEl("button", {
      cls: "mod-cta obsidian-quicker-save-action-button",
      text: "保存方向动作"
    });
    saveButton.addEventListener("click", () => {
      void this.saveDirectionAction(direction, draft);
    });
  }

  private getDirectionDraft(direction: FloatingGestureDirection): FloatingDirectionAction {
    const draft = this.directionDrafts[direction];
    if (draft) {
      return draft;
    }

    const source = this.plugin.settings.floatingButton.directionActions[direction];
    const nextDraft = cloneDirectionAction(source);
    this.directionDrafts[direction] = nextDraft;
    return nextDraft;
  }

  private async saveDirectionAction(
    direction: FloatingGestureDirection,
    draft: FloatingDirectionAction
  ): Promise<void> {
    this.plugin.settings.floatingButton.directionActions[direction] = sanitizeDirectionAction(draft);
    this.directionDrafts[direction] = cloneDirectionAction(
      this.plugin.settings.floatingButton.directionActions[direction]
    );
    await this.plugin.saveSettingsAndRefresh();
    new Notice(`${FLOATING_DIRECTION_LABELS[direction]}滑动作已保存`);
    this.rerenderPreservingScroll();
  }

  private getDirectionActionSummary(action: FloatingDirectionAction): string {
    if (!action.enabled) {
      return "已禁用";
    }

    if (action.type === "wheelAction") {
      const wheelAction = this.plugin.settings.actions.find((candidate) => candidate.id === action.actionId);
      return wheelAction ? `${wheelAction.icon} ${wheelAction.label}` : "选择轮盘动作";
    }

    if (action.type === "command") {
      return getCommandInputDisplayValue(this.getCommands(), action.commandId) || "未设置命令";
    }

    if (action.type === "file") {
      return action.filePath || "未设置文件";
    }

    if (action.type === "uri") {
      return action.uri || "未设置 URI";
    }

    return action.script ? "脚本" : "未设置脚本";
  }

  private isDirectionActionConfigured(action: FloatingDirectionAction): boolean {
    if (!action.enabled) {
      return false;
    }

    if (action.type === "wheelAction") {
      return Boolean(action.actionId);
    }

    if (action.type === "command") {
      return Boolean(action.commandId);
    }

    if (action.type === "file") {
      return Boolean(action.filePath);
    }

    if (action.type === "uri") {
      return Boolean(action.uri);
    }

    return Boolean(action.script);
  }

  private getDirectionArrowGlyph(direction: FloatingGestureDirection): string {
    const arrows: Record<FloatingGestureDirection, string> = {
      up: "↑",
      "up-right": "↗",
      right: "→",
      "down-right": "↘",
      down: "↓",
      "down-left": "↙",
      left: "←",
      "up-left": "↖"
    };

    return arrows[direction];
  }

  private get selectedAction(): WheelAction | undefined {
    if (!this.selectedActionId) {
      return undefined;
    }

    return this.plugin.settings.actions.find((action) => action.id === this.selectedActionId);
  }
}

function cloneDirectionAction(action: FloatingDirectionAction): FloatingDirectionAction {
  return {
    type: action.type,
    actionId: action.actionId ?? "",
    commandId: action.commandId ?? "",
    filePath: action.filePath ?? "",
    uri: action.uri ?? "",
    script: action.script ?? "",
    enabled: action.enabled
  };
}

function sanitizeDirectionAction(action: FloatingDirectionAction): FloatingDirectionAction {
  const base = cloneDirectionAction(action);

  if (base.type === "wheelAction") {
    return {
      type: "wheelAction",
      actionId: base.actionId?.trim() ?? "",
      commandId: "",
      filePath: "",
      uri: "",
      script: "",
      enabled: base.enabled
    };
  }

  if (base.type === "command") {
    return {
      type: "command",
      actionId: "",
      commandId: base.commandId?.trim() ?? "",
      filePath: "",
      uri: "",
      script: "",
      enabled: base.enabled
    };
  }

  if (base.type === "file") {
    return {
      type: "file",
      actionId: "",
      commandId: "",
      filePath: base.filePath?.trim() ?? "",
      uri: "",
      script: "",
      enabled: base.enabled
    };
  }

  if (base.type === "uri") {
    return {
      type: "uri",
      actionId: "",
      commandId: "",
      filePath: "",
      uri: base.uri?.trim() ?? "",
      script: "",
      enabled: base.enabled
    };
  }

  return {
    type: "script",
    actionId: "",
    commandId: "",
    filePath: "",
    uri: "",
    script: base.script ?? "",
    enabled: base.enabled
  };
}

class CommandInputSuggest extends AbstractInputSuggest<ObsidianCommand> {
  constructor(
    app: App,
    inputEl: HTMLInputElement,
    private readonly commands: ObsidianCommand[],
    private readonly onChooseCommand: (command: ObsidianCommand) => void | Promise<void>
  ) {
    super(app, inputEl);
    this.limit = 50;
  }

  protected getSuggestions(query: string): ObsidianCommand[] {
    return filterObsidianCommands(this.commands, query, this.limit);
  }

  renderSuggestion(command: ObsidianCommand, el: HTMLElement): void {
    el.addClass("obsidian-quicker-command-suggestion");
    el.createDiv({ cls: "obsidian-quicker-command-suggestion-name", text: command.name });
    el.createDiv({ cls: "obsidian-quicker-command-suggestion-id", text: command.id });
  }

  selectSuggestion(command: ObsidianCommand): void {
    void this.onChooseCommand(command);
    this.close();
  }
}

class FilePathInputSuggest extends AbstractInputSuggest<ObsidianFileItem> {
  constructor(
    app: App,
    inputEl: HTMLInputElement,
    private readonly getFiles: () => ObsidianFileItem[],
    private readonly onChooseFile: (file: ObsidianFileItem) => void
  ) {
    super(app, inputEl);
    this.limit = 30;
  }

  protected getSuggestions(query: string): ObsidianFileItem[] {
    return filterObsidianFiles(this.getFiles(), query, this.limit);
  }

  renderSuggestion(file: ObsidianFileItem, el: HTMLElement): void {
    el.addClass("obsidian-quicker-command-suggestion");
    el.createDiv({ cls: "obsidian-quicker-command-suggestion-name", text: file.name });
    el.createDiv({ cls: "obsidian-quicker-command-suggestion-id", text: file.path });
  }

  selectSuggestion(file: ObsidianFileItem): void {
    this.onChooseFile(file);
    this.close();
  }
}
