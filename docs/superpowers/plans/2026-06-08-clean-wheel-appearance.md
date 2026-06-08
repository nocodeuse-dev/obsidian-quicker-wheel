# Clean Wheel Appearance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the default wheel clean and readable, leave empty slots blank, and expose focused color controls without changing wheel performance or gestures.

**Architecture:** Extend the existing wheel appearance model with explicit text and selected-border colors. Pass those values to CSS variables in the shared wheel renderer so the actual wheel and settings preview remain identical. Keep the SVG segment structure unchanged and express selection as a red stroke only.

**Tech Stack:** TypeScript, Obsidian API, SVG, CSS, Vitest, esbuild.

---

### Task 1: Define readable defaults and migration

**Files:**
- Modify: `src/types.ts`
- Modify: `src/settings.ts`
- Test: `tests/settings.test.ts`

- [x] Add failing assertions for simple light segment backgrounds, dark text/icons, blank empty slots, and red selected borders.
- [x] Run `npm test -- --run tests/settings.test.ts` and verify the new assertions fail.
- [x] Add `textColor` and `selectedBorderColor` to `WheelAppearanceSettings`.
- [x] Normalize the new colors and migrate the previous shipped default appearance to the new clean defaults while preserving custom appearances.
- [x] Run `npm test -- --run tests/settings.test.ts` and verify it passes.

### Task 2: Render blank slots and red selection borders

**Files:**
- Modify: `src/wheel-modal.ts`
- Modify: `styles.css`
- Test: `tests/styles.test.ts`

- [x] Add failing CSS assertions that selected segments use the selected-border color without changing fill, labels use the configured text color, and empty labels are hidden.
- [x] Run `npm test -- --run tests/styles.test.ts` and verify the assertions fail.
- [x] Pass the new colors as CSS variables from `renderWheelPreview()`.
- [x] Render no icon or text for empty slots.
- [x] Use one clean light fill for normal/action/empty segments and a red stroke for `.is-selected`.
- [x] Run `npm test -- --run tests/styles.test.ts` and verify it passes.

### Task 3: Add compact appearance controls

**Files:**
- Modify: `src/settings-tab.ts`

- [x] Replace the highlight control with selected-border color and add a text/icon color control.
- [x] Keep existing background, divider, center, size, shadow, and opacity controls for users who want full customization.
- [x] Remove the empty-slot display selector because empty slots are now intentionally blank.
- [x] Run `npm test && npm run build && git diff --check`.

### Task 4: Sync and publish

**Files:**
- Modify: `manifest.json`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `main.js`

- [x] Run `npm run sync` to bump the patch version, build, copy to Steamboy, and reload.
- [x] Re-run `npm test && npm run build && git diff --check`.
- [x] Verify source and Steamboy hashes match for `main.js`, `manifest.json`, and `styles.css`.
- [ ] Commit, push `main`, tag the new version, and publish a GitHub Release containing the three distributable files.
