"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export default function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setWorking(true);
    setError("");
    const data = new FormData(event.currentTarget);
    const username = String(data.get("username") ?? "").trim();
    const password = String(data.get("password") ?? "");

    const result = mode === "signup"
      ? await authClient.signUp.email({
          email: `${username.toLowerCase()}@users.aoma.invalid`,
          username,
          password,
          name: String(data.get("name") ?? "").trim(),
        })
      : await authClient.signIn.username({ username, password, rememberMe: true });

    if (result.error) {
      setError((result.error.message ?? "Unable to continue. Check your details and try again.").replace(/email/gi, "username"));
      setWorking(false);
      return;
    }

    router.replace("/dashboard");
    router.refresh();
  }

  return <main className="auth-page"><section className="auth-card"><div className="auth-brand"><div className="mark"><span>Q</span></div><span><strong>AOMA</strong><small>Question Bank</small></span></div><div className="auth-heading"><h1>{mode === "login" ? "Welcome back" : "Create student account"}</h1><p>{mode === "login" ? "Sign in to continue to your workspace." : "After signing up, join a class with its code. A teacher or administrator approves the request."}</p></div><div className="auth-tabs"><button type="button" className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>Sign in</button><button type="button" className={mode === "signup" ? "active" : ""} onClick={() => setMode("signup")}>Student sign up</button></div><form onSubmit={submit}>{mode === "signup" && <label><span>Full name</span><input name="name" autoComplete="name" required /></label>}<label><span>Username</span><input name="username" type="text" inputMode="text" autoComplete="username" autoCapitalize="none" spellCheck={false} minLength={3} maxLength={30} pattern="[A-Za-z0-9_.]+" required />{mode === "signup" && <small>3–30 characters; letters, numbers, underscores, and periods</small>}</label><label><span>Password</span><input name="password" type="password" minLength={10} autoComplete={mode === "signup" ? "new-password" : "current-password"} required /><small>At least 10 characters</small></label>{error && <p className="auth-error" role="alert">{error}</p>}<button className="primary-button wide" disabled={working}>{working ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}</button></form></section></main>;
}
