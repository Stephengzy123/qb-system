"use client";
import {useRef,useState,useSyncExternalStore} from 'react';
import {useRouter} from 'next/navigation';
import {draftKey,discardKey} from '@/lib/local-work';
const subscribe=(callback:()=>void)=>{window.addEventListener('storage',callback);window.addEventListener('qb-work-discarded',callback);return()=>{window.removeEventListener('storage',callback);window.removeEventListener('qb-work-discarded',callback);};};
export default function DiscardProgress({studentId,assignmentId,revision,practice=false,onlyIfDraft=false,disabled=false,leaveOnDiscard=false}:{studentId:string;assignmentId:string;revision:number;practice?:boolean;onlyIfDraft?:boolean;disabled?:boolean;leaveOnDiscard?:boolean}) {
  const router=useRouter();const [confirm,setConfirm]=useState(false);const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [done,setDone]=useState(false);const sending=useRef(false);
  const hasDraft=useSyncExternalStore(subscribe,()=>{try{return Boolean(localStorage.getItem(draftKey(studentId,assignmentId)));}catch{return false;}},()=>false);
  async function discard(){
    if(sending.current)return;sending.current=true;setBusy(true);setError('');
    try{
      const response=await fetch(`/api/assignments/${assignmentId}/work`,{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({revision})});
      const result=await response.json();if(!response.ok)throw new Error(result.error??'Could not discard progress.');
      try{localStorage.removeItem(draftKey(studentId,assignmentId));localStorage.setItem(discardKey(studentId,assignmentId),String(result.revision));}catch{/* Server revision prevents older local answers from being restored. */}
      window.dispatchEvent(new CustomEvent('qb-work-discarded',{detail:assignmentId}));setDone(true);setConfirm(false);
      if(leaveOnDiscard)router.push('/student');router.refresh();
    }catch(error){setError((error as Error).message);}finally{sending.current=false;setBusy(false);}
  }
  if(done||onlyIfDraft&&!hasDraft)return null;
  return <div className="discard-progress"><button className="discard-button" type="button" aria-label={practice?'Delete unfinished error practice':'Discard progress on this assignment'} title={practice?'Delete unfinished error practice':'Discard progress'} disabled={disabled||busy} onClick={()=>setConfirm(true)}><svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7" /></svg></button>
    {confirm&&<div className="submission-confirm discard-confirm" role="region" aria-label="Confirm discard"><h3>{practice?'Delete this unfinished practice?':'Discard progress on this assignment?'}</h3><p>This clears only your answers for this {practice?'practice session':'assignment'}, including saved progress. {practice?'The unfinished practice will be removed.':'The assignment will remain available to start again.'} Your other work is unaffected.</p>{error&&<p role="alert" className="upload-warning">{error}</p>}<div className="folder-action-buttons"><button type="button" className="secondary-button" disabled={busy} onClick={()=>setConfirm(false)}>Keep working</button><button type="button" className="danger-button" disabled={busy||disabled} onClick={()=>void discard()}>{busy?'Discarding…':'Discard progress'}</button></div></div>}
  </div>;
}
