import { redirect } from "next/navigation";
import { requireAppUser } from "@/lib/app-user";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await requireAppUser();
  redirect(user.role === "student" ? "/student/account" : "/admin/account");
}
