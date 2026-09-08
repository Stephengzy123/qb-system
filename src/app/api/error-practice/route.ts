import {getAppUser,getDatabase} from '@/lib/app-user';
import {parsePracticeInput,selectPracticeQuestions,type ErrorCandidate} from '@/lib/error-practice-model';
export async function POST(request:Request) {
  const user=await getAppUser();
  if(!user || user.status!=='active' || user.role!=='student') return Response.json({error:'An active student account is required.'},{status:403});
  let input;
  try {input=parsePracticeInput(await request.json());} catch(error) {return Response.json({error:(error as Error).message},{status:400});}
  const client=await getDatabase().connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[input.requestId]);
    const previous=(await client.query<{id:string;practice_student_id:string}>('SELECT id,practice_student_id FROM assignments WHERE practice_request_id=$1',[input.requestId])).rows[0];
    if(previous) {
      await client.query('COMMIT');
      return previous.practice_student_id===user.id?Response.json({id:previous.id}):Response.json({error:'Request already used.'},{status:409});
    }
    const candidates=(await client.query<ErrorCandidate>(`SELECT aq.question_version_id AS version_id,
      (array_agg(aq.grading_choice_id ORDER BY sa.submitted_at DESC,aq.id))[1] AS grading_choice_id,
      count(*)::int AS errors,max(sa.submitted_at) AS last_wrong
      FROM responses r JOIN student_assignments sa ON sa.id=r.student_assignment_id
      JOIN assignment_questions aq ON aq.id=r.assignment_question_id
      WHERE sa.student_id=$1 AND sa.status='submitted' AND r.is_correct=false AND aq.grading_choice_id IS NOT NULL
      AND EXISTS(SELECT 1 FROM assets asset WHERE asset.question_version_id=aq.question_version_id AND asset.status='active')
      GROUP BY aq.question_version_id`,[user.id])).rows;
    const questions=selectPracticeQuestions(candidates,input.count);
    if(!questions.length) {await client.query('ROLLBACK');return Response.json({error:'No incorrect questions are available to practise yet.'},{status:400});}
    const assignment=(await client.query<{id:string}>(`INSERT INTO assignments(title,instructions,status,created_by,practice_student_id,practice_request_id,open_at,published_at)
      VALUES('Error practice','Practise questions you previously answered incorrectly.','open',$1,$1,$2,now(),now()) RETURNING id`,[user.id,input.requestId])).rows[0];
    await client.query(`INSERT INTO assignment_questions(assignment_id,question_version_id,grading_choice_id,position)
      SELECT $1,version_id,grading_choice_id,position FROM jsonb_to_recordset($2::jsonb) AS q(version_id uuid,grading_choice_id uuid,position integer)`,[assignment.id,JSON.stringify(questions.map((q,position)=>({...q,position})))]);
    await client.query('INSERT INTO student_assignments(assignment_id,student_id) VALUES($1,$2)',[assignment.id,user.id]);
    await client.query('COMMIT');return Response.json({id:assignment.id,questionCount:questions.length},{status:201});
  } catch(error) {await client.query('ROLLBACK');console.error('Create error practice failed',error);return Response.json({error:'Could not start practice. Please retry.'},{status:500});}
  finally {client.release();}
}
