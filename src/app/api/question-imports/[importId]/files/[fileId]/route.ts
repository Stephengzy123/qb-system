import { getAppUser, getDatabase } from "@/lib/app-user";
import { imageType, MAX_IMAGE_BYTES } from "@/lib/upload-validation";
import { storeVerifiedImage } from "@/lib/question-storage";

export const maxDuration=60;
export async function POST(request:Request,{params}:{params:Promise<{importId:string;fileId:string}>}) {
  const user=await getAppUser();
  if(!user || user.status!=="active" || user.role==="student") return Response.json({error:"Staff access required."},{status:403});
  const {importId,fileId}=await params;
  if(![importId,fileId].every(id=>/^[0-9a-f-]{36}$/i.test(id))) return Response.json({error:"Invalid import."},{status:400});
  const client=await getDatabase().connect();
  try {
    await client.query("BEGIN");
    const job=(await client.query("SELECT * FROM imports WHERE id=$1 AND created_by=$2 FOR UPDATE",[importId,user.id])).rows[0];
    const file=(await client.query("SELECT * FROM import_files WHERE id=$1 AND import_id=$2",[fileId,importId])).rows[0];
    if(!job || !file) {await client.query("ROLLBACK"); return Response.json({error:"Import not found."},{status:404});}
    if(file.status==='succeeded') {await client.query("COMMIT");return Response.json({status:"succeeded",assetId:file.asset_id});}
    await client.query("SAVEPOINT file_upload");
    let errorMessage:string|null=null;
    let assetId:string|null=null;
    try {
      if(Number(request.headers.get('content-length')??0)>MAX_IMAGE_BYTES+65536) throw new Error("Image exceeds the 4 MB limit.");
      const form=await request.formData();
      const image=form.get('file');
      if(!(image instanceof File) || !image.size || image.size>MAX_IMAGE_BYTES) throw new Error("Choose a nonempty image up to 4 MB.");
      const bytes=Buffer.from(await image.arrayBuffer());
      const mime=imageType(bytes);
      if(!mime) throw new Error("The file is not a PNG, JPEG, or WebP image.");
      const key=`question-imports/${importId}/${fileId}`;
      let checksum:string;
      try {checksum=await storeVerifiedImage(key,bytes,mime);} catch(error) {console.error("R2 upload verification failed",error);throw new Error("Upload to R2 could not be verified. Retry this file.");}
      const question=(await client.query("INSERT INTO questions(created_by) VALUES($1) RETURNING id",[user.id])).rows[0];
      const version=(await client.query("INSERT INTO question_versions(question_id,version_number,choice_count,alt_text,created_by) VALUES($1,1,$2,$3,$4) RETURNING id",[question.id,job.choice_count,file.source_path,user.id])).rows[0];
      for(let i=0;i<job.choice_count;i++) await client.query("INSERT INTO question_choices(question_version_id,display_order,display_label) VALUES($1,$2,$3)",[version.id,i,String.fromCharCode(65+i)]);
      await client.query("UPDATE questions SET current_version_id=$2 WHERE id=$1",[question.id,version.id]);
      assetId=(await client.query("INSERT INTO assets(question_version_id,storage_key,mime_type,byte_size,checksum_sha256,status) VALUES($1,$2,$3,$4,$5,'active') RETURNING id",[version.id,key,mime,bytes.length,checksum])).rows[0].id;
      await client.query("INSERT INTO set_questions(set_id,question_id,position) VALUES($1,$2,$3)",[job.set_id,question.id,file.position]);
    } catch(error) {
      await client.query("ROLLBACK TO SAVEPOINT file_upload");
      errorMessage=error instanceof Error?error.message:"Could not upload this image.";
      if(!/^(Image exceeds|Choose a nonempty|The file is not|Upload to R2)/.test(errorMessage)) {console.error("Import file failed",error);errorMessage="The image could not be saved. Retry this file.";}
    }
    await client.query("UPDATE import_files SET status=$2,failure_reason=$3,asset_id=$4,updated_at=now() WHERE id=$1",[fileId,errorMessage?'failed':'succeeded',errorMessage,errorMessage?null:assetId]);
    await client.query(`UPDATE imports SET succeeded_files=c.ok,failed_files=c.failed,status=CASE WHEN c.pending>0 THEN 'uploading'::import_status WHEN c.failed=0 THEN 'completed'::import_status WHEN c.ok=0 THEN 'failed'::import_status ELSE 'completed_with_errors'::import_status END,updated_at=now() FROM (SELECT count(*) FILTER(WHERE status='succeeded')::int ok,count(*) FILTER(WHERE status='failed')::int failed,count(*) FILTER(WHERE status='pending')::int pending FROM import_files WHERE import_id=$1) c WHERE id=$1`,[importId]);
    await client.query("COMMIT");
    return Response.json(errorMessage?{error:errorMessage,status:'failed'}:{status:'succeeded',assetId},{status:errorMessage?422:200});
  } catch(error) {await client.query("ROLLBACK");console.error("Import request failed",error);return Response.json({error:"Upload interrupted. Retry to check or complete this file."},{status:500});}
  finally {client.release();}
}
