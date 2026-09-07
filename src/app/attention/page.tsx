import Link from "next/link";
import Workspace from "@/components/workspace";
import AttentionQueue from "@/components/attention-queue";
import { getAttentionQueue, requireAppUser } from "@/lib/app-user";

export const dynamic = "force-dynamic";

export default async function AttentionPage() {
  const user = await requireAppUser({ staff: true });
  const queue = await getAttentionQueue(user);
  return <Workspace view="overview" user={user}><header className="page-header compact"><div><p className="eyebrow">REVIEW QUEUE</p><h1>Items needing attention</h1><p className="lede">Resolve pending requests within your authorized scope.</p></div><Link className="secondary-button" href="/dashboard">Back to dashboard</Link></header><AttentionQueue {...queue} /></Workspace>;
}
