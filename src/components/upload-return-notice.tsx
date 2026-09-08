"use client";
import Link from 'next/link';
import { useEffect, useState } from 'react';

export const LAST_UPLOAD_KEY = 'qb-last-upload';
type PreviousUpload = { id: string; source_name: string; total_files: number; succeeded_files: number; failed_files: number; status: string };
export default function UploadReturnNotice() {
  const [previous, setPrevious] = useState<PreviousUpload | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    let id: string | null = null;
    try { id = sessionStorage.getItem(LAST_UPLOAD_KEY); } catch { return; }
    if (!id) return;
    fetch(`/api/question-imports/${encodeURIComponent(id)}`, { signal: controller.signal })
      .then(response => response.ok ? response.json() : null)
      .then(result => { if (result) setPrevious(result); })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);
  if (!previous) return null;
  const complete = previous.status === 'completed';
  return <div className={`upload-notice ${complete ? 'complete' : 'attention'}`}>
    <h2>{complete ? 'Your previous upload is complete' : 'Your previous upload needs attention'}</h2>
    <p>{previous.source_name}: {previous.succeeded_files} of {previous.total_files} images uploaded and verified. {previous.failed_files > 0 ? `${previous.failed_files} failed.` : ''}</p>
    {!complete && <p>Some files failed or did not finish. Leaving the upload page stops files that have not been sent; completed images remain saved.</p>}
    <Link href={`/admin/question-bank/imports/${previous.id}`}>Review upload results →</Link>
  </div>;
}
