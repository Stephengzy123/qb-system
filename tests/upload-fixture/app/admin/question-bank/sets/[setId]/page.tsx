import SetAnswerEditor from '../../../../../../../src/components/set-answer-editor';
import { FolderBreadcrumbs } from '../../../../../../../src/components/folder-browser';
import { folders, questions } from '../../../../../bank-data';
export default async function Page({ searchParams }: { searchParams: Promise<{ readonly?: string }> }) {
  return <><FolderBreadcrumbs folders={folders} currentId="chapter" setName="Practice set" /><h1>Practice set</h1><SetAnswerEditor setId="practice" questions={questions} canEdit={!(await searchParams).readonly} /></>;
}
