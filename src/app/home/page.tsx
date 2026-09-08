import { redirect } from "next/navigation";
import { requireAppUser } from "@/lib/app-user";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await requireAppUser();
  redirect(user.role === "student" ? "/student" : "/admin/dashboard");
}
