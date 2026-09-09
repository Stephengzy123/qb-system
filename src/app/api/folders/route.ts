import {getAppUser,getDatabase} from '@/lib/app-user';
import {isUuid} from '@/lib/question-bank-model';
import {destinationName} from '@/lib/upload-validation';
export async function POST(request:Request) {
  const user=await getAppUser();
  if(!user || user.status!=='active' || user.role==='student')return Response.json({error:'Staff access required.'},{status:403});
  const input=await request.json().catch(()=>null);let name:string;
  try{name=destinationName(input?.name);}catch(error){return Response.json({error:(error as Error).message},{status:400});}
  if(input.parentId!==null&&!isUuid(input.parentId))return Response.json({error:'Choose an existing parent folder.'},{status:400});
  const client=await getDatabase().connect();
  try {
    await client.query('BEGIN');await client.query('SELECT pg_advisory_xact_lock(418206092)');
    if(input.parentId!==null) {
      const parent=await client.query(`SELECT f.id FROM folders f WHERE f.id=$1 AND ($3::boolean OR f.created_by=$2 OR EXISTS(SELECT 1 FROM folder_permissions p WHERE p.folder_id=f.id AND p.user_id=$2 AND p.can_upload)) FOR SHARE OF f`,[input.parentId,user.id,user.role==='admin']);
      if(!parent.rowCount){await client.query('ROLLBACK');return Response.json({error:'You do not have permission to create folders here.'},{status:403});}
    }
    const duplicate=await client.query('SELECT 1 FROM folders WHERE parent_folder_id IS NOT DISTINCT FROM $1::uuid AND lower(btrim(name))=lower($2)',[input.parentId,name]);
    if(duplicate.rowCount){await client.query('ROLLBACK');return Response.json({error:'A folder with this name already exists here. Select the existing folder.'},{status:409});}
    const folder=(await client.query(`INSERT INTO folders(parent_folder_id,name,created_by) VALUES($1,$2,$3) RETURNING id,parent_folder_id,name,true AS can_upload`,[input.parentId,name,user.id])).rows[0];
    await client.query("INSERT INTO audit_logs(actor_user_id,action,entity_type,entity_id) VALUES($1,'folder.created','folder',$2)",[user.id,folder.id]);
    await client.query('COMMIT');return Response.json({folder},{status:201});
  }catch(error){await client.query('ROLLBACK');console.error('Create folder failed',error);return Response.json({error:'Could not create the folder. Please retry.'},{status:500});}
  finally{client.release();}
}
