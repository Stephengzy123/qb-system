import Link from 'next/link';
import { folderAncestors, type BankFolder, type BankSet } from '@/lib/question-bank-model';

const folderHref = (id: string) => `/admin/question-bank?folder=${encodeURIComponent(id)}`;
export function FolderBreadcrumbs({ folders, currentId, setName }: { folders: BankFolder[]; currentId: string | null; setName?: string }) {
  return <nav className="folder-breadcrumbs" aria-label="Folder path">
    <Link href="/admin/question-bank">Question bank</Link>
    {folderAncestors(folders, currentId).map(folder => <span key={folder.id}><span aria-hidden="true">/</span><Link href={folderHref(folder.id)} aria-current={!setName && folder.id === currentId ? 'page' : undefined}>{folder.name}</Link></span>)}
    {setName && <span><span aria-hidden="true">/</span><strong aria-current="page">{setName}</strong></span>}
  </nav>;
}

export default function FolderBrowser({ folders, sets, currentId }: { folders: BankFolder[]; sets: BankSet[]; currentId: string | null }) {
  const selected = folders.find(folder => folder.id === currentId);
  const children = folders.filter(folder => folder.parent_folder_id === currentId);
  const currentSets = sets.filter(set => set.folder_id === currentId);
  function tree(parentId: string | null) {
    return <ul>{folders.filter(folder => folder.parent_folder_id === parentId).map(folder => <li key={folder.id}>
      <Link href={folderHref(folder.id)} aria-current={folder.id === currentId ? 'page' : undefined}><span aria-hidden="true">▱</span> {folder.name}</Link>
      {folders.some(child => child.parent_folder_id === folder.id) && tree(folder.id)}
    </li>)}</ul>;
  }
  return <section className="panel folder-browser">
    <aside className="folder-sidebar"><h2>Folders</h2><nav aria-label="Folder tree"><Link href="/admin/question-bank" aria-current={!currentId ? 'page' : undefined}>All folders</Link>{tree(null)}</nav></aside>
    <div className="folder-content"><FolderBreadcrumbs folders={folders} currentId={currentId} />
      <h2>{selected?.name ?? 'All folders'}</h2>
      <p className="folder-description">{children.length} folders · {currentSets.length} sets{!currentId ? ` · ${sets.length} sets across the question bank` : ''}</p>
      {children.length > 0 && <div className="folder-grid">{children.map(folder => <Link className="folder-card" href={folderHref(folder.id)} key={folder.id}><span aria-hidden="true">▱</span><strong>{folder.name}</strong><small>{folder.path}</small></Link>)}</div>}
      {currentSets.length > 0 && <div className="set-list">{currentSets.map(set => <Link className="set-row" href={`/admin/question-bank/sets/${set.id}`} key={set.id}>
        <span aria-hidden="true">▤</span><div><strong>{set.name}</strong><small>{set.path} / {set.name}</small><small>{set.count} questions · {set.answered}/{set.count} answers set · {set.status}</small></div><span aria-hidden="true">→</span>
      </Link>)}</div>}
      {!children.length && !currentSets.length && <div className="empty-state"><h3>{currentId ? 'This folder is empty' : 'No folders yet'}</h3><p>Upload a set and choose its folder path to add questions here.</p><Link className="primary-button" href="/admin/question-bank/upload">Upload a set</Link></div>}
    </div>
  </section>;
}
