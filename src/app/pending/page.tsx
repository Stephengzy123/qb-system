import SignOutButton from "@/components/sign-out-button";
import { requireAppUser } from "@/lib/app-user";
import { redirect } from "next/navigation";
import ThemeToggle from "@/components/theme-toggle";
import { getOrganizationName } from "@/lib/organization";

export const dynamic = "force-dynamic";

export default async function PendingPage() {
  const user = await requireAppUser({ active: false });
  if (user.status === "active") redirect("/home");
  const organizationName = await getOrganizationName();
  return <><div className="auth-theme-toggle"><ThemeToggle /></div><main className="auth-page"><section className="auth-card pending-card"><div className="pending-icon">✓</div><div className="auth-heading"><h1>{user.status === "rejected" ? "Access not approved" : "Account awaiting approval"}</h1><p>{user.status === "rejected" ? `Ask a ${organizationName} administrator if you believe this was a mistake.` : "Your account was created successfully. A teacher or administrator needs to approve your access before you can continue."}</p></div><div className="pending-user"><strong>{user.displayName}</strong><span>{user.email}</span></div><SignOutButton /></section></main></>;
}
