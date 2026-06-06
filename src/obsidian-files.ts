import type { App } from "obsidian";

export interface ObsidianFileItem {
  name: string;
  path: string;
}

export function listObsidianMarkdownFiles(app: App): ObsidianFileItem[] {
  return app.vault.getMarkdownFiles().map((file) => ({
    name: file.basename,
    path: file.path
  })).sort((a, b) => a.path.localeCompare(b.path, "zh-Hans"));
}

export function filterObsidianFiles(
  files: ObsidianFileItem[],
  query: string
): ObsidianFileItem[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return files;
  }

  return files.filter((file) =>
    `${file.name} ${file.path}`.toLowerCase().includes(normalizedQuery)
  );
}
