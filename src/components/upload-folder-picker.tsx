"use client";
import {folderAncestors,type BankFolder} from '@/lib/question-bank-model';
import NewFolder from '@/components/new-folder';
export default function UploadFolderPicker({folders,currentId,disabled,onSelect,onCreated}:{folders:BankFolder[];currentId:string|null;disabled:boolean;onSelect:(id:string|null)=>void;onCreated:(folder:BankFolder)=>void}) {
  const current=folders.find(f=>f.id===currentId);const children=folders.filter(f=>f.parent_folder_id===currentId).sort((a,b)=>a.name.localeCompare(b.name));
  return <section className="upload-destination" aria-label="Destination folder"><h2>Destination folder</h2><nav className="folder-breadcrumbs" aria-label="Choose folder path"><button type="button" disabled={disabled} onClick={()=>onSelect(null)}>Question bank</button>{folderAncestors(folders,currentId).map(folder=><span key={folder.id}><span aria-hidden="true">/</span><button type="button" disabled={disabled} aria-current={folder.id===currentId?'page':undefined} onClick={()=>onSelect(folder.id)}>{folder.name}</button></span>)}</nav>
    <p>{current?<>Selected folder: <strong>{current.path}</strong>{!current.can_upload&&' · Browse only. Choose a folder where you have upload access.'}</>:'Open a folder below to choose where the set will go.'}</p>
    <div className="folder-grid">{children.map(folder=><button type="button" className="folder-card" disabled={disabled} onClick={()=>onSelect(folder.id)} key={folder.id}><span aria-hidden="true">▱</span><strong>{folder.name}</strong><small>{folder.can_upload?'Open folder':'Browse only'}</small></button>)}</div>
    {!children.length&&<p>No subfolders here.</p>}
    {(!currentId||current?.can_upload)&&<NewFolder key={currentId??'root'} parentId={currentId} parentPath={current?.path} disabled={disabled} onCreated={onCreated} />}
  </section>;
}
