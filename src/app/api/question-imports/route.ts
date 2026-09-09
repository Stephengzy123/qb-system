import { isUuid } from "@/lib/question-bank-model";
import { getAppUser, getDatabase } from "@/lib/app-user";
import { getBrandingStorage } from "@/lib/branding-storage";
import { MAX_FILES, destinationName, validSourcePath } from "@/lib/upload-validation";

export async function POST(request: Request) {
  const user=await getAppUser();
  if (!user || user.status!=="active" || user.role==="student") return Response.json({error:"Staff access required."},{status:403});
  if (!getBrandingStorage()) return Response.json({error:"R2 storage is not configured."},{status:503});
  const input=await request.json().catch(()=>null);
  let name: string;
  try { name=destinationName(input?.setName); } catch(error) { return Response.json({error:(error as Error).message},{status:400}); }
  if(!isUuid(input?.folderId))return Response.json({error:"Choose an existing destination folder."},{status:400});
  if (!Array.isArray(input?.files) || !input.files.length || input.files.length>MAX_FILES || !input.files.every(validSourcePath) || new Set(input.files).size!==input.files.length || !Number.isInteger(input.choiceCount) || input.choiceCount<2 || input.choiceCount>10) return Response.json({error:"Choose 1–500 unique images and between 2 and 10 choices."},{status:400});
  const client=await getDatabase().connect();
  try {
    await client.query("BEGIN");
    // Coordinate sibling-name checks with folder creation and other imports.
    await client.query("SELECT pg_advisory_xact_lock(418206092)");
    const parent=input.folderId;
    const destination=await client.query(`SELECT f.id FROM folders f WHERE f.id=$1 AND ($3::boolean OR f.created_by=$2 OR EXISTS(SELECT 1 FROM folder_permissions p WHERE p.folder_id=f.id AND p.user_id=$2 AND p.can_upload)) FOR SHARE OF f`,[parent,user.id,user.role==='admin']);
    if(!destination.rowCount)throw new Error("FOLDER_FORBIDDEN");
    if((await client.query("SELECT 1 FROM question_sets WHERE folder_id=$1 AND lower(btrim(name))=lower($2) AND deleted_at IS NULL",[parent,name])).rowCount) {
      await client.query("ROLLBACK"); return Response.json({error:"A set with this name already exists in this folder. Choose another set name."},{status:409});
    }
    const set=(await client.query("INSERT INTO question_sets(folder_id,name,created_by) VALUES($1,$2,$3) RETURNING id",[parent,name,user.id])).rows[0];
    const job=(await client.query("INSERT INTO imports(set_id,source_name,total_files,created_by,choice_count,status) VALUES($1,$2,$3,$4,$5,'uploading') RETURNING id",[set.id,name,input.files.length,user.id,input.choiceCount])).rows[0];
    const files=[];
    for(const [position,source] of input.files.entries()) files.push((await client.query("INSERT INTO import_files(import_id,source_path,status,position) VALUES($1,$2,'pending',$3) RETURNING id,source_path",[job.id,source,position])).rows[0]);
    await client.query("INSERT INTO audit_logs(actor_user_id,action,entity_type,entity_id) VALUES($1,'question_import.created','import',$2)",[user.id,job.id]);
    await client.query("COMMIT");
    return Response.json({id:job.id,files});
  } catch(error) { await client.query("ROLLBACK"); if(error instanceof Error && error.message==="FOLDER_FORBIDDEN") return Response.json({error:"You do not have upload access to this folder."},{status:403}); console.error("Create import failed",error); return Response.json({error:"Could not create the import. Please try again."},{status:500}); }
  finally {client.release();}
}
