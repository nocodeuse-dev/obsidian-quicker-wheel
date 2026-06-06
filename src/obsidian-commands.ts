import type { App } from "obsidian";

export interface ObsidianCommand {
  id: string;
  name: string;
}

type AppWithCommands = App & {
  commands?: {
    executeCommandById(commandId: string): boolean;
    listCommands(): Record<string, ObsidianCommand>;
  };
};

export function executeObsidianCommand(app: App, commandId: string): boolean {
  const commandManager = (app as AppWithCommands).commands;
  if (!commandManager) {
    return false;
  }

  return commandManager.executeCommandById(commandId);
}

export function listObsidianCommands(app: App): ObsidianCommand[] {
  const commandManager = (app as AppWithCommands).commands;
  if (!commandManager) {
    return [];
  }

  return Object.values(commandManager.listCommands()).sort((a, b) =>
    a.name.localeCompare(b.name, "zh-Hans")
  );
}

export function filterObsidianCommands(
  commands: ObsidianCommand[],
  query: string,
  limit = Number.POSITIVE_INFINITY
): ObsidianCommand[] {
  const normalizedQuery = query.trim().toLowerCase();
  const results: ObsidianCommand[] = [];

  if (!normalizedQuery) {
    return commands.slice(0, limit);
  }

  for (const command of commands) {
    const searchable = `${command.name} ${command.id}`.toLowerCase();
    if (searchable.includes(normalizedQuery)) {
      results.push(command);
      if (results.length >= limit) {
        break;
      }
    }
  }

  return results;
}

export function getCommandInputDisplayValue(
  commands: ObsidianCommand[],
  commandId: string | undefined
): string {
  if (!commandId) {
    return "";
  }

  return commands.find((command) => command.id === commandId)?.name ?? commandId;
}
