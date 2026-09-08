import { isUuid } from '@/lib/question-bank-model';
export type WorkInput = { action:'save'|'submit'; revision:number; answers:{questionId:string;choiceId:string|null}[] };
export function parseWorkInput(input:unknown):WorkInput {
  const value=input as WorkInput|null;
  if(!value || !['save','submit'].includes(value.action) || !Number.isSafeInteger(value.revision) || value.revision<0 || !Array.isArray(value.answers) || value.answers.length>1000) throw new Error('Invalid answers. Reload the assignment and try again.');
  const ids=new Set<string>();
  for(const answer of value.answers) {
    if(!answer || !isUuid(answer.questionId) || !(answer.choiceId===null || isUuid(answer.choiceId)) || ids.has(answer.questionId)) throw new Error('Invalid or duplicate question selection.');
    ids.add(answer.questionId);
  }
  return value;
}
export function markChoice(selected:string|null,key:string|null):boolean|null {return key===null?null:selected===key;}
export function accuracy(correct:number,graded:number) {return graded>0?`${Math.round(correct/graded*100)}%`:'Not graded';}
export type ResultQuestion={id:string;name:string;position:number;asset_id:string|null;selected_label:string|null;correct_label:string|null;is_correct:boolean|null};
export type StudentResult={student_id:string;student_name:string;status:string;correct:number;graded:number;total:number;submitted_at:Date|null;questions:ResultQuestion[]};
export type HistoryItem={id:string;title:string;class_name:string;status:string;assignment_status:string;correct:number;graded:number;total:number;submitted_at:Date|null;due_at:Date|null};
