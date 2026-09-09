import AccountSettings from "@/components/account-settings";
import { AppearanceShell } from "@/components/admin-appearance";
export default async function Page({params}: {params: Promise<{role: string; tab?: string[]}>}) {
  const {role, tab} = await params;
  const selected = tab?.[0] === "security" ? "security" : tab?.[0] === "profile" ? "profile" : "appearance";
  const content = <main style={{padding:24,width:"100%"}}><AccountSettings user={{role,displayName:"Test User",username:"test"}} memberships={[]} tab={selected} /></main>;
  return role === "admin" ? <AppearanceShell admin>{content}</AppearanceShell> : <div className="student-shell">{content}</div>;
}
