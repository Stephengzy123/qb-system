import { getDatabase, type AppUser } from "@/lib/app-user";
export const folderTree = `WITH RECURSIVE tree AS (
  SELECT id, parent_folder_id, name, created_by, name::text AS path FROM folders WHERE parent_folder_id IS NULL
  UNION ALL SELECT f.id, f.parent_folder_id, f.name, f.created_by, tree.path || ' / ' || f.name FROM folders f JOIN tree ON f.parent_folder_id = tree.id
)`;
export async function listUploadFolders(user: AppUser) {
  return (await getDatabase().query<{path:string}>(`${folderTree} SELECT path FROM tree WHERE $2::boolean OR created_by=$1 OR EXISTS (SELECT 1 FROM folder_permissions p WHERE p.folder_id=tree.id AND p.user_id=$1 AND p.can_upload) ORDER BY path`, [user.id,user.role==='admin'])).rows;
}
export async function listQuestionSets(user: AppUser) {
  return (await getDatabase().query<{id:string;name:string;path:string;count:number;import_id:string}>(`${folderTree} SELECT s.id,s.name,tree.path,count(sq.id)::int AS count,(SELECT id FROM imports WHERE set_id=s.id ORDER BY created_at DESC LIMIT 1) AS import_id FROM question_sets s JOIN tree ON tree.id=s.folder_id LEFT JOIN set_questions sq ON sq.set_id=s.id WHERE s.deleted_at IS NULL AND ($2::boolean OR s.created_by=$1 OR EXISTS (SELECT 1 FROM folder_permissions p WHERE p.folder_id=s.folder_id AND p.user_id=$1 AND p.can_view)) GROUP BY s.id,tree.path ORDER BY s.created_at DESC`,[user.id,user.role==='admin'])).rows;
}
export async function getImport(user: AppUser, id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const result=await getDatabase().query(`${folderTree} SELECT i.*,s.name,tree.path FROM imports i JOIN question_sets s ON s.id=i.set_id JOIN tree ON tree.id=s.folder_id WHERE i.id=$1 AND ($3::boolean OR i.created_by=$2 OR EXISTS (SELECT 1 FROM folder_permissions p WHERE p.folder_id=s.folder_id AND p.user_id=$2 AND p.can_view))`,[id,user.id,user.role==='admin']);
  if (!result.rowCount) return null;
  const files=await getDatabase().query("SELECT id,source_path,status,failure_reason,asset_id FROM import_files WHERE import_id=$1 ORDER BY position",[id]);
  return {...result.rows[0], files:files.rows};
}
