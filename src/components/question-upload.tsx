"use client";
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import UploadReturnNotice, { LAST_UPLOAD_KEY } from "@/components/upload-return-notice";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { unzipSync } from "fflate";
import { imageType, MAX_FILES, MAX_IMAGE_BYTES, destinationName, validSourcePath } from "@/lib/upload-validation";

import UploadFolderPicker from '@/components/upload-folder-picker';
import type {BankFolder} from '@/lib/question-bank-model';
const subscribe=()=>()=>undefined;
type Item={file:File;path:string;preview?:string;warning?:string;id?:string;status?:string;error?:string;assetId?:string};
async function jsonResponse(response:Response) {
  const data=await response.json().catch(()=>({error:`Request failed (${response.status}). Please retry.`}));
  if(!response.ok) throw new Error(data.error??'The request failed.');
  return data;
}
export default function QuestionUpload({folders,initialFolderId=null}:{folders:BankFolder[];initialFolderId?:string|null}) {
  const ready=useSyncExternalStore(subscribe,()=>true,()=>false);
  const [folderItems,setFolderItems]=useState(folders);
  const [folderId,setFolderId]=useState<string|null>(initialFolderId);
  const folder=folderItems.find(item=>item.id===folderId);
  const [items,setItems]=useState<Item[]>([]);
  const [step,setStep]=useState<'select'|'review'|'results'>('select');
  const [setName,setSetName]=useState('');
  const [choices,setChoices]=useState(4);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [job,setJob]=useState<string>();
  const urls=useRef<string[]>([]);
  const uploading = busy && step !== 'select';
  useEffect(() => {
    if (!uploading) return;
    const beforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    const beforeNavigate = (event: MouseEvent) => {
      const link = event.target instanceof Element ? event.target.closest('a') : null;
      if (!link || link.target === '_blank' || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      if (!window.confirm('Upload and verification are still running. Leaving this page stops remaining files. Leave anyway?')) {
        event.preventDefault(); event.stopPropagation();
      }
    };
    window.addEventListener('beforeunload', beforeUnload);
    document.addEventListener('click', beforeNavigate, true);
    return () => { window.removeEventListener('beforeunload', beforeUnload); document.removeEventListener('click', beforeNavigate, true); };
  }, [uploading]);
  useEffect(()=>()=>urls.current.forEach(url=>URL.revokeObjectURL(url)),[]);
  async function selectFiles(files:File[]) {
    setBusy(true);setError('');
    const newUrls:string[]=[];
    try {
      let sources=files.map(file=>({file,path:file.webkitRelativePath||file.name}));
      if(files.some(file=>/\.zip$/i.test(file.name))) {
        if(files.length!==1) throw new Error('Select one ZIP archive at a time, or select images or a folder.');
        if(files[0].size>100*1024*1024) throw new Error('ZIP archives must be under 100 MB.');
        let total=0,count=0;
        const extracted=unzipSync(new Uint8Array(await files[0].arrayBuffer()),{filter:entry=>{
          if(entry.name.endsWith('/')) return false;
          total+=entry.originalSize;count++;
          if(total>200*1024*1024 || count>MAX_FILES || entry.originalSize>MAX_IMAGE_BYTES) throw new Error('ZIP exceeds 500 files, 4 MB per file, or 200 MB expanded. Choose a smaller folder or archive.');
          return true;
        }});
        sources=Object.entries(extracted).map(([path,data])=>({path,file:new File([new Uint8Array(data)],path.split('/').at(-1)!)}));
      }
      if(sources.length>MAX_FILES) throw new Error('Choose up to 500 files per set.');
      const seen=new Set<string>();
      const next:Item[]=[];
      for(const source of sources.sort((a,b)=>a.path.localeCompare(b.path,undefined,{numeric:true}))) {
        let warning:string|undefined;
        if(!validSourcePath(source.path)) warning='Invalid file path.';
        else if(seen.has(source.path)) warning='Duplicate file path.';
        else if(!source.file.size || source.file.size>MAX_IMAGE_BYTES) warning='Images must be nonempty and no larger than 4 MB.';
        else if(!imageType(new Uint8Array(await source.file.slice(0,12).arrayBuffer()))) warning='Unsupported file. Use PNG, JPEG, or WebP.';
        seen.add(source.path);
        let preview:string|undefined;
        if(!warning) {
          preview=URL.createObjectURL(source.file);newUrls.push(preview);
          const image=new Image();image.src=preview;
          try {await image.decode();} catch {warning='This image cannot be opened. It may be damaged.';}
        }
        next.push({...source,warning,preview});
      }
      urls.current.forEach(url=>URL.revokeObjectURL(url));urls.current=newUrls;
      setItems(next);setJob(undefined);setStep('select');
      if(!setName && sources[0]?.path.includes('/')) setSetName(sources[0].path.split('/')[0].slice(0,100));
    } catch(e) {newUrls.forEach(url=>URL.revokeObjectURL(url));setError(e instanceof Error?e.message:'Unable to read these files.');}
    finally {setBusy(false);}
  }
  function review() {
    try {if(!folder?.can_upload)throw new Error('Choose a folder where you have upload access.');setSetName(destinationName(setName));setError('');setStep('review');} catch(e) {setError((e as Error).message);}
  }
  async function upload() {
    setBusy(true);setError('');
    let current=items;
    try {
      let id=job;
      if(!id) {
        const created=await jsonResponse(await fetch('/api/question-imports',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({folderId,setName,choiceCount:choices,files:items.filter(i=>!i.warning).map(i=>i.path)})}));
        id=created.id;setJob(id);
        try { sessionStorage.setItem(LAST_UPLOAD_KEY, created.id); } catch { /* Uploads also work with browser storage disabled. */ }
        current=items.map(item=>({...item,id:created.files.find((f:{source_path:string;id:string})=>f.source_path===item.path)?.id}));
        setItems(current);
      }
      setStep('results');
      for(const item of current.filter(i=>!i.warning && i.status!=='succeeded')) {
        setItems(prev=>prev.map(i=>i.path===item.path?{...i,status:'uploading',error:undefined}:i));
        try {
          const form=new FormData();form.append('file',item.file);
          const result=await jsonResponse(await fetch(`/api/question-imports/${id}/files/${item.id}`,{method:'POST',body:form}));
          setItems(prev=>prev.map(i=>i.path===item.path?{...i,status:'succeeded',assetId:result.assetId}:i));
        } catch(e) {setItems(prev=>prev.map(i=>i.path===item.path?{...i,status:'failed',error:(e as Error).message}:i));}
      }
    } catch(e) {setError((e as Error).message);}
    finally {setBusy(false);}
  }
  const valid=items.filter(i=>!i.warning);
  const succeeded=items.filter(i=>i.status==='succeeded').length;
  const failed=items.filter(i=>i.status==='failed').length;
  return <section className="panel question-upload">
    <ol className="upload-steps" aria-label="Upload progress"><li aria-current={step==='select'?'step':undefined}>1. Choose files & destination</li><li aria-current={step==='review'?'step':undefined}>2. Review</li><li aria-current={step==='results'?'step':undefined}>3. Upload results</li></ol>
    {!job && step === 'select' && <UploadReturnNotice />}
    {uploading && <div className="upload-notice attention"><h2>Please keep this page open</h2><p>Do not leave or refresh this page while your images are uploading and being verified. You can switch tabs and return here to see the result.</p><p>We will show a completion message or tell you what needs attention when every file has been checked.</p><progress aria-label="Upload progress" max={valid.length || 1} value={succeeded + failed} /></div>}
    {error && <p role="alert" className="upload-warning">{error}</p>}
    {step==='select' && <>
      <div className="upload-pickers"><label>Images or ZIP<input type="file" multiple accept="image/png,image/jpeg,image/webp,.zip" disabled={busy||!ready} onChange={e=>{void selectFiles(Array.from(e.target.files??[]));e.target.value='';}} /></label><label>Folder (includes subfolders)<input type="file" multiple {...{webkitdirectory:""}} disabled={busy||!ready} onChange={e=>{void selectFiles(Array.from(e.target.files??[]));e.target.value='';}} /></label></div>
      <p>PNG, JPEG, or WebP. Up to 500 files, 4 MB per image. Folder paths are preserved in the review; all images become one set.</p>
      <UploadFolderPicker folders={folderItems} currentId={folderId} disabled={busy||!ready} onSelect={id=>{setFolderId(id);setError('');}} onCreated={created=>{setFolderItems(items=>[...items.filter(f=>f.id!==created.id),created]);setFolderId(created.id);setError('');}} />
      <label className="upload-field">Set name<input value={setName} onChange={e=>setSetName(e.target.value)} placeholder="Practice set" maxLength={100} disabled={busy||!ready} /></label>
      <label className="upload-field">Choices per question<select value={choices} onChange={e=>setChoices(Number(e.target.value))}>{Array.from({length:9},(_,i)=>i+2).map(n=><option key={n}>{n}</option>)}</select></label>
      <button className="primary-button" disabled={busy||!ready||!valid.length} onClick={review}>{busy?'Reading files…':'Continue to review'}</button>
    </>}
    {step==='review' && <><h2>Review {valid.length} images</h2><p><strong>{folder?.path} / {setName}</strong> · {choices} choices per question · Saved as a draft</p><p>Check the images and order below. Files with warnings will be skipped.</p><div className="empty-actions"><button className="secondary-button" disabled={busy||!ready} onClick={()=>setStep('select')}>Back</button><button className="primary-button" disabled={busy||!ready||!valid.length} onClick={()=>void upload()}>{busy?'Starting…':`Confirm and upload ${valid.length} images`}</button></div></>}
    {step==='results' && <>
      <div className={`upload-notice ${busy ? '' : failed || succeeded < valid.length || items.some(item => item.warning) ? 'attention' : 'complete'}`}>
        <h2>{busy ? 'Uploading and verifying…' : failed || succeeded < valid.length || items.some(item => item.warning) ? 'Upload needs attention' : 'Upload complete'}</h2>
        <p role="status">{succeeded} of {valid.length} images verified in R2. {failed>0?`${failed} failed.`:''} {items.length-valid.length>0?`${items.length-valid.length} skipped.`:''}</p>
        {!busy && <p>{failed || succeeded < valid.length ? 'Processing has finished. Review the failures below and retry failed files before leaving.' : items.some(item => item.warning) ? 'All selected valid images are uploaded and verified. Review the skipped-file warnings below. It is now safe to leave this page.' : 'All images are uploaded and verified. It is now safe to leave this page.'} This result stays here when you switch tabs and return.</p>}
      </div>
      <div className="empty-actions">{failed>0 && <button className="primary-button" disabled={busy||!ready} onClick={()=>void upload()}>Retry failed files</button>}{job && !busy && <Link className="secondary-button" href={`/admin/question-bank/imports/${job}`}>Review saved upload</Link>}{!busy && <Link className="secondary-button" href="/admin/question-bank">Go to question bank</Link>}</div>
    </>}
    {items.length>0 && <div className="upload-review-grid">{items.map((item,index)=><article className="upload-review-card" key={`${item.path}-${index}`}>
      {item.preview && <a href={item.assetId?`/api/question-assets/${item.assetId}`:item.preview} target="_blank" rel="noreferrer"><img src={item.assetId?`/api/question-assets/${item.assetId}`:item.preview} alt={`Preview of ${item.path}`} loading="lazy" /></a>}
      <strong>{item.path}</strong><small>{(item.file.size/1024).toFixed(1)} KB</small>
      {(item.warning||item.error) && <p className="upload-warning" role="alert">{item.warning?`Skipped: ${item.warning}`:item.error}</p>}
      {item.status && <p>{item.status==='succeeded'?'✓ Verified in R2':item.status==='uploading'?'Uploading and checking storage…':item.status==='failed'?'Upload failed':''}</p>}
      {step!=='results' && <button className="secondary-button" disabled={busy||!ready} onClick={()=>setItems(prev=>prev.filter((_,i)=>i!==index))}>Remove</button>}
    </article>)}</div>}
  </section>;
}
