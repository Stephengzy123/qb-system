import AssignmentCreator from "@/components/assignment-creator";
import { listAssignableSets } from "@/lib/assignments";
import { listClasses } from "@/lib/classes";
import Link from "next/link";
import Workspace from "@/components/workspace";
import { requireAppUser } from "@/lib/app-user";
import { getOrganizationName } from "@/lib/organization";

export const dynamic = "force-dynamic";

export default async function NewAssignmentPage() {
  const user = await requireAppUser({ staff: true });
  const organizationName = await getOrganizationName();
  const [sets, classes] = await Promise.all([listAssignableSets(user), listClasses(user)]);
  return <Workspace view="assignments" user={user} organizationName={organizationName}><header className="page-header compact"><div><p className="eyebrow">NEW ASSIGNMENT</p><h1>Create assignment</h1><p className="lede">Assignments are created from real question sets.</p></div><Link className="secondary-button" href="/admin/assignments">Cancel</Link></header><AssignmentCreator sets={sets} classes={classes} /></Workspace>;
}
