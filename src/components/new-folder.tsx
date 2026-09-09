"use client";
import {useRef,useState,type FormEvent} from 'react';
import {useRouter} from 'next/navigation';
import type {BankFolder} from '@/lib/question-bank-model';
import {destinationName} from '@/lib/upload-validation';
export default function NewFolder({parentId,parentPath='',disabled=false,onCreated}:{parentId:string|null;parentPath?:string;disabled?:boolean;onCreated?:(folder:BankFolder)=>void}) {
  const router=useRouter();const [open,setOpen]=useState(false);const [name,setName]=useState('');const [busy,setBusy]=useState(false);const [error,setError]=useState('');const sending=useRef(false);
  async function create(event:FormEvent) {
    event.preventDefault();if(sending.current||disabled)return;
    let normalized;try{normalized=destinationName(name);}catch(error){setError((error as Error).message);return;}
    sending.current=true;setBusy(true);setError('');
    try {
      const response=await fetch('/api/folders',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({parentId,name:normalized})});
      const result=await response.json();if(!response.ok)throw new Error(result.error??'Could not create the folder.');
      const folder={...result.folder,path:parentPath?`${parentPath} / ${result.folder.name}`:result.folder.name};
      setOpen(false);setName('');
      if(onCreated)onCreated(folder);else{router.push(`/admin/question-bank?folder=${encodeURIComponent(folder.id)}`);router.refresh();}
    }catch(error){setError((error as Error).message);}finally{sending.current=false;setBusy(false);}
  }
  return <div className="new-folder">{!open?<button type="button" className="secondary-button" disabled={disabled} onClick={()=>setOpen(true)}>New folder</button>:<form className="inline-fields" onSubmit={create}><p>Create inside: <strong>{parentPath||'Question bank'}</strong></p><label>Folder name<input value={name} onChange={e=>setName(e.target.value)} maxLength={100} required disabled={busy||disabled} autoFocus /></label><div className="folder-action-buttons"><button className="primary-button" disabled={busy||disabled}>{busy?'Creating…':'Create folder'}</button><button type="button" className="secondary-button" disabled={busy} onClick={()=>{setOpen(false);setError('');}}>Cancel</button></div>{error&&<p role="alert" className="upload-warning">{error}</p>}</form>}</div>;
}
