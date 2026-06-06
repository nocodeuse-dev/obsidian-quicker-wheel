export function getActionSavedNotice(label: string): string {
  const trimmed = label.trim();
  if (!trimmed) {
    return "动作已保存";
  }

  return `动作“${trimmed}”已保存`;
}

export function getPreviewSelectedActionId(action: { id: string }): string {
  return action.id;
}
