import Link from "next/link";
import AdminAppearance from "@/components/admin-appearance";
import ServiceStatus from "@/components/service-status";
import Workspace from "@/components/workspace";
import { requireAppUser } from "@/lib/app-user";
import { getOrganizationBranding } from "@/lib/organization";
import OrganizationSettings from "@/components/organization-settings";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireAppUser({ staff: true });
  const branding = await getOrganizationBranding();
  return <Workspace view="overview" user={user} organizationName={branding.name}><section className="panel appearance-panel"><h2>Personal appearance</h2><p>Choose Dusk or switch between light and dark in your account settings.</p><Link className="secondary-button" href="/admin/account/appearance">Open appearance settings</Link></section>{user.role === "admin" && <AdminAppearance />}<ServiceStatus organizationName={branding.name}><section className="panel appearance-panel"><h2>Personal appearance</h2><p>Choose Dusk or switch between light and dark in your account settings.</p><Link className="secondary-button" href="/admin/account/appearance">Open appearance settings</Link></section>{user.role === "admin" && <OrganizationSettings name={branding.name} hasCustomLogo={branding.hasCustomLogo} logoVersion={branding.logoVersion} />}</ServiceStatus></Workspace>;
}
