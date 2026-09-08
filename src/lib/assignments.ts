import { assignmentReadAccess } from '@/lib/assignment-access';
import { getDatabase, type AppUser } from '@/lib/app-user';
import { folderTree } from '@/lib/question-imports';
import { isUuid } from '@/lib/question-bank-model';
export type AssignableSet = { id:string; name:string; path:string; count:number; answered:number; importing:boolean };
export type AssignmentListItem = { id:string; title:string; class_id:string; class_name:string; status:string; due_at:Date|null; questions:number; submitted:number; students:number };
export async function listAssignableSets(user:AppUser) {
  return (await getDatabase().query<AssignableSet>(`${folderTree} SELECT s.id,s.name,tree.path,
    count(sq.id)::int AS count,count(ans.set_question_id)::int AS answered,
    EXISTS(SELECT 1 FROM imports i WHERE i.set_id=s.id AND i.status IN ('uploading','processing','pending')) AS importing
    FROM question_sets s JOIN tree ON tree.id=s.folder_id
    LEFT JOIN (set_questions sq JOIN questions q ON q.id=sq.question_id AND q.deleted_at IS NULL
      JOIN question_versions v ON v.id=q.current_version_id) ON sq.set_id=s.id
      AND EXISTS(SELECT 1 FROM assets a WHERE a.question_version_id=v.id AND a.status='active')
    LEFT JOIN question_set_answers ans ON ans.set_question_id=sq.id AND ans.question_version_id=v.id
    WHERE s.deleted_at IS NULL AND s.status<>'archived' AND ($2::boolean OR s.created_by=$1 OR EXISTS(
      SELECT 1 FROM folder_permissions p WHERE p.folder_id=s.folder_id AND p.user_id=$1 AND (p.can_view OR p.can_edit)))
    GROUP BY s.id,tree.path ORDER BY tree.path,s.name`,[user.id,user.role==='admin'])).rows;
}
export async function listAssignments(user:AppUser, classId:string|null=null) {
  return (await getDatabase().query<AssignmentListItem>(`SELECT a.id,a.title,a.class_id,c.name AS class_name,a.status,a.due_at,
    (SELECT count(*)::int FROM assignment_questions aq WHERE aq.assignment_id=a.id) AS questions,
    (SELECT count(*)::int FROM student_assignments sa WHERE sa.assignment_id=a.id AND sa.status='submitted') AS submitted,
    (SELECT count(*)::int FROM class_memberships cm WHERE cm.class_id=c.id AND cm.role='student' AND cm.status='active') AS students
    FROM assignments a JOIN classes c ON c.id=a.class_id WHERE c.archived_at IS NULL
    AND ($3::uuid IS NULL OR c.id=$3) AND ($2::boolean OR EXISTS(SELECT 1 FROM class_memberships cm WHERE cm.class_id=c.id AND cm.user_id=$1 AND cm.role='teacher' AND cm.status='active'))
    ORDER BY a.created_at DESC`,[user.id,user.role==='admin',classId])).rows;
}
export async function getAssignment(user:AppUser,id:string) {
  if (!isUuid(id)) return null;
  const database=getDatabase();
  const result=await database.query<{id:string;title:string;instructions:string|null;class_name:string;status:string;due_at:Date|null;practice_student_id:string|null}>(`SELECT a.id,a.title,a.instructions,COALESCE(c.name,'Personal practice') AS class_name,a.status,a.due_at,a.practice_student_id FROM assignments a LEFT JOIN classes c ON c.id=a.class_id
    WHERE a.id=$1 AND ${assignmentReadAccess('$2','$3')}`,[id,user.id,user.role==='admin']);
  if (!result.rowCount) return null;
  const questions=await database.query<{id:string;version_id:string;name:string;asset_id:string|null;choices:{id:string;label:string}[]}>(`SELECT aq.id,aq.question_version_id AS version_id,COALESCE(v.alt_text,'Question '||(aq.position+1)) AS name,
    (SELECT id FROM assets WHERE question_version_id=v.id AND status='active' ORDER BY created_at LIMIT 1) AS asset_id,
    COALESCE((SELECT json_agg(json_build_object('id',id,'label',display_label) ORDER BY display_order) FROM question_choices WHERE question_version_id=v.id),'[]'::json) AS choices
    FROM assignment_questions aq JOIN question_versions v ON v.id=aq.question_version_id WHERE aq.assignment_id=$1 ORDER BY aq.position`,[id]);
  return {...result.rows[0],questions:questions.rows};
}
