import Link from "next/link";
import { redirect } from "next/navigation";
import SignOutButton from "@/components/sign-out-button";
import AccountSettings from "@/components/account-settings";
import { getStudentMemberships, requireAppUser } from "@/lib/app-user";
import { getOrganizationName } from "@/lib/organization";
import BrandMark from "@/components/brand-mark";

export const dynamic = "force-dynamic";

export default async function StudentAccountPage() {
  const user = await requireAppUser();
  if (user.role !== "student") redirect("/admin/account");
  const [memberships, organizationName] = await Promise.all([getStudentMemberships(user.id), getOrganizationName()]);
  return <div className="student-shell">
    <header className="student-header"><div className="student-brand"><BrandMark /><span><strong>{organizationName}</strong><small>Student workspace</small></span></div><div className="student-account"><Link className="secondary-button student-exit" href="/student">← Back to my work</Link><span>{user.displayName}</span><SignOutButton /></div></header>
    <main className="student-main"><header className="page-header compact"><div><p className="eyebrow">ACCOUNT</p><h1>Account settings</h1><p className="lede">Manage your profile, password, and access.</p></div></header><AccountSettings user={user} memberships={memberships} /></main>
  </div>;
}
