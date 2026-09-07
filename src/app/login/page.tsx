import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import LoginForm from "@/components/login-form";
import { headers } from "next/headers";
import ThemeToggle from "@/components/theme-toggle";
import { getOrganizationName } from "@/lib/organization";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) redirect("/admin/dashboard");
  const organizationName = await getOrganizationName();
  return <><div className="auth-theme-toggle"><ThemeToggle /></div><LoginForm organizationName={organizationName} /></>;
}
