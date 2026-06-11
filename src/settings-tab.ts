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
  FLOATING_DIRECTIONS,
  getFloatingDirectionLabel
} from "./floating-gesture";
import { DEFAULT_CENTER_ICON, renderConfiguredIcon } from "./icons";
import type { ObsidianCommand } from "./obsidian-commands";
import { filterObsidianFiles } from "./obsidian-files";
import type { ObsidianFileItem } from "./obsidian-files";
import { createBlankAction, resetCenterAction } from "./settings";
import { renderWheelPreview } from "./wheel-modal";
import type { WheelAction } from "./types";
import type { FloatingDirectionAction, FloatingGestureDirection } from "./types";
import { tr } from "./i18n";

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
    this.createTab(tabs, "menu", tr("轮盘菜单设置", "Wheel settings"));
    this.createTab(tabs, "actions", tr("轮盘动作管理", "Wheel actions"));
    this.createTab(tabs, "floating", tr("悬浮窗设置", "Floating button"));
    this.createTab(tabs, "floatingActions", tr("悬浮窗动作管理", "Floating actions"));
    this.createTab(tabs, "other", tr("其他", "Other"));

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
    new Notice(
      tr(
        "Quicker Wheel 设置页渲染失败，已进入安全模式",
        "Quicker Wheel settings failed to render and entered safe mode"
      )
    );

    const section = this.containerEl.createDiv({ cls: "obsidian-quicker-settings-section" });
    this.addHeading(section, tr("设置页安全模式", "Settings safe mode"));
    section.createDiv({
      cls: "setting-item-description",
      text: tr(
        "当前页面渲染时出现错误。你可以切换到基础设置，或重新打开插件设置。",
        "This page encountered an error. Return to basic settings or reopen the plugin settings."
      )
    });

    new Setting(section)
      .setName(tr("返回基础设置", "Return to basic settings"))
      .setDesc(error instanceof Error ? error.message : String(error))
      .addButton((button) =>
        button
          .setButtonText(tr("打开", "Open"))
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
    this.addHeading(section, tr("基础设置", "Basic settings"));

    this.addNumberSetting(section, tr("轮盘圈数", "Wheel rings"), tr("1 到 3 圈。", "1 to 3 rings."), 1, 3, this.plugin.settings.wheel.ringCount, async (value) => {
      this.plugin.settings.wheel.ringCount = value;
      await this.plugin.saveSettingsAndRefresh();
    });
    this.addNumberSetting(section, tr("每圈格数", "Slots per ring"), tr("每圈 4 到 16 格。", "4 to 16 slots per ring."), 4, 16, this.plugin.settings.wheel.slotsPerRing, async (value) => {
      this.plugin.settings.wheel.slotsPerRing = value;
      await this.plugin.saveSettingsAndRefresh();
    });
    this.addNumberSetting(section, tr("轮盘尺寸", "Wheel size"), tr("移动端建议 320 到 480。", "320 to 480 is recommended on mobile."), 240, 720, this.plugin.settings.wheel.size, async (value) => {
      this.plugin.settings.wheel.size = value;
      await this.plugin.saveSettingsAndRefresh();
    });
    this.addNumberSetting(section, tr("文字大小", "Text size"), tr("轮盘标签字号。", "Wheel label font size."), 8, 24, this.plugin.settings.wheel.textSize, async (value) => {
      this.plugin.settings.wheel.textSize = value;
      await this.plugin.saveSettingsAndRefresh();
    });
    this.addNumberSetting(section, tr("超时取消", "Auto-close timeout"), tr("轮盘自动关闭时间，单位毫秒。", "Time before the wheel closes automatically, in milliseconds."), 1000, 60000, this.plugin.settings.wheel.timeoutMs, async (value) => {
      this.plugin.settings.wheel.timeoutMs = value;
      await this.plugin.saveSettingsAndRefresh();
    });
    this.addNumberSetting(section, tr("轮盘透明度", "Wheel opacity"), tr("轮盘整体透明度，20 到 100。", "Overall wheel opacity, from 20 to 100."), 20, 100, this.plugin.settings.wheel.opacity, async (value) => {
      this.plugin.settings.wheel.opacity = value;
      await this.plugin.saveSettingsAndRefresh();
    });

    this.addHeading(section, tr("轮盘外观", "Wheel appearance"));
    new Setting(section)
      .setName(tr("轮盘主题", "Wheel theme"))
      .setDesc(tr("只改变轻量 CSS 变量，不增加复杂动画。", "Uses lightweight CSS variables without complex animation."))
      .addDropdown((dropdown) =>
        dropdown
          .addOption("soft", tr("柔和", "Soft"))
          .addOption("classic", tr("经典", "Classic"))
          .addOption("glass", tr("玻璃", "Glass"))
          .setValue(this.plugin.settings.wheel.appearance.theme)
          .onChange(async (value) => {
            this.plugin.settings.wheel.appearance.theme = value as typeof this.plugin.settings.wheel.appearance.theme;
            await this.plugin.saveSettingsAndRefresh();
          })
      );
    this.addColorSetting(section, tr("普通扇区颜色", "Segment color"), tr("轮盘基础扇区背景色。", "Base wheel segment background."), this.plugin.settings.wheel.appearance.segmentColor, async (value) => {
      this.plugin.settings.wheel.appearance.segmentColor = value;
      await this.plugin.saveSettingsAndRefresh();
    });
    this.addColorSetting(section, tr("动作扇区颜色", "Action segment color"), tr("已经绑定动作的扇区背景色。", "Background for segments with assigned actions."), this.plugin.settings.wheel.appearance.actionSegmentColor, async (value) => {
      this.plugin.settings.wheel.appearance.actionSegmentColor = value;
      await this.plugin.saveSettingsAndRefresh();
    });
    this.addColorSetting(section, tr("空位扇区颜色", "Empty segment color"), tr("没有动作的扇区背景色。", "Background for empty segments."), this.plugin.settings.wheel.appearance.emptySegmentColor, async (value) => {
      this.plugin.settings.wheel.appearance.emptySegmentColor = value;
      await this.plugin.saveSettingsAndRefresh();
    });
    this.addColorSetting(section, tr("文字与图标颜色", "Text and icon color"), tr("轮盘动作名称和图标的颜色。", "Color for wheel action labels and icons."), this.plugin.settings.wheel.appearance.textColor, async (value) => {
      this.plugin.settings.wheel.appearance.textColor = value;
      await this.plugin.saveSettingsAndRefresh();
    });
    this.addColorSetting(section, tr("选中边框颜色", "Selection border color"), tr("设置动作时，当前扇区的边框颜色。", "Border color for the selected segment while editing."), this.plugin.settings.wheel.appearance.selectedBorderColor, async (value) => {
      this.plugin.settings.wheel.appearance.selectedBorderColor = value;
      await this.plugin.saveSettingsAndRefresh();
    });
    this.addColorSetting(section, tr("分割线颜色", "Divider color"), tr("轮盘扇区之间的线条颜色。", "Color of lines between wheel segments."), this.plugin.settings.wheel.appearance.dividerColor, async (value) => {
      this.plugin.settings.wheel.appearance.dividerColor = value;
      await this.plugin.saveSettingsAndRefresh();
    });
    this.addNumberSetting(section, tr("分割线粗细", "Divider width"), tr("建议 1 到 2，过粗会显得拥挤。", "1 to 2 is recommended."), 1, 4, this.plugin.settings.wheel.appearance.dividerWidth, async (value) => {
      this.plugin.settings.wheel.appearance.dividerWidth = value;
      await this.plugin.saveSettingsAndRefresh();
    });
    this.addColorSetting(section, tr("中心按钮颜色", "Center button color"), tr("轮盘中心按钮背景色。", "Wheel center button background."), this.plugin.settings.wheel.appearance.centerColor, async (value) => {
      this.plugin.settings.wheel.appearance.centerColor = value;
      await this.plugin.saveSettingsAndRefresh();
    });
    this.addColorSetting(section, tr("中心图标颜色", "Center icon color"), tr("轮盘中心图标颜色。", "Wheel center icon color."), this.plugin.settings.wheel.appearance.centerIconColor, async (value) => {
      this.plugin.settings.wheel.appearance.centerIconColor = value;
      await this.plugin.saveSettingsAndRefresh();
    });
    this.addNumberSetting(section, tr("中心按钮大小", "Center button size"), tr("中心按钮占轮盘直径百分比，10 到 24。", "Percentage of wheel diameter, from 10 to 24."), 10, 24, this.plugin.settings.wheel.appearance.centerSize, async (value) => {
      this.plugin.settings.wheel.appearance.centerSize = value;
      await this.plugin.saveSettingsAndRefresh();
    });
    new Setting(section)
      .setName(tr("轮盘阴影", "Wheel shadow"))
      .setDesc(tr("轻量阴影，不影响交互速度。", "Lightweight shadow without affecting interaction speed."))
      .addDropdown((dropdown) =>
        dropdown
          .addOption("soft", tr("轻微", "Soft"))
          .addOption("none", tr("无", "None"))
          .addOption("strong", tr("明显", "Strong"))
          .setValue(this.plugin.settings.wheel.appearance.shadow)
          .onChange(async (value) => {
            this.plugin.settings.wheel.appearance.shadow = value as typeof this.plugin.settings.wheel.appearance.shadow;
            await this.plugin.saveSettingsAndRefresh();
          })
      );
  }

  private renderFloatingSettings(): void {
    const section = this.containerEl.createDiv({ cls: "obsidian-quicker-settings-section obsidian-quicker-floating-settings" });
    this.addHeading(section, tr("悬浮窗设置", "Floating button settings"));

    new Setting(section)
      .setName(tr("移动端悬浮按钮", "Mobile floating button"))
      .setDesc(tr("短按打开轮盘，快速朝方向滑动执行命令，长按后拖动可移动位置。", "Tap to open the wheel, swipe in a direction to run an action, or long-press and drag to move."))
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.floatingButton.mobileEnabled).onChange(async (value) => {
          this.plugin.settings.floatingButton.mobileEnabled = value;
          await this.plugin.saveSettingsAndRefresh();
        })
      );

    new Setting(section)
      .setName(tr("桌面端悬浮按钮", "Desktop floating button"))
      .setDesc(tr("开启后桌面端显示悬浮按钮；左侧 Ribbon 开关按钮已关闭。", "Show the floating button on desktop. The Ribbon toggle is disabled."))
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.floatingButton.desktopEnabled).onChange(async (value) => {
          this.plugin.settings.floatingButton.desktopEnabled = value;
          await this.plugin.saveSettingsAndRefresh();
        })
      );

    this.addHeading(section, tr("触发时间", "Gesture timing"));
    this.addNumberSetting(section, tr("短按最大时间", "Maximum tap time"), tr("短按不移动时打开轮盘，单位毫秒。", "Maximum stationary tap duration, in milliseconds."), 80, 1200, this.plugin.settings.floatingButton.gesture.tapMaxMs, async (value) => {
      this.plugin.settings.floatingButton.gesture.tapMaxMs = value;
      await this.plugin.saveSettingsAndRefresh();
    });
    this.addNumberSetting(section, tr("方向滑动最大时间", "Maximum swipe time"), tr("在这个时间内滑够距离，会触发方向命令。", "A swipe that reaches the distance within this time triggers a direction action."), 120, 2000, this.plugin.settings.floatingButton.gesture.swipeMaxMs, async (value) => {
      this.plugin.settings.floatingButton.gesture.swipeMaxMs = value;
      await this.plugin.saveSettingsAndRefresh();
    });
    this.addNumberSetting(section, tr("长按移动触发时间", "Long-press move delay"), tr("按住超过这个时间后拖动，才会移动悬浮按钮位置。", "Hold for this duration before dragging moves the button."), 250, 3000, this.plugin.settings.floatingButton.gesture.longPressMoveMs, async (value) => {
      this.plugin.settings.floatingButton.gesture.longPressMoveMs = value;
      await this.plugin.saveSettingsAndRefresh();
    });
    this.addNumberSetting(section, tr("方向滑动距离", "Swipe distance"), tr("快速滑动至少达到这个距离才触发方向命令，单位像素。", "Minimum distance for a direction swipe, in pixels."), 12, 180, this.plugin.settings.floatingButton.gesture.swipeDistance, async (value) => {
      this.plugin.settings.floatingButton.gesture.swipeDistance = value;
      await this.plugin.saveSettingsAndRefresh();
    });
    this.addNumberSetting(section, tr("移动起始距离", "Drag start distance"), tr("长按后拖动超过这个距离才开始移动按钮，单位像素。", "Distance required to start moving after a long press, in pixels."), 1, 80, this.plugin.settings.floatingButton.gesture.dragStartDistance, async (value) => {
      this.plugin.settings.floatingButton.gesture.dragStartDistance = value;
      await this.plugin.saveSettingsAndRefresh();
    });

    this.addHeading(section, tr("贴边隐藏", "Edge hiding"));
    new Setting(section)
      .setName(tr("启用贴边隐藏", "Enable edge hiding"))
      .setDesc(tr("悬浮球会吸附到左侧或右侧，闲置后缩进屏幕边缘。默认关闭。", "Snap to the left or right edge and partially hide after being idle. Disabled by default."))
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.floatingButton.edgeHide.enabled)
          .onChange(async (value) => {
            this.plugin.settings.floatingButton.edgeHide.enabled = value;
            await this.plugin.saveSettingsAndRefresh();
          })
      );
    this.addNumberSetting(
      section,
      tr("闲置隐藏时间", "Idle hide delay"),
      tr("停止操作多久后贴边隐藏，单位毫秒。", "Idle time before hiding at the edge, in milliseconds."),
      500,
      10000,
      this.plugin.settings.floatingButton.edgeHide.delayMs,
      async (value) => {
        this.plugin.settings.floatingButton.edgeHide.delayMs = value;
        await this.plugin.saveSettingsAndRefresh();
      }
    );
    this.addNumberSetting(
      section,
      tr("边缘露出宽度", "Visible edge width"),
      tr("隐藏后仍留在屏幕内的宽度，单位像素。", "Width left visible on screen, in pixels."),
      8,
      32,
      this.plugin.settings.floatingButton.edgeHide.visibleSize,
      async (value) => {
        this.plugin.settings.floatingButton.edgeHide.visibleSize = value;
        await this.plugin.saveSettingsAndRefresh();
      }
    );
    new Setting(section)
      .setName(tr("点击隐藏悬浮球", "Tap hidden button"))
      .setDesc(tr("选择一次点击直接打开轮盘，或只恢复完整悬浮球。", "Choose whether one tap opens the wheel or only reveals the full button."))
      .addDropdown((dropdown) =>
        dropdown
          .addOption("open", tr("恢复并打开轮盘", "Reveal and open wheel"))
          .addOption("reveal", tr("只恢复悬浮球", "Reveal button only"))
          .setValue(this.plugin.settings.floatingButton.edgeHide.tapBehavior)
          .onChange(async (value) => {
            this.plugin.settings.floatingButton.edgeHide.tapBehavior =
              value === "reveal" ? "reveal" : "open";
            await this.plugin.saveSettingsAndRefresh();
          })
      );

    this.addHeading(section, tr("颜色与透明度设置", "Colors and opacity"));
    this.addColorSetting(
      section,
      tr("悬浮窗字体颜色", "Floating icon color"),
      tr("控制中心图标和方向箭头颜色。", "Controls the center icon and direction arrow color."),
      this.plugin.settings.floatingButton.textColor,
      async (value) => {
        this.plugin.settings.floatingButton.textColor = value;
        await this.plugin.saveSettingsAndRefresh();
      }
    );
    const colorGrid = section.createDiv({ cls: "obsidian-quicker-color-grid" });
    this.renderFloatingColorCard(colorGrid, "default", tr("默认", "Default"), tr("空闲", "Idle"));
    this.renderFloatingColorCard(colorGrid, "tap", tr("短按", "Tap"), tr("打开轮盘", "Open wheel"));
    this.renderFloatingColorCard(colorGrid, "swipe", tr("方向滑动", "Direction swipe"), tr("8 方向", "8 directions"));
    this.renderFloatingColorCard(colorGrid, "move", tr("长按移动", "Long-press move"), tr("拖动位置", "Move position"));
  }

  private renderFloatingActionSettings(): void {
    const section = this.containerEl.createDiv({ cls: "obsidian-quicker-settings-section obsidian-quicker-floating-action-settings" });
    this.addHeading(section, tr("悬浮窗动作管理", "Floating action management"));
    this.renderFloatingDirectionPanel(section, this.getCommands());
  }

  private renderOtherSettings(): void {
    const section = this.containerEl.createDiv({ cls: "obsidian-quicker-settings-section obsidian-quicker-other-settings" });

    this.addHeading(section, tr("语言", "Language"));
    new Setting(section)
      .setName(tr("界面语言", "Interface language"))
      .setDesc(tr("默认跟随 Obsidian，也可以手动选择中文或英文。", "Follow Obsidian by default, or choose Chinese or English manually."))
      .addDropdown((dropdown) =>
        dropdown
          .addOption("auto", tr("跟随 Obsidian", "Follow Obsidian"))
          .addOption("zh", "中文")
          .addOption("en", "English")
          .setValue(this.plugin.settings.language)
          .onChange(async (value) => {
            const language = value === "zh" || value === "en" ? value : "auto";
            await this.plugin.setLanguagePreference(language);
          })
      );

    const support = section.createDiv({ cls: "obsidian-quicker-support-card" });
    const text = support.createDiv({ cls: "obsidian-quicker-support-copy" });
    this.addHeading(text, tr("反馈、帮助、支持插件", "Feedback, help, and support"));
    text.createDiv({
      cls: "setting-item-description",
      text: tr(
        "查看使用帮助、提交反馈，或支持 Quicker Wheel 的持续开发。",
        "Read the guide, send feedback, or support continued Quicker Wheel development."
      )
    });

    const button = support.createEl("button", {
      cls: "mod-cta obsidian-quicker-support-button",
      text: tr("打开页面", "Open page")
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
      attr: { type: "search", placeholder: tr("筛选...", "Filter...") }
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
        text: action.placement === "center"
          ? `${tr("中心", "Center")} · ${action.commandId || action.filePath || action.type}`
          : action.commandId || action.filePath || action.type
      });
      item.addEventListener("click", () => {
        this.selectedActionId = action.id;
        this.rerenderPreservingScroll();
      });
    }

    const buttons = sidebar.createDiv({ cls: "obsidian-quicker-action-buttons" });
    this.addSmallButton(buttons, "+", tr("新增动作", "Add action"), () => this.addAction());
    this.addSmallButton(buttons, "✎", tr("编辑动作", "Edit action"), () => this.focusSelectedAction());
    this.addSmallButton(buttons, "🗑", tr("删除动作", "Delete action"), () => this.deleteSelectedAction());
    this.addSmallButton(buttons, "↑", tr("上移", "Move up"), () => this.moveSelectedAction(-1));

    this.addHeading(preview, tr("轮盘预览", "Wheel preview"));
    const wheelHost = preview.createDiv({ cls: "obsidian-quicker-settings-preview-wheel" });
    renderWheelPreview(wheelHost, this.plugin.settings, {
      interactive: false,
      selectedActionId: this.selectedActionId ?? undefined,
      onAction: (action) => {
        this.selectedActionId = getPreviewSelectedActionId(action);
        this.rerenderPreservingScroll();
      },
      onCenterAction: (action) => {
        this.selectedActionId = getPreviewSelectedActionId(action);
        this.rerenderPreservingScroll();
      },
      onSlot: async (slot) => {
        const selected = this.selectedAction;
        if (!selected || selected.placement === "center") {
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
    this.addHeading(editor, tr("动作编辑", "Action editor"));

    if (!action) {
      editor.createDiv({
        cls: "setting-item-description",
        text: tr(
          "选择一个动作，或点击轮盘空格创建动作。",
          "Select an action, or click an empty wheel slot to create one."
        )
      });
      return;
    }

    new Setting(editor)
      .setName(tr("名称", "Name"))
      .addText((text) =>
        text.setValue(action.label).onChange((value) => {
          action.label = value;
        })
      );

    new Setting(editor)
      .setName(tr("图标", "Icon"))
      .setDesc(tr("填写 Obsidian 图标名称、SVG，或短文本。建议移动端优先使用图标名称。", "Enter an Obsidian icon name, SVG, or short text. Icon names are recommended on mobile."))
      .addText((text) =>
        text.setValue(action.icon).onChange((value) => {
          action.icon = value || "•";
        })
      );

    new Setting(editor)
      .setName(tr("启用", "Enabled"))
      .addToggle((toggle) =>
        toggle.setValue(action.enabled).onChange(async (value) => {
          action.enabled = value;
          await this.plugin.saveSettingsAndRefresh();
        })
      );

    new Setting(editor)
      .setName(tr("动作类型", "Action type"))
      .setDesc(tr("支持 Obsidian 命令和打开文件；URI 和脚本为后续扩展预留。", "Supports Obsidian commands and files. URI and script fields are reserved for expansion."))
      .addDropdown((dropdown) =>
        dropdown
          .addOption("command", tr("Obsidian 命令", "Obsidian command"))
          .addOption("file", tr("打开文件", "Open file"))
          .addOption("uri", tr("URI（预留）", "URI (reserved)"))
          .addOption("script", tr("脚本（预留）", "Script (reserved)"))
          .setValue(action.type)
          .onChange((value) => {
            action.type = value as WheelAction["type"];
            this.rerenderPreservingScroll();
          })
      );

    if (action.type === "command") {
      new Setting(editor)
        .setName(tr("Obsidian 命令", "Obsidian command"))
        .setDesc(tr("搜索命令名称，或直接粘贴命令 ID。", "Search by command name or paste a command ID."))
        .addText((text) => {
          text
            .setPlaceholder(tr("搜索命令或输入 command id", "Search commands or enter command ID"))
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
        .setName(tr("打开文件", "Open file"))
        .setDesc(tr("输入 vault 内文件路径，或使用当前打开文件。", "Enter a vault file path or use the currently open file."))
        .addText((text) => {
          fileInput = text;
          text
            .setPlaceholder(tr("搜索文件或输入文件路径", "Search files or enter a file path"))
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
            .setButtonText(tr("使用当前文件", "Use current file"))
            .onClick(() => {
              const activePath = this.getActiveFilePath();
              if (!activePath) {
                new Notice(tr("当前没有打开的 Markdown 文件", "No Markdown file is currently open"));
                return;
              }
              action.filePath = activePath;
              fileInput?.setValue(activePath);
            })
        );
    } else if (action.type === "uri") {
      new Setting(editor)
        .setName("URI")
        .setDesc(tr("可先保存，执行能力将在后续版本继续增强。", "You can save this now; execution support will be expanded later."))
        .addText((text) =>
          text.setValue(action.uri ?? "").onChange((value) => {
            action.uri = value;
          })
        );
    } else {
      new Setting(editor)
        .setName(tr("脚本", "Script"))
        .setDesc(tr("脚本动作预留字段，当前版本不会执行。", "Reserved script field; scripts are not executed in this version."))
        .addTextArea((text) =>
          text.setValue(action.script ?? "").onChange((value) => {
            action.script = value;
          })
        );
    }

    const actions = editor.createDiv({ cls: "obsidian-quicker-action-editor-actions" });
    const saveButton = actions.createEl("button", {
      cls: "mod-cta obsidian-quicker-save-action-button",
      text: tr("保存动作", "Save action")
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
      .setLimits(1, 100, 1)
      .setValue(opacity)
      .setDynamicTooltip();
    const text = new TextComponent(controls)
      .setValue(String(opacity))
      .onChange(async (raw) => {
        const next = Number.parseInt(raw, 10);
        if (Number.isNaN(next)) {
          return;
        }
        const clamped = Math.min(100, Math.max(1, next));
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

    const selected = this.selectedAction;
    if (selected?.placement === "center") {
      const restored = resetCenterAction(this.plugin.settings);
      this.selectedActionId = restored.id;
    } else {
      this.plugin.settings.actions = this.plugin.settings.actions.filter(
        (action) => action.id !== this.selectedActionId
      );
      this.selectedActionId = this.plugin.settings.actions[0]?.id ?? null;
    }
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
        "aria-label": tr(
          `${getFloatingDirectionLabel(direction)}滑动作`,
          `${getFloatingDirectionLabel(direction)} swipe action`
        ),
        title: tr(
          `${getFloatingDirectionLabel(direction)}滑`,
          `Swipe ${getFloatingDirectionLabel(direction).toLowerCase()}`
        )
      }
    });
    button.toggleClass("is-selected", direction === this.selectedDirection);
    button.toggleClass("is-configured", this.isDirectionActionConfigured(action));
    button.createDiv({ cls: "obsidian-quicker-direction-arrow-icon", text: this.getDirectionArrowGlyph(direction) });
    button.createDiv({
      cls: "obsidian-quicker-direction-arrow-label",
      text: getFloatingDirectionLabel(direction)
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
      text: tr(
        `${getFloatingDirectionLabel(direction)}滑动作`,
        `${getFloatingDirectionLabel(direction)} swipe action`
      )
    });
    header.createDiv({
      cls: "obsidian-quicker-direction-editor-summary",
      text: this.getDirectionActionSummary(action)
    });

    new Setting(card)
      .setName(tr("启用", "Enabled"))
      .addToggle((toggle) =>
        toggle.setValue(action.enabled).onChange((value) => {
          action.enabled = value;
        })
      );

    new Setting(card)
      .setName(tr("动作来源", "Action source"))
      .setDesc(tr("可以直接复用轮盘动作，也可以单独设置命令、文件、URI 或脚本。", "Reuse a wheel action or configure a command, file, URI, or script separately."))
      .addDropdown((dropdown) =>
        dropdown
          .addOption("wheelAction", tr("轮盘动作", "Wheel action"))
          .addOption("command", tr("命令", "Command"))
          .addOption("file", tr("文件", "File"))
          .addOption("uri", "URI")
          .addOption("script", tr("脚本", "Script"))
          .setValue(action.type)
          .onChange((value) => {
            action.type = value as FloatingDirectionAction["type"];
            this.rerenderPreservingScroll();
          })
      );

    const body = card.createDiv({ cls: "obsidian-quicker-direction-editor-body" });

    if (action.type === "wheelAction") {
      new Setting(body)
        .setName(tr("轮盘动作", "Wheel action"))
        .setDesc(tr("选择一个已经在轮盘动作管理中配置好的动作。", "Select an action configured in Wheel actions."))
        .addDropdown((dropdown) => {
          dropdown.addOption("", tr("选择轮盘动作...", "Select wheel action..."));
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
        .setName(tr("命令", "Command"))
        .setDesc(tr("搜索命令名称，或直接粘贴 command id。", "Search by command name or paste a command ID."))
        .addText((text) => {
          text
            .setPlaceholder(tr("搜索命令或输入 command id", "Search commands or enter command ID"))
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
        .setName(tr("文件路径", "File path"))
        .setDesc(tr("搜索文件名，或直接输入 vault 内文件路径。", "Search by file name or enter a vault file path."))
        .addText((text) => {
          fileInput = text;
          text
            .setPlaceholder(tr("搜索文件或输入文件路径", "Search files or enter a file path"))
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
            .setButtonText(tr("使用当前文件", "Use current file"))
            .onClick(() => {
              const activePath = this.getActiveFilePath();
              if (!activePath) {
                new Notice(tr("当前没有打开的 Markdown 文件", "No Markdown file is currently open"));
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
        .setDesc(tr("输入要打开的链接。", "Enter the link to open."))
        .addText((text) =>
          text
            .setPlaceholder(tr("输入 URI", "Enter URI"))
            .setValue(action.uri ?? "")
            .onChange((value) => {
              action.uri = value;
            })
        );
      return;
    }

    new Setting(container)
      .setName(tr("脚本", "Script"))
      .setDesc(tr("脚本动作预留字段，当前版本不会执行。", "Reserved script field; scripts are not executed in this version."))
      .addTextArea((text) =>
        text
          .setPlaceholder(tr("脚本预留，当前不会执行", "Reserved script field; not executed"))
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
      text: tr("保存方向动作", "Save direction action")
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
    new Notice(
      tr(
        `${getFloatingDirectionLabel(direction)}滑动作已保存`,
        `${getFloatingDirectionLabel(direction)} swipe action saved`
      )
    );
    this.rerenderPreservingScroll();
  }

  private getDirectionActionSummary(action: FloatingDirectionAction): string {
    if (!action.enabled) {
      return tr("已禁用", "Disabled");
    }

    if (action.type === "wheelAction") {
      const wheelAction = this.plugin.settings.actions.find((candidate) => candidate.id === action.actionId);
      return wheelAction
        ? `${wheelAction.icon} ${wheelAction.label}`
        : tr("选择轮盘动作", "Select wheel action");
    }

    if (action.type === "command") {
      return getCommandInputDisplayValue(this.getCommands(), action.commandId) ||
        tr("未设置命令", "No command");
    }

    if (action.type === "file") {
      return action.filePath || tr("未设置文件", "No file");
    }

    if (action.type === "uri") {
      return action.uri || tr("未设置 URI", "No URI");
    }

    return action.script ? tr("脚本", "Script") : tr("未设置脚本", "No script");
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
