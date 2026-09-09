import Workspace from "@/components/workspace";
import AccountSettings from "@/components/account-settings";
import { requireAppUser } from "@/lib/app-user";
import { getOrganizationName } from "@/lib/organization";



export async function AdminAccountContent({ tab = "profile" }: { tab?: "profile" | "security" | "classes" | "appearance" }) {
  const user = await requireAppUser({ staff: true });
  const organizationName = await getOrganizationName();
  return <Workspace view="account" user={user} organizationName={organizationName}>
    <header className="page-header compact"><div><p className="eyebrow">ACCOUNT</p><h1>Account settings</h1><p className="lede">Manage your profile, password, and access.</p></div></header>
    <AccountSettings tab={tab} user={user} memberships={[]} />
  </Workspace>;
}
