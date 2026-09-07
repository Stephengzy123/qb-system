import Link from "next/link";
import Workspace from "@/components/workspace";
import SignOutButton from "@/components/sign-out-button";
import AccountSettings from "@/components/account-settings";
import { getStudentMemberships, requireAppUser } from "@/lib/app-user";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await requireAppUser();
  const memberships = user.role === "student" ? await getStudentMemberships(user.id) : [];
  const content = <><header className="page-header compact"><div><p className="eyebrow">ACCOUNT</p><h1>Account settings</h1><p className="lede">Manage your profile, password, and access.</p></div></header><AccountSettings user={user} memberships={memberships} /></>;

  if (user.role !== "student") return <Workspace view="account" user={user}>{content}</Workspace>;
  return <div className="student-shell"><header className="student-header"><div className="student-brand"><div className="mark"><span>Q</span></div><span><strong>AOMA</strong><small>Student workspace</small></span></div><div className="student-account"><Link className="secondary-button student-exit" href="/student">← Back to my work</Link><span>{user.displayName}</span><SignOutButton /></div></header><main className="student-main">{content}</main></div>;
}
