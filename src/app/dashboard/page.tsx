import Workspace from "@/components/workspace";
import { getStaffSummary, requireAppUser } from "@/lib/app-user";
import { redirect } from "next/navigation";
import { getOrganizationName } from "@/lib/organization";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireAppUser();
  if (user.role === "student") redirect("/student");
  const [summary, organizationName] = await Promise.all([getStaffSummary(user), getOrganizationName()]);
  return <Workspace view="overview" user={user} organizationName={organizationName} summary={summary} />;
}
