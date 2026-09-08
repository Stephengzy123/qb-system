export type BankFolder = { id: string; parent_folder_id: string | null; name: string; path: string };
export type BankSet = { id: string; folder_id: string; name: string; path: string; status: string; count: number; answered: number; import_id: string | null };
export type SetQuestion = {
  id: string;
  version_id: string;
  position: number;
  name: string;
  asset_id: string | null;
  correct_choice_id: string | null;
  choices: { id: string; label: string }[];
};
export type AnswerChange = { questionId: string; versionId: string; choiceId: string | null; previousChoiceId: string | null };
export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
export function validAnswerChanges(value: unknown): value is AnswerChange[] {
  if (!Array.isArray(value) || !value.length || value.length > 500) return false;
  const ids = new Set<string>();
  return value.every(change => {
    if (!change || !isUuid(change.questionId) || !isUuid(change.versionId) ||
      !(change.choiceId === null || isUuid(change.choiceId)) ||
      !(change.previousChoiceId === null || isUuid(change.previousChoiceId)) || ids.has(change.questionId)) return false;
    ids.add(change.questionId);
    return true;
  });
}
export function folderAncestors(folders: BankFolder[], id: string | null) {
  const result: BankFolder[] = [];
  const seen = new Set<string>();
  while (id && !seen.has(id)) {
    seen.add(id);
    const folder = folders.find(folder => folder.id === id);
    if (!folder) break;
    result.unshift(folder);
    id = folder.parent_folder_id;
  }
  return result;
}
