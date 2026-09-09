export const CLOUD_SAVE_COOLDOWN_SECONDS=30;
export type LocalDraft={revision:number;answers:Record<string,string|null>;cooldownUntil:number};
export function draftKey(studentId:string,assignmentId:string){return `qb-work:${studentId}:${assignmentId}`;}
export function discardKey(studentId:string,assignmentId:string){return `qb-work-discarded:${studentId}:${assignmentId}`;}
export function parseLocalDraft(raw:string|null,questions:{id:string;choices:{id:string}[]}[],minimumRevision=0):LocalDraft|null {
  if(!raw)return null;
  try{
    const value=JSON.parse(raw);
    if(!Number.isSafeInteger(value.revision)||value.revision<minimumRevision||!value.answers||typeof value.answers!=='object'||Array.isArray(value.answers)||!Number.isFinite(value.cooldownUntil))return null;
    const answers:Record<string,string|null>={};
    for(const question of questions){
      const choice=value.answers[question.id];
      if(choice!==null&&!question.choices.some(c=>c.id===choice))return null;
      answers[question.id]=choice;
    }
    return {revision:value.revision,answers,cooldownUntil:value.cooldownUntil};
  }catch{return null;}
}
