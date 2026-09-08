"use client";
import Link from 'next/link';
import { useRef, useState, useSyncExternalStore } from 'react';
import type { AssignableSet } from '@/lib/assignments';
type ClassOption={id:string;name:string;students:number};
const subscribe=()=>()=>undefined;
export default function AssignmentCreator({sets,classes}:{sets:AssignableSet[];classes:ClassOption[]}) {
  const hydrated=useSyncExternalStore(subscribe,()=>true,()=>false);
  const [setIds,setSetIds]=useState<string[]>([]);
  const [classIds,setClassIds]=useState<string[]>([]);
  const [title,setTitle]=useState('');
  const [instructions,setInstructions]=useState('');
  const [due,setDue]=useState('');
  const [search,setSearch]=useState('');
  const [review,setReview]=useState(false);
  const [busy,setBusy]=useState(false);
  const [uncertain,setUncertain]=useState(false);
  const [error,setError]=useState('');
  const [created,setCreated]=useState<{id:string;class_name:string}[]|null>(null);
  const requestId=useRef<string|null>(null);
  const submitting=useRef(false);
  const chosenSets=setIds.map(id=>sets.find(set=>set.id===id)!);
  const chosenClasses=classes.filter(cls=>classIds.includes(cls.id));
  const total=chosenSets.reduce((sum,set)=>sum+set.count,0);
  const missing=chosenSets.reduce((sum,set)=>sum+set.count-set.answered,0);
  const toggle=(ids:string[],id:string)=>ids.includes(id)?ids.filter(value=>value!==id):[...ids,id];
  async function assign() {
    if(submitting.current) return;
    submitting.current=true;setBusy(true);setError('');
    requestId.current??=crypto.randomUUID();
    try {
      const response=await fetch('/api/assignments',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({requestId:requestId.current,title,instructions,setIds,classIds,dueAt:due?new Date(due).toISOString():null})});
      const result=await response.json().catch(()=>({error:'Could not confirm the result. Retry this request.'}));
      if(!response.ok) {
        if(response.status===400 || response.status===403) {requestId.current=null;setUncertain(false);} else setUncertain(true);
        throw new Error(result.error??'Unable to create assignments.');
      }
      if(!Array.isArray(result.assignments)) {setUncertain(true);throw new Error('Could not confirm the result. Retry this request.');}
      setCreated(result.assignments);
    } catch(error) {setError((error as Error).message);if(error instanceof TypeError) setUncertain(true);}
    finally {setBusy(false);submitting.current=false;}
  }
  if(created) return <section className="panel assignment-form"><h2>Assignments published</h2><p role="status">Created {created.length} assignments. Active students in each selected class can now access their assignment.</p><ul>{created.map(assignment=><li key={assignment.id}><Link href={`/admin/assignments/${assignment.id}`}>{title} — {assignment.class_name}</Link></li>)}</ul><Link className="primary-button" href="/admin/assignments">View all assignments</Link></section>;
  if(!sets.length || !classes.length) return <section className="panel assignment-form"><h2>{!sets.length?'Add a question set first':'Add a class first'}</h2><p>{!sets.length?'No question sets are available to your account.':'You need an active class that you manage before assigning work.'}</p><Link className="primary-button" href={!sets.length?'/admin/question-bank/upload':'/admin/classes'}>{!sets.length?'Upload a set':'Manage classes'}</Link></section>;
  return <section className="panel assignment-form">
    {error && <p className="upload-warning" role="alert">{error}</p>}
    {uncertain && <p className="upload-warning">The result has not been confirmed. Retry with the same selections to recover this request without creating duplicates.</p>}
    {!review ? <form onSubmit={event=>{event.preventDefault();setError('');setReview(true);}}>
      <fieldset disabled={!hydrated || busy} className="assignment-fields">
        <label>Assignment title<input required value={title} onChange={event=>setTitle(event.target.value)} maxLength={160} placeholder="Chapter 3 practice" /></label>
        <label>Instructions (optional)<textarea value={instructions} onChange={event=>setInstructions(event.target.value)} maxLength={5000} rows={3} /></label>
        <label>Due date and time (optional)<input type="datetime-local" value={due} onChange={event=>setDue(event.target.value)} /></label><p>Times use your local time zone. Assignments open immediately when you confirm.</p>
        <div className="assignment-selectors"><fieldset><legend>1. Choose question sets</legend><input aria-label="Search sets" placeholder="Search by name or folder path" value={search} onChange={event=>setSearch(event.target.value)} />
          <div className="assignment-options">{sets.filter(set=>`${set.path} ${set.name}`.toLowerCase().includes(search.toLowerCase())).map(set=><label key={set.id} className="assignment-option"><input type="checkbox" checked={setIds.includes(set.id)} disabled={set.count===0 || !setIds.includes(set.id)&&setIds.length>=50} onChange={()=>setSetIds(toggle(setIds,set.id))} /><span><strong>{set.name}</strong><small>{set.path} / {set.name}</small><small>{set.count} verified questions · {set.answered} answers set{set.importing?' · Upload in progress':''}</small>{set.count===0 && <small>No verified questions yet</small>}</span></label>)}</div>
        </fieldset><fieldset><legend>2. Choose classes</legend><div className="assignment-options">{classes.map(cls=><label key={cls.id} className="assignment-option"><input type="checkbox" checked={classIds.includes(cls.id)} disabled={!classIds.includes(cls.id)&&classIds.length>=50} onChange={()=>setClassIds(toggle(classIds,cls.id))} /><span><strong>{cls.name}</strong><small>{cls.students} active students</small></span></label>)}</div></fieldset></div>
        <p>{setIds.length} sets · {total} questions before removing duplicates · {classIds.length} classes</p>
        <button className="primary-button" disabled={!title.trim() || !setIds.length || !classIds.length} type="submit">Continue to review</button>
      </fieldset>
    </form> : <><h2>Review assignment</h2><h3>{title}</h3>{instructions && <p className="assignment-instructions">{instructions}</p>}<p>{due?`Due ${new Date(due).toLocaleString()}`:'No due date'}</p>
      <p>The selected sets will be combined into one assignment for each selected class. Shared questions appear once.</p>
      <div className="assignment-selectors"><div><h3>Sets, in question order</h3><ol>{chosenSets.map(set=><li key={set.id}>{set.path} / {set.name} ({set.count} questions)</li>)}</ol></div><div><h3>Classes</h3><ul>{chosenClasses.map(cls=><li key={cls.id}>{cls.name}</li>)}</ul></div></div>
      {missing>0 && <p className="upload-warning">{missing} questions across the selected sets have no correct choice yet. They can be assigned, but cannot be automatically marked until the assignment has a grading key.</p>}
      {chosenSets.some(set=>set.importing) && <p className="upload-warning">An upload is still in progress. This assignment includes only verified questions available when you confirm.</p>}
      <div className="empty-actions"><button className="secondary-button" disabled={busy||uncertain} onClick={()=>setReview(false)}>Back to edit</button><button className="primary-button" disabled={busy} onClick={()=>void assign()}>{busy?'Creating assignments…':`Assign to ${classIds.length} ${classIds.length===1?'class':'classes'}`}</button></div>
    </>}
  </section>;
}
