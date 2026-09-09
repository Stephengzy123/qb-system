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
    const assignment=(await client.query<{due_at:Date|null;practice_student_id:string|null;class_id:string}>(`SELECT a.due_at,a.practice_student_id,a.class_id FROM assignments a WHERE a.id=$1 AND a.status='open' AND (a.open_at IS NULL OR a.open_at<=now()) AND (a.practice_student_id=$2 OR (a.practice_student_id IS NULL AND EXISTS(SELECT 1 FROM classes c JOIN class_memberships cm ON cm.class_id=c.id WHERE c.id=a.class_id AND c.archived_at IS NULL AND cm.user_id=$2 AND cm.role='student' AND cm.status='active'))) FOR SHARE OF a`,[assignmentId,user.id])).rows[0];
    if(!assignment) {await client.query('ROLLBACK');return Response.json({error:'This assignment is not open to you.'},{status:403});}
    if(assignment.class_id) {
      const membership=await client.query(`SELECT 1 FROM classes c JOIN class_memberships cm ON cm.class_id=c.id WHERE c.id=$1 AND c.archived_at IS NULL AND cm.user_id=$2 AND cm.role='student' AND cm.status='active' FOR SHARE OF c,cm`,[assignment.class_id,user.id]);
      if(!membership.rowCount) {await client.query('ROLLBACK');return Response.json({error:'This assignment is not open to you.'},{status:403});}
    }
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

export async function DELETE(request:Request,{params}:{params:Promise<{assignmentId:string}>}) {
  const user=await getAppUser();
  if(!user || user.status!=='active' || user.role!=='student')return Response.json({error:'An active student account is required.'},{status:403});
  const {assignmentId}=await params;
  if(!isUuid(assignmentId))return Response.json({error:'Assignment not found.'},{status:404});
  const input=await request.json().catch(()=>null);
  if(!Number.isSafeInteger(input?.revision)||input.revision<0)return Response.json({error:'Reload this page before discarding progress.'},{status:400});
  const client=await getDatabase().connect();
  try {
    await client.query('BEGIN');
    // Same lock order as saving: assignment, then this student's attempt.
    const assignment=(await client.query<{practice_student_id:string|null}>(`SELECT a.practice_student_id FROM assignments a WHERE a.id=$1 AND
      (a.practice_student_id=$2 OR (a.practice_student_id IS NULL AND EXISTS(SELECT 1 FROM student_assignments sa WHERE sa.assignment_id=a.id AND sa.student_id=$2))
      OR (a.practice_student_id IS NULL AND a.status='open' AND (a.open_at IS NULL OR a.open_at<=now()) AND EXISTS(SELECT 1 FROM classes c JOIN class_memberships cm ON cm.class_id=c.id WHERE c.id=a.class_id AND c.archived_at IS NULL AND cm.user_id=$2 AND cm.role='student' AND cm.status='active')))
      FOR UPDATE OF a`,[assignmentId,user.id])).rows[0];
    if(!assignment){await client.query('ROLLBACK');return Response.json({error:'Assignment not found.'},{status:404});}
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[`${user.id}:${assignmentId}`]);
    const attempt=(await client.query<{id:string;status:string;revision:number;has_submission:boolean}>(`SELECT sa.id,sa.status,sa.revision,EXISTS(SELECT 1 FROM submission_events se WHERE se.student_assignment_id=sa.id) AS has_submission
      FROM student_assignments sa WHERE sa.assignment_id=$1 AND sa.student_id=$2 FOR UPDATE OF sa`,[assignmentId,user.id])).rows[0];
    if(attempt && (attempt.status==='submitted'||attempt.status==='reopened'||attempt.has_submission)){
      await client.query('ROLLBACK');return Response.json({error:'Submitted work cannot be discarded.'},{status:409});
    }
    if((attempt?.revision??0)!==input.revision){await client.query('ROLLBACK');return Response.json({error:'Your progress changed in another tab. Reload and review it before discarding.'},{status:409});}
    if(attempt)await client.query('DELETE FROM responses WHERE student_assignment_id=$1',[attempt.id]);
    const practice=Boolean(assignment.practice_student_id);
    if(practice){
      if(attempt)await client.query('DELETE FROM student_assignments WHERE id=$1 AND student_id=$2',[attempt.id,user.id]);
      await client.query('DELETE FROM assignments WHERE id=$1 AND practice_student_id=$2',[assignmentId,user.id]);
    }else if(attempt){
      await client.query(`UPDATE student_assignments SET status='not_started',revision=revision+1,discarded_revision=revision+1,
        cloud_saved_at=NULL,opened_at=NULL,submitted_at=NULL,is_late=false,current_position=0,randomized_question_ids=NULL,updated_at=now()
        WHERE id=$1 AND student_id=$2`,[attempt.id,user.id]);
    }else{
      // Keep a revision marker even for drafts that existed only on a device.
      await client.query('INSERT INTO student_assignments(assignment_id,student_id,revision,discarded_revision) VALUES($1,$2,1,1)',[assignmentId,user.id]);
    }
    await client.query("INSERT INTO audit_logs(actor_user_id,action,entity_type,entity_id) VALUES($1,'student_work.discarded','assignment',$2)",[user.id,assignmentId]);
    await client.query('COMMIT');return Response.json({discarded:true,deleted:practice,revision:input.revision+1});
  }catch(error){await client.query('ROLLBACK');console.error('Discard progress failed',error);return Response.json({error:'Could not confirm the discard. Reload to check your progress.'},{status:500});}
  finally{client.release();}
}
