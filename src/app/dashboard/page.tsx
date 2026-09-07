import Workspace from "@/components/workspace";
import { getStaffSummary, requireAppUser } from "@/lib/app-user";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireAppUser();
  if (user.role === "student") redirect("/student");
  const summary = await getStaffSummary(user);
  return <Workspace view="overview" user={user} summary={summary} />;
}
