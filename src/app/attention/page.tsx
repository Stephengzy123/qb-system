import Link from "next/link";
import Workspace from "@/components/workspace";
import AttentionQueue from "@/components/attention-queue";
import { getAttentionQueue, requireAppUser } from "@/lib/app-user";
import { getOrganizationName } from "@/lib/organization";

export const dynamic = "force-dynamic";

export default async function AttentionPage() {
  const user = await requireAppUser({ staff: true });
  const [queue, organizationName] = await Promise.all([getAttentionQueue(user), getOrganizationName()]);
  return <Workspace view="overview" user={user} organizationName={organizationName}><header className="page-header compact"><div><p className="eyebrow">REVIEW QUEUE</p><h1>Items needing attention</h1><p className="lede">Resolve pending requests within your authorized scope.</p></div><Link className="secondary-button" href="/admin/dashboard">Back to dashboard</Link></header><AttentionQueue {...queue} /></Workspace>;
}
