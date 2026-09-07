import { notFound } from "next/navigation";
import ClassDetail from "@/components/class-detail";
import Workspace from "@/components/workspace";
import { requireAppUser } from "@/lib/app-user";
import { getClassDetail } from "@/lib/classes";
import { getOrganizationName } from "@/lib/organization";

export const dynamic = "force-dynamic";

export default async function ClassPage({ params }: PageProps<"/classes/[classId]">) {
  const user = await requireAppUser({ staff: true });
  const { classId } = await params;
  const [detail, organizationName] = await Promise.all([getClassDetail(user, classId), getOrganizationName()]);
  if (!detail) notFound();
  return <Workspace view="classes" user={user} organizationName={organizationName}><ClassDetail {...detail} /></Workspace>;
}
