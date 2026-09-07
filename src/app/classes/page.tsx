import Workspace from "@/components/workspace";
import ClassManager from "@/components/class-manager";
import { requireAppUser } from "@/lib/app-user";
import { listClasses } from "@/lib/classes";

export const dynamic = "force-dynamic";

export default async function ClassesPage() {
  const user = await requireAppUser({ staff: true });
  const classes = await listClasses(user);
  return <Workspace view="classes" user={user}><ClassManager classes={classes} /></Workspace>;
}
