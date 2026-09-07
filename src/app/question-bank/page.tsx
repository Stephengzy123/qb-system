import Workspace from "@/components/workspace";
import { requireAppUser } from "@/lib/app-user";
import { getOrganizationName } from "@/lib/organization";

export const dynamic = "force-dynamic";

export default async function QuestionBankPage() {
  const user = await requireAppUser({ staff: true });
  const organizationName = await getOrganizationName();
  return <Workspace view="library" user={user} organizationName={organizationName} />;
}
