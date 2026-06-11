import type { PluginLanguage } from "./types";

export type PluginLocale = "zh" | "en";
const translations = {
  zh: {
    "command.openWheel": "打开轮盘",
    "command.toggleFloating": "开关悬浮按钮",
    "command.openSettings": "打开插件设置",
    "action.commands": "命令",
    "action.switcher": "切换",
    "action.newNote": "新建",
    "action.settings": "设置",
    "action.pluginSettings": "插件设置",
    "action.newAction": "新动作",
    "action.unnamed": "未命名",
    "error.commandNotFound": "未找到命令：{value}",
    "common.open": "打开",
    "common.enabled": "启用",
    "common.disabled": "已禁用"
  },
  en: {
    "command.openWheel": "Open wheel",
    "command.toggleFloating": "Toggle floating button",
    "command.openSettings": "Open plugin settings",
    "action.commands": "Commands",
    "action.switcher": "Switcher",
    "action.newNote": "New note",
    "action.settings": "Settings",
    "action.pluginSettings": "Plugin settings",
    "action.newAction": "New action",
    "action.unnamed": "Unnamed",
    "error.commandNotFound": "Command not found: {value}",
    "common.open": "Open",
    "common.enabled": "Enabled",
    "common.disabled": "Disabled"
  }
} as const;

export type TranslationKey = keyof typeof translations.zh;

let currentLocale: PluginLocale = "zh";

export function getPluginLocale(locale: string | undefined): PluginLocale {
  return locale?.toLowerCase().startsWith("zh") ? "zh" : "en";
}

export function resolvePluginLocale(
  preference: PluginLanguage,
  obsidianLocale: string | undefined
): PluginLocale {
  return preference === "auto" ? getPluginLocale(obsidianLocale) : preference;
}

export function setPluginLocale(locale: string | undefined): void {
  currentLocale = getPluginLocale(locale);
}

export function getCurrentPluginLocale(): PluginLocale {
  return currentLocale;
}

export function tr(chinese: string, english: string): string {
  return currentLocale === "zh" ? chinese : english;
}

export function t(
  key: TranslationKey,
  values: Record<string, string | number> = {}
): string {
  let result: string = translations[currentLocale][key] ?? translations.en[key];
  for (const [name, value] of Object.entries(values)) {
    result = result.replaceAll(`{${name}}`, String(value));
  }
  return result;
}
