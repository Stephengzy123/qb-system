import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import LoginForm from "@/components/login-form";
import { headers } from "next/headers";
import ThemeToggle from "@/components/theme-toggle";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) redirect("/dashboard");
  return <><div className="auth-theme-toggle"><ThemeToggle /></div><LoginForm /></>;
}
