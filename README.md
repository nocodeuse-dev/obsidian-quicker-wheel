# Obsidian Quicker

一个面向 Obsidian 移动端优化的 Quicker 风格轮盘插件。它提供轮盘菜单、悬浮按钮、8 方向滑动动作，让常用命令和文件打开更快触达。

## 功能特点

- 通过命令或悬浮按钮打开 Quicker 风格轮盘。
- 轮盘格子支持绑定 Obsidian 命令、打开文件、URI 和预留脚本动作。
- 点击轮盘空格可以直接创建该位置的新动作。
- 移动端和桌面端都可以显示悬浮按钮。
- 悬浮按钮支持三种手势：
  - 短按：打开轮盘
  - 快速向 8 个方向滑动：执行对应方向动作
  - 长按拖动：移动悬浮按钮位置
- 悬浮窗动作可以直接复用已有轮盘动作。
- 支持调整轮盘大小、圈数、格数、文字大小、透明度、颜色和触发时间。

## 安装方式

### 方式一：使用 BRAT 安装

1. 在 Obsidian 中安装 [BRAT](https://github.com/TfTHacker/obsidian42-brat)。
2. 打开 BRAT 设置。
3. 选择 `Add Beta plugin`。
4. 粘贴仓库地址：

```text
https://github.com/nocodeuse-dev/obsidian-quicker-wheel
```

5. 回到 Obsidian 的第三方插件列表，启用 `Obsidian Quicker`。

### 方式二：手动安装

1. 从最新 Release 下载这三个文件：
   - `main.js`
   - `manifest.json`
   - `styles.css`
2. 在你的 Obsidian 仓库中创建文件夹：

```text
.obsidian/plugins/obsidian-quicker-wheel/
```

3. 把三个文件放进这个文件夹。
4. 重启 Obsidian，或重新加载第三方插件。
5. 在设置中启用 `Obsidian Quicker`。

## 使用方式

在 Obsidian 命令面板中搜索并运行：

```text
打开 Obsidian Quicker 轮盘
```

也可以在插件设置中开启悬浮按钮。移动端推荐使用悬浮按钮作为主要入口：

- 短按悬浮按钮：打开轮盘
- 快速向某个方向滑动：执行该方向动作
- 长按并拖动：移动悬浮按钮

如果想快速进入插件设置，可以运行：

```text
打开 Obsidian Quicker 设置
```

## 设置说明

插件设置包含：

- `轮盘菜单设置`
- `轮盘动作管理`
- `悬浮窗设置`
- `悬浮窗动作管理`
- `其他`

在 `轮盘动作管理` 中，可以编辑轮盘动作的名称、图标、动作类型和目标命令或文件。

在 `悬浮窗动作管理` 中，可以为 8 个方向分别设置动作，也可以直接复用已有轮盘动作。

## 从源码构建

```bash
npm install
npm run build
```

构建产物为：

- `main.js`
- `manifest.json`
- `styles.css`

## 开发

```bash
npm test
npm run build
```

本项目还包含本地同步脚本：

```bash
npm run sync
```

注意：`sync` 脚本使用的是作者本机 Obsidian 仓库路径，如果你要在自己的电脑上使用，需要先修改 `scripts/sync.mjs`。

## 作者

`nocodeuse`

## 许可证

MIT
