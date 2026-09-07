import Link from "next/link";
import Workspace from "@/components/workspace";
import { requireAppUser } from "@/lib/app-user";

export const dynamic = "force-dynamic";

export default async function UploadQuestionSetPage() {
  const user = await requireAppUser({ staff: true });
  return <Workspace view="library" user={user}>
    <header className="page-header compact"><div><p className="eyebrow">QUESTION BANK</p><h1>Upload a set</h1><p className="lede">Add naturally numbered question images from a ZIP or file selection.</p></div><Link className="secondary-button" href="/question-bank">Cancel</Link></header>
    <section className="panel upload-panel">
      <div className="upload-dropzone"><span>↑</span><h2>Choose question images</h2><p>Select PNG, JPEG, or WebP images, or one ZIP archive. Files are ordered using natural-number sorting.</p><input aria-label="Choose question images or ZIP" type="file" accept="image/png,image/jpeg,image/webp,.zip,application/zip" multiple /></div>
      <aside><h2>Before uploading</h2><ul><li>Each image should contain one complete MCQ and its choices.</li><li>Use filenames such as 1.png, 2.png, or Question10.png.</li><li>Choice counts are configured after the files are imported.</li></ul><Link href="/audit-logs/imports">View import history →</Link></aside>
    </section>
  </Workspace>;
}
