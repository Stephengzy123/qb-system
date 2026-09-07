import { redirect } from "next/navigation";

export default function LegacyImportsPage() {
  redirect("/admin/audit-logs/imports");
}
