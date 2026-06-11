import { tr } from "./i18n";

export function getActionSavedNotice(label: string): string {
  const trimmed = label.trim();
  if (!trimmed) {
    return tr("动作已保存", "Action saved");
  }

  return tr(`动作“${trimmed}”已保存`, `Action "${trimmed}" saved`);
}

export function getPreviewSelectedActionId(action: { id: string }): string {
  return action.id;
}
