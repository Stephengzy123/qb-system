import Workspace from "@/components/workspace";
import ClassManager from "@/components/class-manager";
import { requireAppUser } from "@/lib/app-user";
import { listClasses } from "@/lib/classes";
import { getOrganizationName } from "@/lib/organization";

export const dynamic = "force-dynamic";

export default async function ClassesPage() {
  const user = await requireAppUser({ staff: true });
  const [classes, organizationName] = await Promise.all([listClasses(user), getOrganizationName()]);
  return <Workspace view="classes" user={user} organizationName={organizationName}><ClassManager classes={classes} /></Workspace>;
}
