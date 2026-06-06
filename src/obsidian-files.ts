export interface ObsidianFileItem {
  name: string;
  path: string;
}

export function filterObsidianFiles(
  files: ObsidianFileItem[],
  query: string,
  limit = Number.POSITIVE_INFINITY
): ObsidianFileItem[] {
  const normalizedQuery = query.trim().toLowerCase();
  const results: ObsidianFileItem[] = [];

  if (!normalizedQuery) {
    return files.slice(0, limit);
  }

  for (const file of files) {
    if (`${file.name} ${file.path}`.toLowerCase().includes(normalizedQuery)) {
      results.push(file);
      if (results.length >= limit) {
        break;
      }
    }
  }

  return results;
}
