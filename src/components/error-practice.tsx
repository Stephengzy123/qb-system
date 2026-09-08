"use client";
import {useRef,useState,type FormEvent} from 'react';
import {useRouter} from 'next/navigation';
export default function ErrorPractice() {
  const router=useRouter();
  const [count,setCount]=useState('10');const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  const requestId=useRef('');
  async function start(event:FormEvent) {
    event.preventDefault();if(busy)return;setBusy(true);setError('');
    requestId.current ||= crypto.randomUUID();
    try {
      const response=await fetch('/api/error-practice',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({count:Number(count),requestId:requestId.current})});
      const result=await response.json();if(!response.ok)throw new Error(result.error??'Could not start practice.');
      router.push(`/student/assignments/${result.id}`);router.refresh();
    }catch(error){setError((error as Error).message);setBusy(false);}
  }
  return <section className="panel answer-editor error-practice"><h2>Error practice</h2><p>Revisit your mistakes. Recent errors and questions you have missed multiple times are more likely to appear.</p><p>Choose 5–50 questions. If fewer are available, you’ll practise those questions once each.</p><form className="inline-fields" onSubmit={start}><label>Number of questions<input type="number" min="5" max="50" step="1" required value={count} disabled={busy} onChange={event=>{setCount(event.target.value);requestId.current='';}} /></label><button className="primary-button" disabled={busy}>{busy?'Starting…':'Start error practice'}</button></form>{error&&<p role="alert">{error}</p>}</section>;
}
