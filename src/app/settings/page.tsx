import ServiceStatus from "@/components/service-status";
import Workspace from "@/components/workspace";
import { requireAppUser } from "@/lib/app-user";
import { getOrganizationName } from "@/lib/organization";
import OrganizationSettings from "@/components/organization-settings";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireAppUser({ staff: true });
  const organizationName = await getOrganizationName();
  return <Workspace view="overview" user={user} organizationName={organizationName}><ServiceStatus organizationName={organizationName}>{user.role === "admin" && <OrganizationSettings name={organizationName} />}</ServiceStatus></Workspace>;
}
