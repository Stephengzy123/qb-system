import Link from "next/link";
import { listQuestionSets } from "@/lib/question-imports";
import Workspace from "@/components/workspace";
import { requireAppUser } from "@/lib/app-user";
import { getOrganizationName } from "@/lib/organization";

export const dynamic = "force-dynamic";

export default async function QuestionBankPage() {
  const user = await requireAppUser({ staff: true });
  const organizationName = await getOrganizationName();
  const sets = await listQuestionSets(user);
  return <Workspace view="library" user={user} organizationName={organizationName}>
    <header className="page-header compact"><div><p className="eyebrow">CONTENT</p><h1>Question bank</h1><p className="lede">Organize, review, and reuse your question sets.</p></div><Link className="primary-button" href="/admin/question-bank/upload">Upload a set</Link></header>
    <section className="panel">{sets.length ? sets.map(set => <article className="upload-history" key={set.id}><h2>{set.import_id ? <Link href={`/admin/question-bank/imports/${set.import_id}`}>{set.name}</Link> : set.name}</h2><p>{set.path} / {set.name} · {set.count} questions · Draft</p></article>) : <div className="empty-state"><h2>No question sets yet</h2><p>Upload images, a folder, or a ZIP to create the first set.</p></div>}</section>
  </Workspace>;
}
