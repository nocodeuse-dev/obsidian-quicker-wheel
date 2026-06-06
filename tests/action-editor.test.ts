import { describe, expect, test } from "vitest";
import { getActionSavedNotice, getPreviewSelectedActionId } from "../src/action-editor";

describe("getActionSavedNotice", () => {
  test("names the saved action when a label exists", () => {
    expect(getActionSavedNotice("收集")).toBe("动作“收集”已保存");
  });

  test("uses a fallback for blank action labels", () => {
    expect(getActionSavedNotice("   ")).toBe("动作已保存");
  });

  test("selects the clicked preview action for editing", () => {
    expect(getPreviewSelectedActionId({ id: "collect-action" })).toBe("collect-action");
  });
});
