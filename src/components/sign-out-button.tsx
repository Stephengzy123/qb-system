"use client";

import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export default function SignOutButton() {
  const router = useRouter();
  return <button className="profile-menu-button" onClick={async () => {
    await authClient.signOut();
    router.replace("/login");
    router.refresh();
  }}>Sign out</button>;
}
