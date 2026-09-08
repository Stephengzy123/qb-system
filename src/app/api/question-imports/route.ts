import type { QueryResult } from "pg";
import { NextResponse } from "next/server";
import { getAppUser, getDatabase } from "@/lib/app-user";
import { getBrandingStorage } from "@/lib/branding-storage";
import { MAX_FILES, pathParts, validSourcePath } from "@/lib/upload-validation";

export async function POST(request: Request) {
  const user=await getAppUser();
  if (!user || user.status!=="active" || user.role==="student") return NextResponse.json({error:"Staff access required."},{status:403});
  if (!getBrandingStorage()) return NextResponse.json({error:"R2 storage is not configured."},{status:503});
  const input=await request.json().catch(()=>null);
  let parts: string[];
  try { parts=pathParts(input?.path); } catch(error) { return NextResponse.json({error:(error as Error).message},{status:400}); }
  if (!Array.isArray(input?.files) || !input.files.length || input.files.length>MAX_FILES || !input.files.every(validSourcePath) || new Set(input.files).size!==input.files.length || !Number.isInteger(input.choiceCount) || input.choiceCount<2 || input.choiceCount>10) return NextResponse.json({error:"Choose 1–500 unique images and between 2 and 10 choices."},{status:400});
  const client=await getDatabase().connect();
  try {
    await client.query("BEGIN");
    // Serialize destination creation, including roots whose parent is NULL.
    await client.query("SELECT pg_advisory_xact_lock(418206092)");
    async function canUpload(folderId:string) {
      return user!.role==='admin' || Boolean((await client.query("SELECT 1 FROM folders f WHERE f.id=$1 AND (f.created_by=$2 OR EXISTS(SELECT 1 FROM folder_permissions p WHERE p.folder_id=f.id AND p.user_id=$2 AND p.can_upload))",[folderId,user!.id])).rowCount);
    }
    let parent:string|null=null;
    for(const name of parts.slice(0,-1)) {
      const existing: QueryResult<{id:string;created_by:string}>=await client.query<{id:string;created_by:string}>("SELECT id,created_by FROM folders WHERE parent_folder_id IS NOT DISTINCT FROM $1::uuid AND name=$2",[parent,name]);
      if(existing.rowCount) {
        parent=existing.rows[0].id;
      } else {
        if(parent && !await canUpload(parent)) throw new Error("FOLDER_FORBIDDEN");
        parent=(await client.query("INSERT INTO folders(parent_folder_id,name,created_by) VALUES($1,$2,$3) RETURNING id",[parent,name,user.id])).rows[0].id;
      }
    }
    if(parent && !await canUpload(parent)) throw new Error("FOLDER_FORBIDDEN");
    const name=parts.at(-1)!;
    if((await client.query("SELECT 1 FROM question_sets WHERE folder_id=$1 AND name=$2 AND deleted_at IS NULL",[parent,name])).rowCount) {
      await client.query("ROLLBACK"); return NextResponse.json({error:"A set already exists at this path. Choose another set name."},{status:409});
    }
    const set=(await client.query("INSERT INTO question_sets(folder_id,name,created_by) VALUES($1,$2,$3) RETURNING id",[parent,name,user.id])).rows[0];
    const job=(await client.query("INSERT INTO imports(set_id,source_name,total_files,created_by,choice_count,status) VALUES($1,$2,$3,$4,$5,'uploading') RETURNING id",[set.id,name,input.files.length,user.id,input.choiceCount])).rows[0];
    const files=[];
    for(const [position,source] of input.files.entries()) files.push((await client.query("INSERT INTO import_files(import_id,source_path,status,position) VALUES($1,$2,'pending',$3) RETURNING id,source_path",[job.id,source,position])).rows[0]);
    await client.query("INSERT INTO audit_logs(actor_user_id,action,entity_type,entity_id) VALUES($1,'question_import.created','import',$2)",[user.id,job.id]);
    await client.query("COMMIT");
    return NextResponse.json({id:job.id,files});
  } catch(error) { await client.query("ROLLBACK"); if(error instanceof Error && error.message==="FOLDER_FORBIDDEN") return NextResponse.json({error:"You do not have upload access to this folder path."},{status:403}); console.error("Create import failed",error); return NextResponse.json({error:"Could not create the import. Please try again."},{status:500}); }
  finally {client.release();}
}
