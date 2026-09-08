import { assignmentReadAccess } from '@/lib/assignment-access';
import { CLOUD_SAVE_COOLDOWN_SECONDS } from '@/lib/local-work';
import { getDatabase,type AppUser } from '@/lib/app-user';
import { isUuid } from '@/lib/question-bank-model';
import type { HistoryItem,ResultQuestion,StudentResult } from '@/lib/learning-model';

export async function canManageAssignment(user:AppUser,assignmentId:string) {
  if(user.role==='student' || !isUuid(assignmentId)) return false;
  return Boolean((await getDatabase().query(`SELECT 1 FROM assignments a LEFT JOIN classes c ON c.id=a.class_id WHERE a.id=$1 AND ${assignmentReadAccess('$2','$3')}`,[assignmentId,user.id,user.role==='admin'])).rowCount);
}
export async function getSavedWork(studentId:string,assignmentId:string) {
  const database=getDatabase();
  const attempt=(await database.query<{id:string;status:string;revision:number;retry_after:number}>(`SELECT id,status,revision,GREATEST(0,CEIL(EXTRACT(EPOCH FROM (cloud_saved_at + $3 * interval '1 second' - clock_timestamp()))))::int AS retry_after FROM student_assignments WHERE student_id=$1 AND assignment_id=$2`,[studentId,assignmentId,CLOUD_SAVE_COOLDOWN_SECONDS])).rows[0];
  const answers=attempt?(await database.query<{question_id:string;choice_id:string|null}>(`SELECT assignment_question_id AS question_id,selected_choice_id AS choice_id FROM responses WHERE student_assignment_id=$1`,[attempt.id])).rows:[];
  return {status:attempt?.status??'not_started',revision:attempt?.revision??0,answers,cooldownSeconds:attempt?.retry_after??0};
}
export async function studentHistory(studentId:string,viewer?:AppUser) {
  return (await getDatabase().query<HistoryItem>(`SELECT a.id,a.practice_student_id,a.title,COALESCE(c.name,'Personal practice') AS class_name,a.status AS assignment_status,COALESCE(sa.status::text,'not_started') AS status,sa.submitted_at,a.due_at,
    (SELECT count(*)::int FROM assignment_questions WHERE assignment_id=a.id) AS total,
    (SELECT count(*)::int FROM responses r WHERE r.student_assignment_id=sa.id AND r.is_correct=true AND sa.status='submitted') AS correct,
    (SELECT count(*)::int FROM responses r WHERE r.student_assignment_id=sa.id AND r.is_correct IS NOT NULL AND sa.status='submitted') AS graded
    FROM assignments a LEFT JOIN classes c ON c.id=a.class_id LEFT JOIN student_assignments sa ON sa.assignment_id=a.id AND sa.student_id=$1
    WHERE (${assignmentReadAccess('$2','$3')}) AND (sa.id IS NOT NULL OR (a.practice_student_id IS NULL AND a.status<>'draft' AND c.archived_at IS NULL AND EXISTS(SELECT 1 FROM class_memberships cm WHERE cm.class_id=c.id AND cm.user_id=$1 AND cm.role='student' AND cm.status='active')))
    ORDER BY sa.submitted_at DESC NULLS LAST,a.created_at DESC`,[studentId,viewer?.id??studentId,viewer?.role==='admin'])).rows;
}
export async function getStudentResult(user:AppUser,assignmentId:string,studentId:string):Promise<StudentResult|null> {
  if(!isUuid(assignmentId)||!isUuid(studentId)) return null;
  const own=user.role==='student' && user.id===studentId;
  if(!own && !await canManageAssignment(user,assignmentId)) return null;
  const result=(await getDatabase().query<{student_id:string;student_name:string;status:string;submitted_at:Date|null;attempt_id:string|null}>(`SELECT u.id AS student_id,u.display_name AS student_name,COALESCE(sa.status::text,'not_started') AS status,sa.submitted_at,sa.id AS attempt_id
    FROM users u JOIN assignments a ON a.id=$1 LEFT JOIN student_assignments sa ON sa.student_id=u.id AND sa.assignment_id=a.id
    WHERE u.id=$2 AND u.default_role='student' AND (sa.id IS NOT NULL OR EXISTS(SELECT 1 FROM class_memberships cm WHERE cm.class_id=a.class_id AND cm.user_id=u.id AND cm.role='student' AND cm.status='active'))`,[assignmentId,studentId])).rows[0];
  if(!result || own && result.status!=='submitted') return null;
  const questions=(await getDatabase().query<ResultQuestion>(`SELECT aq.id,aq.position,COALESCE(v.alt_text,'Question '||(aq.position+1)) AS name,
    (SELECT id FROM assets WHERE question_version_id=v.id AND status='active' ORDER BY created_at LIMIT 1) AS asset_id,
    selected.display_label AS selected_label,correct.display_label AS correct_label,r.is_correct
    FROM assignment_questions aq JOIN question_versions v ON v.id=aq.question_version_id
    LEFT JOIN responses r ON r.assignment_question_id=aq.id AND r.student_assignment_id=$2
    LEFT JOIN question_choices selected ON selected.id=r.selected_choice_id
    LEFT JOIN question_choices correct ON correct.id=aq.grading_choice_id
    WHERE aq.assignment_id=$1 ORDER BY aq.position`,[assignmentId,result.attempt_id])).rows;
  return {...result,questions,total:questions.length,correct:questions.filter(q=>q.is_correct===true).length,graded:questions.filter(q=>q.is_correct!==null).length};
}
export type RosterResult={id:string;name:string;username:string;status:string;correct:number;graded:number};
export type QuestionResult={id:string;position:number;name:string;submitted:number;answered:number;correct:number;graded:number};
export async function getClassResults(user:AppUser,assignmentId:string) {
  if(!await canManageAssignment(user,assignmentId)) return null;
  const database=getDatabase();
  const students=(await database.query<RosterResult>(`SELECT u.id,u.display_name AS name,u.username,COALESCE(sa.status::text,'not_started') AS status,
    count(r.id) FILTER(WHERE r.is_correct=true AND sa.status='submitted')::int AS correct,
    count(r.id) FILTER(WHERE r.is_correct IS NOT NULL AND sa.status='submitted')::int AS graded
    FROM assignments a JOIN users u ON u.default_role='student'
    LEFT JOIN student_assignments sa ON sa.assignment_id=a.id AND sa.student_id=u.id
    LEFT JOIN responses r ON r.student_assignment_id=sa.id
    WHERE a.id=$1 AND (sa.id IS NOT NULL OR EXISTS(SELECT 1 FROM class_memberships cm WHERE cm.class_id=a.class_id AND cm.user_id=u.id AND cm.role='student' AND cm.status='active'))
    GROUP BY u.id,sa.id ORDER BY u.display_name,u.username`,[assignmentId])).rows;
  const questions=(await database.query<QuestionResult>(`SELECT aq.id,aq.position,COALESCE(v.alt_text,'Question '||(aq.position+1)) AS name,
    count(sa.id)::int AS submitted,count(r.selected_choice_id)::int AS answered,
    count(r.id) FILTER(WHERE r.is_correct=true)::int AS correct,count(r.id) FILTER(WHERE r.is_correct IS NOT NULL)::int AS graded
    FROM assignment_questions aq JOIN question_versions v ON v.id=aq.question_version_id
    LEFT JOIN student_assignments sa ON sa.assignment_id=aq.assignment_id AND sa.status='submitted'
    LEFT JOIN responses r ON r.student_assignment_id=sa.id AND r.assignment_question_id=aq.id
    WHERE aq.assignment_id=$1 GROUP BY aq.id,v.id ORDER BY aq.position`,[assignmentId])).rows;
  return {students,questions};
}
