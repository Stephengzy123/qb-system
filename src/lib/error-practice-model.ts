import { isUuid } from '@/lib/question-bank-model';
export function parsePracticeInput(input: unknown) {
  const value = input as {count:number;requestId:string} | null;
  if (!value || !Number.isInteger(value.count) || value.count < 5 || value.count > 50 || !isUuid(value.requestId))
    throw new Error('Choose a whole number of questions between 5 and 50.');
  return value;
}
export type ErrorCandidate = {version_id:string;grading_choice_id:string;errors:number;last_wrong:Date;last_correct:Date|null};
// Weighted sampling without replacement. Errors retain a baseline weight, with a
// recency bonus that halves every 14 days; repeated errors increase weight linearly.
// Reserve about 20% for mistakes corrected since the last error. Fill from either
// pool when the other is short, so review never prevents a full practice session.
export function selectPracticeQuestions(candidates:ErrorCandidate[], count:number, now=Date.now(), random=Math.random) {
  const ranked = candidates.map(question => {
    const days = Math.max(0, (now-new Date(question.last_wrong).getTime())/86400000);
    const weight = question.errors * (1 + 3 * 2 ** (-days/14));
    return {question, recovered:question.last_correct!==null && new Date(question.last_correct).getTime()>new Date(question.last_wrong).getTime(), rank:-Math.log(Math.max(Number.MIN_VALUE,random()))/weight};
  }).sort((a,b)=>a.rank-b.rank);
  const unresolved = ranked.filter(item=>!item.recovered);
  const recovered = ranked.filter(item=>item.recovered);
  const size = Math.min(count,ranked.length);
  const reviewCount = Math.min(recovered.length, Math.max(Math.round(size*0.2),size-unresolved.length));
  return [...unresolved.slice(0,size-reviewCount),...recovered.slice(0,reviewCount)]
    .sort((a,b)=>a.rank-b.rank).map(item=>item.question);
}
