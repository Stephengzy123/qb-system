import Link from "next/link";
import Workspace from "@/components/workspace";
import { requireAppUser } from "@/lib/app-user";

export const dynamic = "force-dynamic";

export default async function NewAssignmentPage() {
  const user = await requireAppUser({ staff: true });
  return <Workspace view="assignments" user={user}><header className="page-header compact"><div><p className="eyebrow">NEW ASSIGNMENT</p><h1>Create assignment</h1><p className="lede">Assignments are created from real question sets.</p></div><Link className="secondary-button" href="/assignments">Cancel</Link></header><section className="panel"><div className="empty-state product-empty"><span>▤</span><h2>Add questions first</h2><p>Your question bank is empty. Upload a question set before creating an assignment.</p><Link className="primary-button" href="/imports">Go to imports</Link></div></section></Workspace>;
}
