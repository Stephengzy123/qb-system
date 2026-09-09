import { getDatabase, type AppUser } from '@/lib/app-user';
import { folderTree, listUploadFolders } from '@/lib/question-imports';
import { isUuid, type BankSet, type SetQuestion } from '@/lib/question-bank-model';

export async function getFolderBrowser(user: AppUser) {
  const database = getDatabase();
  const args = [user.id, user.role === 'admin'];
  const folders = await listUploadFolders(user);
  const sets = await database.query<BankSet>(`${folderTree}
    SELECT s.id,s.folder_id,s.name,s.status,tree.path,count(sq.id)::int AS count,
      count(a.set_question_id)::int AS answered,
      (SELECT id FROM imports WHERE set_id=s.id ORDER BY created_at DESC LIMIT 1) AS import_id
    FROM question_sets s JOIN tree ON tree.id=s.folder_id
    LEFT JOIN set_questions sq ON sq.set_id=s.id
    LEFT JOIN questions q ON q.id=sq.question_id
    LEFT JOIN question_set_answers a ON a.set_question_id=sq.id AND a.question_version_id=q.current_version_id
    WHERE s.deleted_at IS NULL AND ($2::boolean OR s.created_by=$1 OR EXISTS (
      SELECT 1 FROM folder_permissions p WHERE p.folder_id=s.folder_id AND p.user_id=$1 AND (p.can_view OR p.can_edit)))
    GROUP BY s.id,tree.path ORDER BY s.name`, args);
  return { folders, sets: sets.rows };
}

export async function getQuestionSet(user: AppUser, id: string) {
  if (!isUuid(id)) return null;
  const database = getDatabase();
  const result = await database.query<{ id: string; name: string; folder_id: string; path: string; status: string; can_edit: boolean; import_id: string | null }>(`${folderTree}
    SELECT s.id,s.name,s.folder_id,s.status,tree.path,
      ($3::boolean OR s.created_by=$2 OR EXISTS(SELECT 1 FROM folder_permissions p WHERE p.folder_id=s.folder_id AND p.user_id=$2 AND p.can_edit)) AS can_edit,
      (SELECT id FROM imports WHERE set_id=s.id ORDER BY created_at DESC LIMIT 1) AS import_id
    FROM question_sets s JOIN tree ON tree.id=s.folder_id
    WHERE s.id=$1 AND s.deleted_at IS NULL AND ($3::boolean OR s.created_by=$2 OR EXISTS (
      SELECT 1 FROM folder_permissions p WHERE p.folder_id=s.folder_id AND p.user_id=$2 AND (p.can_view OR p.can_edit)))`, [id, user.id, user.role === 'admin']);
  if (!result.rowCount) return null;
  const questions = await database.query<SetQuestion>(`SELECT sq.id,sq.position,v.id AS version_id,
      COALESCE(v.alt_text,'Question ' || (sq.position+1)) AS name,
      (SELECT id FROM assets WHERE question_version_id=v.id AND status='active' ORDER BY created_at LIMIT 1) AS asset_id,
      a.correct_choice_id,
      COALESCE((SELECT json_agg(json_build_object('id',c.id,'label',c.display_label) ORDER BY c.display_order) FROM question_choices c WHERE c.question_version_id=v.id),'[]'::json) AS choices
    FROM set_questions sq JOIN questions q ON q.id=sq.question_id
    JOIN question_versions v ON v.id=q.current_version_id
    LEFT JOIN question_set_answers a ON a.set_question_id=sq.id AND a.question_version_id=v.id
    WHERE sq.set_id=$1 AND q.deleted_at IS NULL ORDER BY sq.position`, [id]);
  return { ...result.rows[0], questions: questions.rows };
}
