"use client";
/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { useCallback,useEffect,useRef,useState,useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { CLOUD_SAVE_COOLDOWN_SECONDS,draftKey,parseLocalDraft } from '@/lib/local-work';
export type WorkQuestion={id:string;name:string;asset_id:string|null;choices:{id:string;label:string}[]};
const subscribe=()=>()=>undefined;
type WorkProps={studentId:string;assignmentId:string;questions:WorkQuestion[];revision:number;answers:{question_id:string;choice_id:string|null}[];cooldownSeconds?:number};
export default function StudentWork(props:WorkProps) {
  const ready=useSyncExternalStore(subscribe,()=>true,()=>false);
  return ready?<WorkEditor key={`${props.studentId}:${props.assignmentId}:${props.revision}`} {...props} />:<section className="panel answer-editor"><p>Loading your saved answers…</p></section>;
}
function WorkEditor({studentId,assignmentId,questions,revision:initialRevision,answers,cooldownSeconds=0}:WorkProps) {
  const router=useRouter();
  const ready=true;
  const storageKey=draftKey(studentId,assignmentId);
  const initial=Object.fromEntries(questions.map(q=>[q.id,answers.find(a=>a.question_id===q.id)?.choice_id??null]));
  const [recovery]=useState(()=>{
    try{return {draft:parseLocalDraft(localStorage.getItem(storageKey),questions),failed:false};}
    catch{return {draft:null,failed:true};}
  });
  const matchesCloud=recovery.draft&&questions.every(q=>recovery.draft!.answers[q.id]===initial[q.id]);
  const [conflict,setConflict]=useState(Boolean(recovery.draft&&recovery.draft.revision!==initialRevision&&!matchesCloud));
  const [selected,setSelected]=useState<Record<string,string|null>>(recovery.draft?.revision===initialRevision?recovery.draft.answers:initial);
  const [saved,setSaved]=useState(initial);
  const [revision,setRevision]=useState(initialRevision);
  const [localState,setLocalState]=useState<'saved'|'failed'|'initial'>(recovery.failed?'failed':recovery.draft?'saved':'initial');
  const [cooldownUntil,setCooldownUntil]=useState(()=>Math.max(Date.now()+cooldownSeconds*1000,recovery.draft?.cooldownUntil??0));
  const [now,setNow]=useState(()=>Date.now());
  const remaining=Math.max(0,Math.ceil((cooldownUntil-now)/1000));
  useEffect(()=>{
    if(cooldownUntil<=Date.now())return;
    const timer=window.setInterval(()=>{const time=Date.now();setNow(time);if(time>=cooldownUntil)window.clearInterval(timer);},250);
    return()=>window.clearInterval(timer);
  },[cooldownUntil]);
  const persist=useCallback((next:Record<string,string|null>,baseRevision=revision,until=cooldownUntil)=>{
    try{localStorage.setItem(storageKey,JSON.stringify({revision:baseRevision,answers:next,cooldownUntil:until}));setLocalState('saved');}
    catch{setLocalState('failed');}
  },[revision,cooldownUntil,storageKey]);
  function choose(questionId:string,choiceId:string|null){
    const next={...selected,[questionId]:choiceId};
    persist(next);setSelected(next);setMessage('');setConfirm(false);
  }
  function resolve(useLocal:boolean){
    const next=useLocal&&recovery.draft?recovery.draft.answers:initial;
    setSelected(next);persist(next,initialRevision);setConflict(false);
  }
  const [busy,setBusy]=useState(false);
  const [confirm,setConfirm]=useState(false);
  const [error,setError]=useState('');
  const [message,setMessage]=useState('');
  const [submitted,setSubmitted]=useState(false);
  const sending=useRef(false);
  const dirty=questions.some(q=>selected[q.id]!==saved[q.id]);
  const unanswered=questions.filter(q=>!selected[q.id]).length;
  useEffect(()=>{
    if(!dirty || submitted || localState==='saved') return;
    const guard=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue='';};
    const navigate=(event:MouseEvent)=>{
      const link=event.target instanceof Element?event.target.closest('a'):null;
      if(!link||link.target==='_blank'||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
      if(!window.confirm('You have unsaved answers. Leave without saving?')){event.preventDefault();event.stopPropagation();}
    };
    window.addEventListener('beforeunload',guard);document.addEventListener('click',navigate,true);
    return()=>{window.removeEventListener('beforeunload',guard);document.removeEventListener('click',navigate,true);};
  },[dirty,submitted,localState]);
  // This handler runs only on button clicks; timestamps are never read by it during render.
  /* eslint-disable react-hooks/purity */
  const send=useCallback(async(action:'save'|'submit')=>{
    if(sending.current||conflict||action==='save'&&Date.now()<cooldownUntil)return;
    persist(selected);
    sending.current=true;setBusy(true);setError('');setMessage('');
    try {
      const response=await fetch(`/api/assignments/${assignmentId}/work`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,revision,answers:questions.map(q=>({questionId:q.id,choiceId:selected[q.id]}))})});
      const result=await response.json().catch(()=>({error:'Unable to confirm the save. Retry or reload to recover saved answers.'}));
      if(!response.ok){
        if(response.status===429){const until=Date.now()+Math.max(1,Number(result.retryAfterSeconds)||CLOUD_SAVE_COOLDOWN_SECONDS)*1000;setCooldownUntil(until);setNow(Date.now());persist(selected,revision,until);}
        throw new Error(result.error??'Could not save your work.');
      }
      setRevision(result.revision);setSaved({...selected});setConfirm(false);
      if(result.status==='submitted'){
        try{localStorage.removeItem(storageKey);}catch{/* Submitted server state always takes precedence over a local draft. */}
        setSubmitted(true);router.refresh();
      }else{
        const until=Date.now()+(Number(result.retryAfterSeconds)||CLOUD_SAVE_COOLDOWN_SECONDS)*1000;
        setCooldownUntil(until);setNow(Date.now());persist(selected,result.revision,until);setMessage('Saved to cloud. Your answers are available on other devices.');
      }
    } catch(error){setError((error as Error).message);} finally{sending.current=false;setBusy(false);}
  },[conflict,cooldownUntil,persist,selected,assignmentId,revision,questions,storageKey,router]);
  /* eslint-enable react-hooks/purity */
  if(submitted)return <section className="panel assignment-form"><h2>Assignment submitted</h2><p role="status">Your answers are saved. Loading your results…</p><Link href={`/student/assignments/${assignmentId}`}>View results</Link></section>;
  return <section className="panel answer-editor"><div className="answer-toolbar"><div><h2>Your answers</h2><p>{questions.length-unanswered} of {questions.length} answered{dirty?' · Not yet saved to cloud':''}</p></div><div className="empty-actions"><button className="secondary-button" disabled={busy||!ready||!dirty||conflict||remaining>0} onClick={()=>void send('save')}>{remaining>0?`Save to cloud (${remaining}s)`:'Save to cloud'}</button><button className="primary-button" disabled={busy||!ready||conflict||!questions.length} onClick={()=>setConfirm(true)}>Submit assignment</button></div></div>
    <p className={localState==='failed'?'upload-warning':''} aria-live="polite">{localState==='failed'?(dirty?'Local saving is unavailable. Keep this page open until you save to cloud or submit.':'Local saving is unavailable. Your cloud answers are safe; save new changes to cloud before leaving.'):localState==='saved'?'Saved on this device. Answer changes are saved locally automatically.':'Answer changes save automatically on this device. Use Save to cloud to back them up to your account.'}</p>
    {conflict&&<div className="upload-warning" role="region" aria-label="Resolve local draft"><h3>Your local draft and cloud answers differ</h3><p>The cloud version changed after this draft was saved. Choose which answers to keep before continuing.</p><button className="secondary-button" onClick={()=>resolve(true)}>Use local answers</button> <button className="secondary-button" onClick={()=>resolve(false)}>Use cloud answers</button></div>}
    {error&&<p className="upload-warning" role="alert">{error}</p>}{message&&<p className="upload-success" role="status">{message}</p>}
    {confirm&&<div className="submission-confirm" role="region" aria-label="Confirm submission"><h3>Submit your answers?</h3><p>{unanswered?`${unanswered} questions are unanswered. Unanswered questions with a grading key count as incorrect.`:'All questions have an answer.'} You cannot change answers after submission.</p><button className="secondary-button" disabled={busy} onClick={()=>setConfirm(false)}>Keep working</button> <button className="primary-button" disabled={busy} onClick={()=>void send('submit')}>{busy?'Submitting…':'Confirm submission'}</button></div>}
    <div className="answer-questions">{questions.map((q,index)=><article className="answer-question" key={q.id}><h3>Question {index+1}</h3><p className="question-source">{q.name}</p>{q.asset_id?<a href={`/api/assignments/${assignmentId}/images/${q.asset_id}`} target="_blank" rel="noreferrer"><img src={`/api/assignments/${assignmentId}/images/${q.asset_id}`} alt={`Question ${index+1}`} loading="lazy" /></a>:<p className="upload-warning">Image unavailable. Contact your teacher.</p>}
      <fieldset disabled={!ready||busy||conflict}><legend>Your choice for question {index+1}</legend><div className="answer-choices">{q.choices.map(choice=><label className={selected[q.id]===choice.id?'selected':''} key={choice.id}><input type="radio" name={q.id} checked={selected[q.id]===choice.id} onChange={()=>choose(q.id,choice.id)} />{choice.label}</label>)}<label><input type="radio" name={q.id} checked={selected[q.id]===null} onChange={()=>choose(q.id,null)} />Unanswered</label></div></fieldset>
    </article>)}</div>
  </section>;
}
