import { getAppUser,getDatabase } from '@/lib/app-user';
import { isUuid } from '@/lib/question-bank-model';
import { CLOUD_SAVE_COOLDOWN_SECONDS } from '@/lib/local-work';
import { parseWorkInput,markChoice } from '@/lib/learning-model';
export async function POST(request:Request,{params}:{params:Promise<{assignmentId:string}>}) {
  const user=await getAppUser();
  if(!user || user.status!=='active' || user.role!=='student') return Response.json({error:'An active student account is required.'},{status:403});
  const {assignmentId}=await params;
  if(!isUuid(assignmentId)) return Response.json({error:'Assignment not found.'},{status:404});
  let input;
  try {input=parseWorkInput(await request.json());} catch(error) {return Response.json({error:(error as Error).message},{status:400});}
  const client=await getDatabase().connect();
  try {
    await client.query('BEGIN');
    const assignment=(await client.query<{due_at:Date|null}>(`SELECT a.due_at FROM assignments a JOIN classes c ON c.id=a.class_id
      JOIN class_memberships cm ON cm.class_id=c.id AND cm.user_id=$2 AND cm.role='student' AND cm.status='active'
      WHERE a.id=$1 AND a.status='open' AND c.archived_at IS NULL AND (a.open_at IS NULL OR a.open_at<=now()) FOR SHARE OF a,c,cm`,[assignmentId,user.id])).rows[0];
    if(!assignment) {await client.query('ROLLBACK');return Response.json({error:'This assignment is not open to you.'},{status:403});}
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[`${user.id}:${assignmentId}`]);
    let attempt=(await client.query<{id:string;status:string;revision:number;retry_after:number}>(`SELECT id,status,revision,
      GREATEST(0,CEIL(EXTRACT(EPOCH FROM (cloud_saved_at + $3 * interval '1 second' - clock_timestamp()))))::int AS retry_after
      FROM student_assignments WHERE assignment_id=$1 AND student_id=$2 FOR UPDATE`,[assignmentId,user.id,CLOUD_SAVE_COOLDOWN_SECONDS])).rows[0];
    if(attempt && attempt.status!=='submitted' && input.action==='save' && attempt.retry_after>0){
      await client.query('ROLLBACK');
      return Response.json({error:`Please wait ${attempt.retry_after} seconds before saving to cloud again.`,retryAfterSeconds:attempt.retry_after},{status:429,headers:{'Retry-After':String(attempt.retry_after)}});
    }
    if(!attempt)attempt=(await client.query<{id:string;status:string;revision:number;retry_after:number}>(`INSERT INTO student_assignments(assignment_id,student_id) VALUES($1,$2) RETURNING id,status,revision,0 AS retry_after`,[assignmentId,user.id])).rows[0];
    if(attempt.status==='submitted') {await client.query('COMMIT');return Response.json({status:'submitted',revision:attempt.revision,alreadySubmitted:true});}
    if(attempt.revision!==input.revision) {await client.query('ROLLBACK');return Response.json({error:'Your work changed in another tab, or the last save already succeeded. Reload to recover the saved answers.'},{status:409});}
    const questions=(await client.query<{id:string;grading_choice_id:string|null;choice_ids:string[]}>(`SELECT aq.id,aq.grading_choice_id,ARRAY(SELECT id FROM question_choices c WHERE c.question_version_id=aq.question_version_id) AS choice_ids FROM assignment_questions aq WHERE aq.assignment_id=$1 ORDER BY aq.position FOR SHARE OF aq`,[assignmentId])).rows;
    const selections=new Map(input.answers.map(answer=>[answer.questionId,answer.choiceId]));
    if(input.answers.length!==questions.length || input.answers.some(answer=>!questions.some(q=>q.id===answer.questionId && (answer.choiceId===null || q.choice_ids.includes(answer.choiceId))))) {
      await client.query('ROLLBACK');return Response.json({error:'One or more answers do not belong to this assignment. Reload and try again.'},{status:400});
    }
    const submitting=input.action==='submit';
    const rows=questions.map(q=>({question_id:q.id,choice_id:selections.get(q.id)??null,is_correct:submitting?markChoice(selections.get(q.id)??null,q.grading_choice_id):null}));
    await client.query(`INSERT INTO responses(student_assignment_id,assignment_question_id,selected_choice_id,is_correct,graded_at)
      SELECT $1,q.question_id,q.choice_id,q.is_correct,CASE WHEN q.is_correct IS NOT NULL THEN now() ELSE NULL END
      FROM jsonb_to_recordset($2::jsonb) AS q(question_id uuid,choice_id uuid,is_correct boolean)
      ON CONFLICT(student_assignment_id,assignment_question_id) DO UPDATE SET selected_choice_id=EXCLUDED.selected_choice_id,is_correct=EXCLUDED.is_correct,graded_at=EXCLUDED.graded_at,revision=responses.revision+1,saved_at=now()`,[attempt.id,JSON.stringify(rows)]);
    const updated=(await client.query<{revision:number}>(`UPDATE student_assignments SET cloud_saved_at=CASE WHEN $3 THEN cloud_saved_at ELSE clock_timestamp() END,status=$2::student_assignment_status,revision=revision+1,opened_at=COALESCE(opened_at,now()),submitted_at=CASE WHEN $3 THEN now() ELSE NULL END,is_late=CASE WHEN $3 THEN $4::timestamptz IS NOT NULL AND now()>$4 ELSE false END,updated_at=now() WHERE id=$1 RETURNING revision`,[attempt.id,submitting?'submitted':'in_progress',submitting,assignment.due_at])).rows[0];
    if(submitting) await client.query(`INSERT INTO submission_events(student_assignment_id,event_type,actor_user_id) VALUES($1,'submitted',$2)`,[attempt.id,user.id]);
    await client.query('COMMIT');return Response.json({status:submitting?'submitted':'in_progress',revision:updated.revision,...(!submitting?{retryAfterSeconds:CLOUD_SAVE_COOLDOWN_SECONDS}:{})});
  } catch(error) {await client.query('ROLLBACK');console.error('Save student work failed',error);return Response.json({error:'Could not confirm the save. Retry or reload to recover your saved work.'},{status:500});}
  finally {client.release();}
}
