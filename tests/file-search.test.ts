import { describe, expect, test } from "vitest";
import { filterObsidianFiles } from "../src/obsidian-files";

describe("filterObsidianFiles", () => {
  const files = [
    { name: "Index", path: "Projects/Index.md" },
    { name: "日记", path: "Journal/2026-06-05.md" },
    { name: "Meeting", path: "Work/Meeting.md" }
  ];

  test("filters files by name or path", () => {
    expect(filterObsidianFiles(files, "index")).toEqual([files[0]]);
    expect(filterObsidianFiles(files, "journal")).toEqual([files[1]]);
    expect(filterObsidianFiles(files, "日记")).toEqual([files[1]]);
  });

  test("returns all files for an empty query", () => {
    expect(filterObsidianFiles(files, " ")).toEqual(files);
  });
});
