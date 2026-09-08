/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { notFound } from "next/navigation";
import Workspace from "@/components/workspace";
import { requireAppUser } from "@/lib/app-user";
import { getOrganizationName } from "@/lib/organization";
import { getImport } from "@/lib/question-imports";
export const dynamic='force-dynamic';
export default async function ImportReview({params}:{params:Promise<{importId:string}>}) {
  const user=await requireAppUser({staff:true});
  const job=await getImport(user,(await params).importId);
  if(!job) notFound();
  return <Workspace view="library" user={user} organizationName={await getOrganizationName()}>
    <header className="page-header compact"><div><p className="eyebrow">SAVED UPLOAD REVIEW</p><h1>{job.name}</h1><p className="lede">{job.path} / {job.name}</p></div><Link className="secondary-button" href="/admin/question-bank">Question bank</Link></header>
    <section className="panel question-upload"><Link className="primary-button" href={`/admin/question-bank/sets/${job.set_id}`}>Open set and assign correct choices</Link><h2>{job.succeeded_files} of {job.total_files} images verified in R2</h2><p>Draft set · {job.choice_count} choices per question · {job.status.replaceAll('_',' ')}</p>
    {job.status==='completed' && <p className="upload-success">Upload complete. All images have been uploaded and verified. It is safe to leave this page.</p>}
    {(job.failed_files>0||job.status==='uploading') && <p className="upload-warning">Some files failed or have not finished uploading. Retry from the original upload tab while it is open. Successful images are saved.</p>}
    <div className="upload-review-grid">{job.files.map((file:{id:string;source_path:string;status:string;failure_reason:string|null;asset_id:string|null})=><article className="upload-review-card" key={file.id}>
      {file.asset_id && <a href={`/api/question-assets/${file.asset_id}`} target="_blank" rel="noreferrer"><img src={`/api/question-assets/${file.asset_id}`} alt={file.source_path} loading="lazy" /></a>}
      <strong>{file.source_path}</strong><p>{file.status==='succeeded'?'✓ Verified in R2':file.status}</p>{file.failure_reason && <p className="upload-warning">{file.failure_reason}</p>}
    </article>)}</div></section>
  </Workspace>;
}
