"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import JoinClassForm, { type JoinedClass } from "@/components/join-class-form";

type Membership = {
  id: string;
  class_name: string;
  status: "pending" | "active" | "rejected";
  requested_at: Date;
};

export default function AccountSettings({ user, memberships }: {
  user: { displayName: string; username: string; role: string };
  memberships: Membership[];
}) {
  const router = useRouter();
  const [profileMessage, setProfileMessage] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [profileError, setProfileError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [working, setWorking] = useState<"profile" | "password" | null>(null);
  const [membershipItems, setMembershipItems] = useState(memberships);

  function showJoinedClass(joinedClass: JoinedClass) {
    const membership: Membership = {
      id: joinedClass.id,
      class_name: joinedClass.className,
      status: joinedClass.status,
      requested_at: new Date(joinedClass.requestedAt),
    };
    setMembershipItems((current) => [membership, ...current.filter((item) => item.id !== membership.id)]);
  }

  async function updateProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setWorking("profile"); setProfileError(""); setProfileMessage("");
    const name = String(new FormData(event.currentTarget).get("name") ?? "").trim();
    const result = await authClient.updateUser({ name });
    setWorking(null);
    if (result.error) { setProfileError(result.error.message ?? "Unable to update your profile."); return; }
    setProfileMessage("Profile updated.");
    router.refresh();
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setWorking("password"); setPasswordError(""); setPasswordMessage("");
    const form = event.currentTarget;
    const data = new FormData(form);
    const currentPassword = String(data.get("currentPassword") ?? "");
    const newPassword = String(data.get("newPassword") ?? "");
    const confirmPassword = String(data.get("confirmPassword") ?? "");
    if (newPassword !== confirmPassword) { setPasswordError("The new passwords do not match."); setWorking(null); return; }
    const result = await authClient.changePassword({ currentPassword, newPassword, revokeOtherSessions: true });
    setWorking(null);
    if (result.error) { setPasswordError(result.error.message ?? "Unable to change your password."); return; }
    form.reset();
    setPasswordMessage("Password changed. Other signed-in devices have been signed out.");
  }

  return <div className="account-grid">
    <section className="panel account-panel">
      <div className="panel-heading"><div><h2>Profile</h2><p>Your name and account identity</p></div><span className="role-pill">{user.role}</span></div>
      <form onSubmit={updateProfile}><label><span>Username</span><input value={user.username} disabled /><small>Usernames cannot be changed.</small></label><label><span>Full name</span><input name="name" defaultValue={user.displayName} minLength={2} maxLength={100} required /></label>{profileError && <p className="auth-error" role="alert">{profileError}</p>}{profileMessage && <p className="form-success" role="status">{profileMessage}</p>}<button className="primary-button" disabled={working !== null}>{working === "profile" ? "Saving…" : "Save profile"}</button></form>
    </section>
    <section className="panel account-panel">
      <div className="panel-heading"><div><h2>Change password</h2><p>Use at least 10 characters</p></div></div>
      <form onSubmit={changePassword}><label><span>Current password</span><input name="currentPassword" type="password" autoComplete="current-password" required /></label><label><span>New password</span><input name="newPassword" type="password" minLength={10} autoComplete="new-password" required /></label><label><span>Confirm new password</span><input name="confirmPassword" type="password" minLength={10} autoComplete="new-password" required /></label>{passwordError && <p className="auth-error" role="alert">{passwordError}</p>}{passwordMessage && <p className="form-success" role="status">{passwordMessage}</p>}<button className="primary-button" disabled={working !== null}>{working === "password" ? "Changing…" : "Change password"}</button></form>
    </section>
    {user.role === "student" && <section className="account-enrollment"><JoinClassForm onJoined={showJoinedClass} /><section className="panel account-panel membership-panel"><div className="panel-heading"><div><h2>My classes</h2><p>Enrollment requests and approved classes</p></div></div>{membershipItems.length === 0 ? <div className="compact-empty">You have not requested access to a class yet.</div> : <div className="membership-list">{membershipItems.map((membership) => <div key={membership.id}><span><strong>{membership.class_name}</strong><small>Requested {new Date(membership.requested_at).toLocaleDateString()}</small></span><b className={`status-badge ${membership.status}`}>{membership.status}</b></div>)}</div>}</section></section>}
  </div>;
}
