import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getAppUser,getDatabase } from '@/lib/app-user';
import { getBrandingStorage } from '@/lib/branding-storage';
import { isUuid } from '@/lib/question-bank-model';
export async function GET(_request:Request,{params}:{params:Promise<{assignmentId:string;assetId:string}>}) {
  const user=await getAppUser();
  if(!user || user.status!=='active') return new Response(null,{status:403});
  const {assignmentId,assetId}=await params;
  if(!isUuid(assignmentId)||!isUuid(assetId)) return new Response(null,{status:404});
  const asset=(await getDatabase().query<{storage_key:string;mime_type:string}>(`SELECT asset.storage_key,asset.mime_type FROM assets asset
    JOIN assignment_questions aq ON aq.question_version_id=asset.question_version_id
    JOIN assignments a ON a.id=aq.assignment_id JOIN classes c ON c.id=a.class_id
    WHERE asset.id=$1 AND a.id=$2 AND asset.status='active' AND c.archived_at IS NULL AND ($4::boolean OR EXISTS(
      SELECT 1 FROM class_memberships cm WHERE cm.class_id=c.id AND cm.user_id=$3 AND cm.status='active' AND
      (cm.role='teacher' OR (cm.role='student' AND a.status='open' AND (a.open_at IS NULL OR a.open_at<=now())))))`,[assetId,assignmentId,user.id,user.role==='admin'])).rows[0];
  if(!asset) return new Response(null,{status:404});
  const storage=getBrandingStorage();
  if(!storage) return new Response(null,{status:503});
  try {
    const object=await storage.client.send(new GetObjectCommand({Bucket:storage.bucket,Key:asset.storage_key}));
    const bytes=await object.Body?.transformToByteArray();
    return bytes?new Response(new Uint8Array(bytes),{headers:{'Content-Type':asset.mime_type,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}}):new Response(null,{status:502});
  } catch {return new Response(null,{status:502});}
}
