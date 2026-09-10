import ServiceStatus from "@/components/service-status";
import Workspace from "@/components/workspace";
import { requireAppUser } from "@/lib/app-user";
import { getOrganizationBranding } from "@/lib/organization";
import OrganizationSettings from "@/components/organization-settings";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireAppUser({ staff: true });
  const branding = await getOrganizationBranding();
  return <Workspace view="settings" user={user} organizationName={branding.name}>
    <ServiceStatus organizationName={branding.name} />
    {user.role === "admin" &&
      <OrganizationSettings name={branding.name} hasCustomLogo={branding.hasCustomLogo} logoVersion={branding.logoVersion} />
    }
  </Workspace>;
}
