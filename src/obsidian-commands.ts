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
  query: string
): ObsidianCommand[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return commands;
  }

  return commands.filter((command) => {
    const searchable = `${command.name} ${command.id}`.toLowerCase();
    return searchable.includes(normalizedQuery);
  });
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
