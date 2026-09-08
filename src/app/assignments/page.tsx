import Link from "next/link";
import AssignmentList from "@/components/assignment-list";
import { listAssignments } from "@/lib/assignments";
import Workspace from "@/components/workspace";
import { requireAppUser } from "@/lib/app-user";
import { getOrganizationName } from "@/lib/organization";

export const dynamic = "force-dynamic";

export default async function AssignmentsPage() {
  const user = await requireAppUser({ staff: true });
  const organizationName = await getOrganizationName();
  return <Workspace view="assignments" user={user} organizationName={organizationName}>
    <header className="page-header compact"><div><p className="eyebrow">COURSEWORK</p><h1>Assignments</h1><p className="lede">Published work for your classes.</p></div><Link className="primary-button" href="/admin/assignments/new">Create assignment</Link></header>
    <AssignmentList assignments={await listAssignments(user)} />
  </Workspace>;
}
