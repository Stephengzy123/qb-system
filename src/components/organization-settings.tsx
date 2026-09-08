"use client";

/* eslint-disable @next/next/no-img-element -- local preview of an already-normalized branding asset */

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

const MAX_SOURCE_BYTES = 5 * 1024 * 1024;
const MAX_SOURCE_PIXELS = 40_000_000;

function canvasBlob(canvas: HTMLCanvasElement, type: "image/webp" | "image/png") {
  return new Promise<Blob>((resolve, reject) => canvas.toBlob(
    (blob) => blob ? resolve(blob) : reject(new Error("This browser could not format the image.")),
    type,
    0.88,
  ));
}

async function formatImage(file: File, size: number, fit: "contain" | "cover", type: "image/webp" | "image/png") {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    if (!image.naturalWidth || !image.naturalHeight || image.naturalWidth * image.naturalHeight > MAX_SOURCE_PIXELS) throw new Error("Use an image smaller than 40 megapixels.");
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("This browser could not format the image.");
    const scale = fit === "cover" ? Math.max(size / image.naturalWidth, size / image.naturalHeight) : Math.min((size * 0.84) / image.naturalWidth, (size * 0.84) / image.naturalHeight);
    const width = image.naturalWidth * scale;
    const height = image.naturalHeight * scale;
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(image, (size - width) / 2, (size - height) / 2, width, height);
    return canvasBlob(canvas, type);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function OrganizationSettings({ name, hasCustomLogo, logoVersion }: { name: string; hasCustomLogo: boolean; logoVersion: number }) {
  const router = useRouter();
  const [currentName, setCurrentName] = useState(name);
  const [working, setWorking] = useState<"name" | "logo" | "remove" | "">("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [customLogo, setCustomLogo] = useState(hasCustomLogo);
  const [logoUrl, setLogoUrl] = useState(`/api/branding/logo?v=${logoVersion}`);

  function resetFeedback() { setMessage(""); setError(""); }

  async function saveName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setWorking("name"); resetFeedback();
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/organization", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: String(data.get("name") ?? "").trim() }) });
    const result = await response.json();
    setWorking("");
    if (!response.ok) return setError(result.error ?? "Unable to rename the organization.");
    setCurrentName(result.name); setMessage("Organization name updated."); router.refresh();
  }

  async function uploadLogo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); resetFeedback();
    const input = event.currentTarget.elements.namedItem("source") as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return setError("Choose an image first.");
    if (file.size > MAX_SOURCE_BYTES) return setError("Choose an image no larger than 5 MB.");
    if (!new Set(["image/png", "image/jpeg", "image/webp"]).has(file.type)) return setError("Use a PNG, JPEG, or WebP image.");
    setWorking("logo");
    try {
      const [logo, favicon] = await Promise.all([formatImage(file, 512, "contain", "image/webp"), formatImage(file, 64, "contain", "image/png")]);
      const data = new FormData(); data.set("logo", logo, "logo.webp"); data.set("favicon", favicon, "favicon.png");
      const response = await fetch("/api/admin/organization/logo", { method: "POST", body: data });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Unable to upload the logo.");
      setLogoUrl(result.logoUrl); setCustomLogo(true); setMessage("Logo and favicon updated."); input.value = ""; router.refresh();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Unable to upload the logo.");
    } finally { setWorking(""); }
  }

  async function removeLogo() {
    setWorking("remove"); resetFeedback();
    try {
      const response = await fetch("/api/admin/organization/logo", { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Unable to remove the logo.");
      setLogoUrl(result.logoUrl); setCustomLogo(false); setMessage("Custom branding removed."); router.refresh();
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "Unable to remove the logo.");
    } finally { setWorking(""); }
  }

  return <section className="panel organization-settings">
    <div className="panel-heading"><div><h2>Organization branding</h2><p>This name and image appear throughout the administrator and student workspaces.</p></div></div>
    <form className="organization-name-form" onSubmit={saveName}><label><span>Organization name</span><input name="name" key={currentName} defaultValue={currentName} maxLength={120} required /></label><button className="primary-button" disabled={Boolean(working)}>{working === "name" ? "Saving…" : "Save name"}</button></form>
    <div className="branding-divider" />
    <div className="branding-editor"><img className="branding-preview" src={logoUrl} alt="Current organization logo" /><div><h3>Logo and favicon</h3><p>PNG, JPEG, or WebP. A square image of at least 512 × 512 px works best. Maximum source size: 5 MB.</p><small>We automatically create a compressed 512 × 512 WebP logo and a 64 × 64 PNG favicon. Only their storage keys and size are kept in the database.</small></div></div>
    <form className="branding-upload-form" onSubmit={uploadLogo}><input name="source" type="file" accept="image/png,image/jpeg,image/webp" disabled={Boolean(working)} /><button className="primary-button" disabled={Boolean(working)}>{working === "logo" ? "Formatting and uploading…" : customLogo ? "Replace image" : "Upload image"}</button>{customLogo && <button className="secondary-button" type="button" disabled={Boolean(working)} onClick={removeLogo}>{working === "remove" ? "Removing…" : "Remove custom image"}</button>}</form>
    {message && <p className="form-success" role="status">{message}</p>}
    {error && <p className="auth-error" role="alert">{error}</p>}
  </section>;
}
