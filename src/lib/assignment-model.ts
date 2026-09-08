import { isUuid } from '@/lib/question-bank-model';
export type AssignmentInput = { requestId: string; title: string; instructions: string; setIds: string[]; classIds: string[]; dueAt: string | null };
export type AssignmentSource = { set_id: string; version_id: string; position: number; grading_choice_id: string | null };
export function parseAssignmentInput(input: unknown): AssignmentInput {
  const value = input as Partial<AssignmentInput> | null;
  const validIds = (ids: unknown, max: number): ids is string[] => Array.isArray(ids) && ids.length > 0 && ids.length <= max && ids.every(isUuid) && new Set(ids).size === ids.length;
  if (!value || !isUuid(value.requestId) || typeof value.title !== 'string' || !value.title.trim() || value.title.trim().length > 160 ||
    typeof value.instructions !== 'string' || value.instructions.length > 5000 || !validIds(value.setIds,50) || !validIds(value.classIds,50) ||
    !(value.dueAt === null || typeof value.dueAt === 'string' && Number.isFinite(Date.parse(value.dueAt)))) throw new Error('Enter a title and select 1–50 sets and 1–50 classes.');
  return { requestId:value.requestId, title:value.title.trim(), instructions:value.instructions.trim(), setIds:value.setIds, classIds:value.classIds, dueAt:value.dueAt ? new Date(value.dueAt).toISOString() : null };
}
export function combineAssignmentQuestions(setIds: string[], sources: AssignmentSource[]) {
  const combined = new Map<string, AssignmentSource>();
  for (const setId of setIds) {
    const questions = sources.filter(source => source.set_id === setId).sort((a,b) => a.position-b.position);
    if (!questions.length) throw new Error('One of the selected sets has no verified questions. Finish its upload or choose another set.');
    for (const question of questions) {
      const previous = combined.get(question.version_id);
      if (previous?.grading_choice_id && question.grading_choice_id && previous.grading_choice_id !== question.grading_choice_id) throw new Error('Selected sets give different correct choices for the same question. Resolve their answer keys before assigning them together.');
      if (!previous) combined.set(question.version_id,{...question});
      else if (!previous.grading_choice_id && question.grading_choice_id) previous.grading_choice_id=question.grading_choice_id;
    }
  }
  if (combined.size > 1000) throw new Error('Select up to 1,000 unique questions per assignment.');
  return [...combined.values()];
}
