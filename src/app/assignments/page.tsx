import Workspace from "@/components/workspace";
import { requireAppUser } from "@/lib/app-user";

export const dynamic = "force-dynamic";

export default async function AssignmentsPage() {
  const user = await requireAppUser({ staff: true });
  return <Workspace view="assignments" user={user} />;
}
