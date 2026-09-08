import { createHash } from 'node:crypto';
import { getAppUser, getDatabase } from '@/lib/app-user';
import { parseAssignmentInput, combineAssignmentQuestions, type AssignmentSource } from '@/lib/assignment-model';
export const maxDuration=60;
export async function POST(request:Request) {
  const user=await getAppUser();
  if (!user || user.status!=='active' || user.role==='student') return Response.json({error:'Staff access required.'},{status:403});
  let input;
  try { input=parseAssignmentInput(await request.json()); } catch(error) {return Response.json({error:error instanceof Error?error.message:'Invalid assignment.'},{status:400});}
  const hash=createHash('sha256').update(JSON.stringify(input)).digest('hex');
  const client=await getDatabase().connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[input.requestId]);
    const previous=(await client.query<{created_by:string;request_hash:string}>('SELECT created_by,request_hash FROM assignment_batches WHERE id=$1',[input.requestId])).rows[0];
    if (previous) {
      if(previous.created_by!==user.id || previous.request_hash!==hash) {await client.query('ROLLBACK');return Response.json({error:'This request was already used. Review the assignments list before creating another assignment.'},{status:409});}
      const saved=await client.query('SELECT a.id,c.name AS class_name FROM assignments a JOIN classes c ON c.id=a.class_id WHERE a.batch_id=$1 ORDER BY c.name',[input.requestId]);
      await client.query('COMMIT');return Response.json({assignments:saved.rows});
    }
    if (input.dueAt && Date.parse(input.dueAt)<=Date.now()) {await client.query('ROLLBACK');return Response.json({error:'Choose a future due date or leave it blank.'},{status:400});}
    const classes=await client.query<{id:string;name:string}>(`SELECT c.id,c.name FROM classes c WHERE c.id=ANY($1::uuid[]) AND c.archived_at IS NULL AND ($3::boolean OR EXISTS(
      SELECT 1 FROM class_memberships cm WHERE cm.class_id=c.id AND cm.user_id=$2 AND cm.role='teacher' AND cm.status='active')) ORDER BY c.id FOR SHARE OF c`,[input.classIds,user.id,user.role==='admin']);
    const sets=await client.query(`SELECT s.id FROM question_sets s WHERE s.id=ANY($1::uuid[]) AND s.deleted_at IS NULL AND s.status<>'archived' AND ($3::boolean OR s.created_by=$2 OR EXISTS(
      SELECT 1 FROM folder_permissions p WHERE p.folder_id=s.folder_id AND p.user_id=$2 AND (p.can_view OR p.can_edit))) ORDER BY s.id FOR SHARE OF s`,[input.setIds,user.id,user.role==='admin']);
    if(classes.rowCount!==input.classIds.length || sets.rowCount!==input.setIds.length) {await client.query('ROLLBACK');return Response.json({error:'A selected class or set is no longer available to you. Refresh and check your selections.'},{status:403});}
    const sources=await client.query<AssignmentSource>(`SELECT sq.set_id,v.id AS version_id,sq.position,ans.correct_choice_id AS grading_choice_id FROM set_questions sq
      JOIN questions q ON q.id=sq.question_id AND q.deleted_at IS NULL JOIN question_versions v ON v.id=q.current_version_id
      LEFT JOIN question_set_answers ans ON ans.set_question_id=sq.id AND ans.question_version_id=v.id
      WHERE sq.set_id=ANY($1::uuid[]) AND EXISTS(SELECT 1 FROM assets a WHERE a.question_version_id=v.id AND a.status='active') ORDER BY sq.set_id,sq.position`,[input.setIds]);
    let questions;
    try {questions=combineAssignmentQuestions(input.setIds,sources.rows);} catch(error) {await client.query('ROLLBACK');return Response.json({error:(error as Error).message},{status:400});}
    await client.query('INSERT INTO assignment_batches(id,created_by,request_hash) VALUES($1,$2,$3)',[input.requestId,user.id,hash]);
    const created=[];
    for(const cls of classes.rows) {
      const assignment=(await client.query<{id:string}>(`INSERT INTO assignments(class_id,source_set_id,title,instructions,open_at,due_at,status,created_by,published_at,batch_id)
        VALUES($1,$2,$3,$4,now(),$5,'open',$6,now(),$7) RETURNING id`,[cls.id,input.setIds.length===1?input.setIds[0]:null,input.title,input.instructions||null,input.dueAt,user.id,input.requestId])).rows[0];
      await client.query(`INSERT INTO assignment_sets(assignment_id,set_id,position) SELECT $1,id,ordinality-1 FROM unnest($2::uuid[]) WITH ORDINALITY AS ids(id,ordinality)`,[assignment.id,input.setIds]);
      await client.query(`INSERT INTO assignment_questions(assignment_id,question_version_id,grading_choice_id,position) SELECT $1,version_id,grading_choice_id,position
        FROM jsonb_to_recordset($2::jsonb) AS q(version_id uuid,grading_choice_id uuid,position integer)`,[assignment.id,JSON.stringify(questions.map((q,position)=>({...q,position})))]);
      await client.query(`INSERT INTO student_assignments(assignment_id,student_id) SELECT $1,user_id FROM class_memberships WHERE class_id=$2 AND role='student' AND status='active' ON CONFLICT DO NOTHING`,[assignment.id,cls.id]);
      await client.query(`INSERT INTO audit_logs(actor_user_id,action,entity_type,entity_id,metadata) VALUES($1,'assignment.published','assignment',$2,$3::jsonb)`,[user.id,assignment.id,JSON.stringify({setIds:input.setIds,classId:cls.id,questionCount:questions.length})]);
      created.push({id:assignment.id,class_name:cls.name});
    }
    await client.query('COMMIT');
    return Response.json({assignments:created,questionCount:questions.length,unkeyed:questions.filter(q=>!q.grading_choice_id).length},{status:201});
  } catch(error) {await client.query('ROLLBACK');console.error('Create assignments failed',error);return Response.json({error:'Assignments could not be created. Retry to check or complete this request.'},{status:500});}
  finally {client.release();}
}
