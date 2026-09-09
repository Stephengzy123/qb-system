import Link from "next/link";
import { getFolderBrowser } from "@/lib/question-bank";
import FolderBrowser from "@/components/folder-browser";
import { notFound } from "next/navigation";
import Workspace from "@/components/workspace";
import { requireAppUser } from "@/lib/app-user";
import { getOrganizationName } from "@/lib/organization";

export const dynamic = "force-dynamic";

export default async function QuestionBankPage({ searchParams }: { searchParams: Promise<{ folder?: string }> }) {
  const user = await requireAppUser({ staff: true });
  const organizationName = await getOrganizationName();
  const { folders, sets } = await getFolderBrowser(user);
  const currentId = (await searchParams).folder ?? null;
  if (currentId && !folders.some(folder => folder.id === currentId)) notFound();
  return <Workspace view="library" user={user} organizationName={organizationName}>
    <header className="page-header compact"><div><p className="eyebrow">CONTENT</p><h1>Question bank</h1><p className="lede">Organize, review, and reuse your question sets.</p></div>{(!currentId||folders.find(f=>f.id===currentId)?.can_upload)&&<Link className="primary-button" href={currentId?`/admin/question-bank/upload?folder=${encodeURIComponent(currentId)}`:"/admin/question-bank/upload"}>Upload a set</Link>}</header>
    <FolderBrowser folders={folders} sets={sets} currentId={currentId} />
  </Workspace>;
}
