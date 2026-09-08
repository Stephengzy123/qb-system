"use client";
import Link from 'next/link';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
export default function StudentAccountManager({studentId,disabled,duplicateOf,accounts}:{studentId:string;disabled:boolean;duplicateOf:string|null;accounts:{id:string;name:string;username:string}[]}) {
  const router=useRouter();
  const [target,setTarget]=useState(duplicateOf??'');
  const [confirm,setConfirm]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  async function update(disable:boolean) {
    setBusy(true);setError('');
    try {
      const response=await fetch(`/api/admin/students/${studentId}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({disabled:disable,duplicateOf:disable?target||null:null})});
      const result=await response.json().catch(()=>({error:'Could not update this account.'}));
      if(!response.ok)throw new Error(result.error);
      setConfirm(false);router.refresh();
    }catch(error){setError((error as Error).message);}finally{setBusy(false);}
  }
  return <section className="panel answer-editor"><h2>Account management</h2><p>{disabled?'This account is disabled.':'This account has access subject to its approval status.'} Assignment history is retained.</p>{duplicateOf&&<p>Duplicate of <Link href={`/admin/students/${duplicateOf}`}>retained student account</Link>. Work stays with the account that submitted it.</p>}
    {error&&<p className="upload-warning" role="alert">{error}</p>}
    {!disabled&&<label className="upload-field">Duplicate of (optional)<select value={target} onChange={event=>setTarget(event.target.value)}><option value="">Not a duplicate</option>{accounts.filter(a=>a.id!==studentId).map(account=><option value={account.id} key={account.id}>{account.name} (@{account.username})</option>)}</select></label>}
    {disabled?<button className="primary-button" disabled={busy} onClick={()=>void update(false)}>Restore account</button>:confirm?<div className="submission-confirm"><p>Disable this account and end its active sessions? Its past work will remain available.</p><button className="secondary-button" disabled={busy} onClick={()=>setConfirm(false)}>Cancel</button> <button className="danger-button" disabled={busy} onClick={()=>void update(true)}>Confirm disable</button></div>:<button className="danger-button" onClick={()=>setConfirm(true)}>Disable account</button>}
  </section>;
}
