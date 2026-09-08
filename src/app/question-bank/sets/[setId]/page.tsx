import Link from 'next/link';
import { notFound } from 'next/navigation';
import Workspace from '@/components/workspace';
import SetAnswerEditor from '@/components/set-answer-editor';
import { FolderBreadcrumbs } from '@/components/folder-browser';
import { requireAppUser } from '@/lib/app-user';
import { getOrganizationName } from '@/lib/organization';
import { getFolderBrowser, getQuestionSet } from '@/lib/question-bank';
export const dynamic = 'force-dynamic';
export default async function QuestionSetPage({ params }: { params: Promise<{ setId: string }> }) {
  const user = await requireAppUser({ staff: true });
  const set = await getQuestionSet(user, (await params).setId);
  if (!set) notFound();
  const { folders } = await getFolderBrowser(user);
  return <Workspace view="library" user={user} organizationName={await getOrganizationName()}>
    <FolderBreadcrumbs folders={folders} currentId={set.folder_id} setName={set.name} />
    <header className="page-header compact"><div><p className="eyebrow">QUESTION SET · {set.status.toUpperCase()}</p><h1>{set.name}</h1><p className="lede">Review each question and select its correct choice.</p></div>
      {set.import_id && <Link className="secondary-button" href={`/admin/question-bank/imports/${set.import_id}`}>Upload review</Link>}
    </header>
    <SetAnswerEditor key={set.id} setId={set.id} questions={set.questions} canEdit={set.can_edit} />
  </Workspace>;
}
