import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getAppUser,getDatabase } from "@/lib/app-user";
import { getBrandingStorage } from "@/lib/branding-storage";
export async function GET(_request:Request,{params}:{params:Promise<{assetId:string}>}) {
  const user=await getAppUser();
  if(!user || user.status!=="active" || user.role==='student') return new Response(null,{status:403});
  const {assetId}=await params;
  if(!/^[0-9a-f-]{36}$/i.test(assetId)) return new Response(null,{status:404});
  const asset=(await getDatabase().query(`SELECT a.* FROM assets a JOIN question_versions v ON v.id=a.question_version_id
    JOIN questions q ON q.id=v.question_id JOIN set_questions sq ON sq.question_id=q.id JOIN question_sets s ON s.id=sq.set_id
    WHERE a.id=$1 AND a.status='active' AND q.deleted_at IS NULL AND s.deleted_at IS NULL
      AND ($3::boolean OR s.created_by=$2 OR EXISTS(SELECT 1 FROM folder_permissions p WHERE p.folder_id=s.folder_id AND p.user_id=$2 AND (p.can_view OR p.can_edit)))`,[assetId,user.id,user.role==='admin'])).rows[0];
  if(!asset) return new Response(null,{status:404});
  const storage=getBrandingStorage();
  if(!storage) return new Response(null,{status:503});
  try {
    const object=await storage.client.send(new GetObjectCommand({Bucket:storage.bucket,Key:asset.storage_key}));
    const body=await object.Body?.transformToByteArray();
    if(!body) return new Response(null,{status:502});
    return new Response(new Uint8Array(body),{headers:{'Content-Type':asset.mime_type,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
  } catch {return new Response(null,{status:502});}
}
