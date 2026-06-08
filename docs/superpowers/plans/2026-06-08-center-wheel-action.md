# Center Wheel Action Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the wheel center an editable action that opens Quicker Wheel settings by default.

**Architecture:** Add an explicit center placement to the existing action model, migrate old settings by inserting a default center action, and reuse the current action editor. Wheel rendering resolves the center action separately while normal slot lookup excludes it.

**Tech Stack:** TypeScript, Obsidian API, Vitest, esbuild

---

### Task 1: Center action model

**Files:**
- Modify: `src/types.ts`
- Modify: `src/settings.ts`
- Test: `tests/settings.test.ts`
- Test: `tests/layout.test.ts`

- [ ] Add failing tests for default creation, migration, custom value preservation, reset behavior, and slot isolation.
- [ ] Run the focused tests and confirm they fail because center action helpers do not exist.
- [ ] Add `placement`, center action helpers, and migration logic.
- [ ] Run the focused tests and confirm they pass.

### Task 2: Wheel interaction and settings editing

**Files:**
- Modify: `src/wheel-modal.ts`
- Modify: `src/settings-tab.ts`
- Modify: `styles.css`

- [ ] Resolve and render the configured center action.
- [ ] Execute the center action in actual wheels.
- [ ] Select the center action from the settings preview.
- [ ] Restore the default center action when it is deleted.
- [ ] Add the red selected border to the center button.

### Task 3: Verification and release

**Files:**
- Modify: `manifest.json`
- Modify: `package.json`
- Modify: `versions.json`
- Build: `main.js`

- [ ] Run `npm test`.
- [ ] Run `npm run build`.
- [ ] Run `npm run sync` to bump the patch version, copy assets, and reload the plugin.
- [ ] Commit and push the verified changes.
- [ ] Tag the new version and publish release assets.
