import { isUuid } from '@/lib/question-bank-model';
export function parsePracticeInput(input: unknown) {
  const value = input as {count:number;requestId:string} | null;
  if (!value || !Number.isInteger(value.count) || value.count < 5 || value.count > 50 || !isUuid(value.requestId))
    throw new Error('Choose a whole number of questions between 5 and 50.');
  return value;
}
export type ErrorCandidate = {version_id:string;grading_choice_id:string;errors:number;last_wrong:Date};
// Weighted sampling without replacement. Errors retain a baseline weight, with a
// recency bonus that halves every 14 days; repeated errors increase weight linearly.
export function selectPracticeQuestions(candidates:ErrorCandidate[], count:number, now=Date.now(), random=Math.random) {
  return candidates.map(question => {
    const days = Math.max(0, (now-new Date(question.last_wrong).getTime())/86400000);
    const weight = question.errors * (1 + 3 * 2 ** (-days/14));
    return {question, rank:-Math.log(Math.max(Number.MIN_VALUE,random()))/weight};
  }).sort((a,b)=>a.rank-b.rank).slice(0,count).map(item=>item.question);
}
