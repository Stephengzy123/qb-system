import ServiceStatus from "@/components/service-status";
import Workspace from "@/components/workspace";
import { requireAppUser } from "@/lib/app-user";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireAppUser({ staff: true });
  return <Workspace view="overview" user={user}><ServiceStatus /></Workspace>;
}
