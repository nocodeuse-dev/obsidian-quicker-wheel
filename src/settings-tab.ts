import {
  AbstractInputSuggest,
  ColorComponent,
  DropdownComponent,
  Notice,
  PluginSettingTab,
  SliderComponent,
  Setting,
  TextAreaComponent,
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
  filterObsidianFiles,
  listObsidianMarkdownFiles
} from "./obsidian-files";
import type { ObsidianFileItem } from "./obsidian-files";
import {
  FLOATING_DIRECTION_LABELS,
  FLOATING_DIRECTIONS
} from "./floating-gesture";
import type { ObsidianCommand } from "./obsidian-commands";
import { createBlankAction } from "./settings";
import { renderWheelPreview } from "./wheel-modal";
import type { WheelAction } from "./types";
import type { FloatingDirectionAction, FloatingGestureDirection } from "./types";

type SettingsView = "menu" | "actions" | "floating" | "floatingActions" | "other";

export class ObsidianQuickerSettingTab extends PluginSettingTab {
  private activeView: SettingsView = "menu";
  private selectedActionId: string | null = null;
  private selectedDirection: FloatingGestureDirection = "up";
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

    if (this.activeView === "menu") {
      this.renderMenuSettings();
      return;
    }

    if (this.activeView === "actions") {
      this.renderActionManager();
      return;
    }

    if (this.activeView === "floating") {
      this.renderFloatingSettings();
      return;
    }

    if (this.activeView === "floatingActions") {
      this.renderFloatingActionSettings();
      return;
    }

    this.renderOtherSettings();
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

  private renderMenuSettings(): void {
    const section = this.containerEl.createDiv({ cls: "obsidian-quicker-settings-section" });
    section.createEl("h2", { text: "基础设置" });

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

  }

  private renderFloatingSettings(): void {
    const section = this.containerEl.createDiv({ cls: "obsidian-quicker-settings-section obsidian-quicker-floating-settings" });
    section.createEl("h2", { text: "悬浮窗设置" });

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

    section.createEl("h3", { text: "触发时间" });
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

    section.createEl("h3", { text: "颜色与透明度设置" });
    const colorGrid = section.createDiv({ cls: "obsidian-quicker-color-grid" });
    this.renderFloatingColorCard(colorGrid, "default", "默认", "空闲");
    this.renderFloatingColorCard(colorGrid, "tap", "短按", "打开轮盘");
    this.renderFloatingColorCard(colorGrid, "swipe", "方向滑动", "8 方向");
    this.renderFloatingColorCard(colorGrid, "move", "长按移动", "拖动位置");
  }

  private renderFloatingActionSettings(): void {
    const section = this.containerEl.createDiv({ cls: "obsidian-quicker-settings-section obsidian-quicker-floating-action-settings" });
    section.createEl("h2", { text: "悬浮窗动作管理" });
    const commands = listObsidianCommands(this.app);
    const files = listObsidianMarkdownFiles(this.app);
    this.renderFloatingDirectionPanel(section, commands, files);
  }

  private renderOtherSettings(): void {
    const section = this.containerEl.createDiv({ cls: "obsidian-quicker-settings-section obsidian-quicker-other-settings" });
    const support = section.createDiv({ cls: "obsidian-quicker-support-card" });
    const text = support.createDiv({ cls: "obsidian-quicker-support-copy" });
    text.createEl("h2", { text: "反馈、帮助、支持插件" });
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
      this.renderActionManager();
    });

    const list = sidebar.createDiv({ cls: "obsidian-quicker-action-list" });
    for (const action of this.filteredActions()) {
      const item = list.createDiv({ cls: "obsidian-quicker-action-item" });
      item.toggleClass("is-selected", action.id === this.selectedActionId);
      item.createDiv({ cls: "obsidian-quicker-action-item-icon", text: action.icon });
      const body = item.createDiv({ cls: "obsidian-quicker-action-item-body" });
      body.createDiv({ cls: "obsidian-quicker-action-item-label", text: action.label });
      body.createDiv({
        cls: "obsidian-quicker-action-item-meta",
        text: action.commandId || action.filePath || action.type
      });
      item.addEventListener("click", () => {
        this.selectedActionId = action.id;
        this.display();
      });
    }

    const buttons = sidebar.createDiv({ cls: "obsidian-quicker-action-buttons" });
    this.addSmallButton(buttons, "+", "新增动作", () => this.addAction());
    this.addSmallButton(buttons, "✎", "编辑动作", () => this.focusSelectedAction());
    this.addSmallButton(buttons, "🗑", "删除动作", () => this.deleteSelectedAction());
    this.addSmallButton(buttons, "↑", "上移", () => this.moveSelectedAction(-1));

    preview.createEl("h2", { text: "轮盘预览" });
    const wheelHost = preview.createDiv({ cls: "obsidian-quicker-settings-preview-wheel" });
    renderWheelPreview(wheelHost, this.plugin.settings, {
      interactive: false,
      selectedActionId: this.selectedActionId ?? undefined,
      onAction: (action) => {
        this.selectedActionId = getPreviewSelectedActionId(action);
        this.display();
        this.scrollActionEditorIntoView();
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
        this.display();
      }
    });

    this.renderActionEditor(preview);
  }

  private scrollActionEditorIntoView(): void {
    this.containerEl
      .querySelector(".obsidian-quicker-action-editor")
      ?.scrollIntoView({ block: "start", behavior: "smooth" });
  }

  private renderActionEditor(container: HTMLElement): void {
    const action = this.selectedAction;
    const editor = container.createDiv({ cls: "obsidian-quicker-action-editor" });
    editor.createEl("h3", { text: "动作编辑" });

    if (!action) {
      editor.createDiv({ cls: "setting-item-description", text: "选择一个动作，或点击轮盘空格创建动作。" });
      return;
    }

    new Setting(editor)
      .setName("名称")
      .addText((text) =>
        text.setValue(action.label).onChange(async (value) => {
          action.label = value;
          await this.plugin.saveSettingsAndRefresh();
        })
      );

    new Setting(editor)
      .setName("图标")
      .setDesc("可以填写 emoji 或短文本。")
      .addText((text) =>
        text.setValue(action.icon).onChange(async (value) => {
          action.icon = value || "•";
          await this.plugin.saveSettingsAndRefresh();
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
          .onChange(async (value) => {
            action.type = value as WheelAction["type"];
            await this.plugin.saveSettingsAndRefresh();
            this.display();
          })
      );

    if (action.type === "command") {
      new Setting(editor)
        .setName("Obsidian 命令")
        .setDesc("搜索命令名称，或直接粘贴命令 ID。")
        .addText((text) => {
          text
            .setPlaceholder("搜索命令或输入 command id")
            .setValue(getCommandInputDisplayValue(listObsidianCommands(this.app), action.commandId))
            .onChange(async (value) => {
              action.commandId = this.resolveCommandInputValue(value);
              await this.plugin.saveSettingsAndRefresh();
            });

        new CommandInputSuggest(
          this.app,
          text.inputEl,
          listObsidianCommands(this.app),
          async (command) => {
            action.commandId = command.id;
            text.setValue(command.name);
            await this.plugin.saveSettingsAndRefresh();
          }
        );
        });
    } else if (action.type === "file") {
      new Setting(editor)
        .setName("打开文件")
        .setDesc("搜索笔记名称，或直接粘贴 vault 内文件路径。")
        .addText((text) => {
          text
            .setPlaceholder("搜索文件或输入文件路径")
            .setValue(action.filePath ?? "")
            .onChange(async (value) => {
              action.filePath = value.trim();
              await this.plugin.saveSettingsAndRefresh();
            });

          new FileInputSuggest(
            this.app,
            text.inputEl,
            listObsidianMarkdownFiles(this.app),
            async (file) => {
              action.filePath = file.path;
              text.setValue(file.path);
              await this.plugin.saveSettingsAndRefresh();
            }
          );
        });
    } else if (action.type === "uri") {
      new Setting(editor)
        .setName("URI")
        .setDesc("可先保存，执行能力将在后续版本继续增强。")
        .addText((text) =>
          text.setValue(action.uri ?? "").onChange(async (value) => {
            action.uri = value;
            await this.plugin.saveSettingsAndRefresh();
          })
        );
    } else {
      new Setting(editor)
        .setName("脚本")
        .setDesc("脚本动作预留字段，当前版本不会执行。")
        .addTextArea((text) =>
          text.setValue(action.script ?? "").onChange(async (value) => {
            action.script = value;
            await this.plugin.saveSettingsAndRefresh();
          })
        );
    }

    const actions = editor.createDiv({ cls: "obsidian-quicker-action-editor-actions" });
    const saveButton = actions.createEl("button", {
      cls: "mod-cta obsidian-quicker-save-action-button",
      text: "保存动作"
    });
    saveButton.addEventListener("click", async () => {
      await this.plugin.saveSettingsAndRefresh();
      new Notice(getActionSavedNotice(action.label));
      this.display();
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
    this.display();
  }

  private focusSelectedAction(): void {
    if (!this.selectedActionId && this.plugin.settings.actions[0]) {
      this.selectedActionId = this.plugin.settings.actions[0].id;
      this.display();
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
    this.display();
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
    this.display();
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
    const command = listObsidianCommands(this.app).find(
      (candidate) => candidate.name === trimmed || candidate.id === trimmed
    );

    return command?.id ?? trimmed;
  }

  private renderFloatingDirectionPanel(
    container: HTMLElement,
    commands: ObsidianCommand[],
    files: ObsidianFileItem[]
  ): void {
    const panel = container.createDiv({ cls: "obsidian-quicker-direction-panel" });
    const map = panel.createDiv({ cls: "obsidian-quicker-direction-map" });
    map.createDiv({ cls: "obsidian-quicker-direction-center", text: "⌁" });

    for (const direction of FLOATING_DIRECTIONS) {
      this.renderFloatingDirectionButton(map, direction);
    }

    this.renderSelectedFloatingDirectionEditor(panel, commands, files);
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
      this.display();
    });
  }

  private renderSelectedFloatingDirectionEditor(
    container: HTMLElement,
    commands: ObsidianCommand[],
    files: ObsidianFileItem[]
  ): void {
    const direction = this.selectedDirection;
    const action = this.plugin.settings.floatingButton.directionActions[direction];
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
        toggle.setValue(action.enabled).onChange(async (value) => {
          action.enabled = value;
          await this.plugin.saveSettingsAndRefresh();
          this.display();
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
          .onChange(async (value) => {
            action.type = value as FloatingDirectionAction["type"];
            await this.plugin.saveSettingsAndRefresh();
            this.display();
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
          dropdown.setValue(action.actionId ?? "").onChange(async (value) => {
            action.actionId = value;
            await this.plugin.saveSettingsAndRefresh();
            this.display();
          });
        });
      return;
    }

    this.renderInlineDirectionActionFields(body, action, commands, files);
  }

  private renderInlineDirectionActionFields(
    container: HTMLElement,
    action: FloatingDirectionAction,
    commands: ObsidianCommand[],
    files: ObsidianFileItem[]
  ): void {
    if (action.type === "command") {
      const text = new TextComponent(container)
        .setPlaceholder("搜索命令或输入 command id")
        .setValue(getCommandInputDisplayValue(commands, action.commandId))
        .onChange(async (value) => {
          action.commandId = this.resolveCommandInputValue(value);
          await this.plugin.saveSettingsAndRefresh();
        });

      new CommandInputSuggest(this.app, text.inputEl, commands, async (command) => {
        action.commandId = command.id;
        text.setValue(command.name);
        await this.plugin.saveSettingsAndRefresh();
        this.display();
      });
      return;
    }

    if (action.type === "file") {
      const text = new TextComponent(container)
        .setPlaceholder("搜索文件或输入文件路径")
        .setValue(action.filePath ?? "")
        .onChange(async (value) => {
          action.filePath = value.trim();
          await this.plugin.saveSettingsAndRefresh();
        });

      new FileInputSuggest(this.app, text.inputEl, files, async (file) => {
        action.filePath = file.path;
        text.setValue(file.path);
        await this.plugin.saveSettingsAndRefresh();
        this.display();
      });
      return;
    }

    if (action.type === "uri") {
      new TextComponent(container)
        .setPlaceholder("输入 URI")
        .setValue(action.uri ?? "")
        .onChange(async (value) => {
          action.uri = value;
          await this.plugin.saveSettingsAndRefresh();
        });
      return;
    }

    new TextAreaComponent(container)
      .setPlaceholder("脚本预留，当前不会执行")
      .setValue(action.script ?? "")
      .onChange(async (value) => {
        action.script = value;
        await this.plugin.saveSettingsAndRefresh();
      });
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
      return getCommandInputDisplayValue(listObsidianCommands(this.app), action.commandId) || "未设置命令";
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

class FileInputSuggest extends AbstractInputSuggest<ObsidianFileItem> {
  constructor(
    app: App,
    inputEl: HTMLInputElement,
    private readonly files: ObsidianFileItem[],
    private readonly onChooseFile: (file: ObsidianFileItem) => Promise<void>
  ) {
    super(app, inputEl);
    this.limit = 50;
  }

  protected getSuggestions(query: string): ObsidianFileItem[] {
    return filterObsidianFiles(this.files, query);
  }

  renderSuggestion(file: ObsidianFileItem, el: HTMLElement): void {
    el.addClass("obsidian-quicker-command-suggestion");
    el.createDiv({ cls: "obsidian-quicker-command-suggestion-name", text: file.name });
    el.createDiv({ cls: "obsidian-quicker-command-suggestion-id", text: file.path });
  }

  selectSuggestion(file: ObsidianFileItem): void {
    void this.onChooseFile(file);
    this.close();
  }
}

class CommandInputSuggest extends AbstractInputSuggest<ObsidianCommand> {
  constructor(
    app: App,
    inputEl: HTMLInputElement,
    private readonly commands: ObsidianCommand[],
    private readonly onChooseCommand: (command: ObsidianCommand) => Promise<void>
  ) {
    super(app, inputEl);
    this.limit = 50;
  }

  protected getSuggestions(query: string): ObsidianCommand[] {
    return filterObsidianCommands(this.commands, query);
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
