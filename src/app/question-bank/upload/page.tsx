import Link from "next/link";
import QuestionUpload from "@/components/question-upload";
import { listUploadFolders } from "@/lib/question-imports";
import Workspace from "@/components/workspace";
import { requireAppUser } from "@/lib/app-user";
import { getOrganizationName } from "@/lib/organization";

export const dynamic = "force-dynamic";

export default async function UploadQuestionSetPage() {
  const user = await requireAppUser({ staff: true });
  const organizationName = await getOrganizationName();
  return <Workspace view="library" user={user} organizationName={organizationName}>
    <header className="page-header compact"><div><p className="eyebrow">QUESTION BANK</p><h1>Upload a set</h1><p className="lede">Choose a folder, ZIP, or images, then review and save your set.</p></div><Link className="secondary-button" href="/admin/question-bank">Cancel</Link></header>
    <QuestionUpload folders={(await listUploadFolders(user)).map(folder => folder.path)} />
  </Workspace>;
}
