"use client";
import {useState} from 'react';
import {useRouter} from 'next/navigation';
export default function CloseAssignment({id}:{id:string}) {
  const router=useRouter();const [confirm,setConfirm]=useState(false);const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  async function close() {
    setBusy(true);setError('');
    try {const response=await fetch(`/api/assignments/${id}/close`,{method:'POST'});const result=await response.json();if(!response.ok)throw new Error(result.error);router.refresh();}
    catch(error){setError((error as Error).message);setBusy(false);}
  }
  return <section className="panel answer-editor"><h2>Open · No due date</h2><p>Closing stops further saves and submissions. Submitted work remains available to review.</p>{confirm?<div className="empty-actions"><button className="secondary-button" disabled={busy} onClick={()=>setConfirm(false)}>Keep open</button><button className="primary-button" disabled={busy} onClick={()=>void close()}>{busy?'Closing…':'Confirm close'}</button></div>:<button className="secondary-button" onClick={()=>setConfirm(true)}>Close assignment</button>}{error&&<p role="alert">{error}</p>}</section>;
}
