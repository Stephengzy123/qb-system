import {getAppUser,getDatabase} from '@/lib/app-user';
import {isUuid} from '@/lib/question-bank-model';
export async function POST(_request:Request,{params}:{params:Promise<{assignmentId:string}>}) {
  const user=await getAppUser();
  if(!user || user.status!=='active' || user.role==='student')return Response.json({error:'Staff access required.'},{status:403});
  const {assignmentId}=await params;
  if(!isUuid(assignmentId))return Response.json({error:'Assignment not found.'},{status:404});
  const client=await getDatabase().connect();
  try {
    await client.query('BEGIN');
    const assignment=(await client.query<{status:string;due_at:Date|null}>(`SELECT a.status,a.due_at FROM assignments a WHERE a.id=$1 AND a.practice_student_id IS NULL
      AND ($3::boolean OR EXISTS(SELECT 1 FROM class_memberships cm WHERE cm.class_id=a.class_id AND cm.user_id=$2 AND cm.role='teacher' AND cm.status='active')) FOR UPDATE OF a`,[assignmentId,user.id,user.role==='admin'])).rows[0];
    if(!assignment) {await client.query('ROLLBACK');return Response.json({error:'Assignment not found.'},{status:404});}
    if(assignment.status==='closed') {await client.query('COMMIT');return Response.json({status:'closed'});}
    if(assignment.status!=='open' || assignment.due_at) {await client.query('ROLLBACK');return Response.json({error:'Only open assignments without a due date can be closed here.'},{status:409});}
    await client.query("UPDATE assignments SET status='closed',closed_at=now(),updated_at=now() WHERE id=$1",[assignmentId]);
    await client.query("INSERT INTO audit_logs(actor_user_id,action,entity_type,entity_id) VALUES($1,'assignment.closed','assignment',$2)",[user.id,assignmentId]);
    await client.query('COMMIT');return Response.json({status:'closed'});
  }catch(error){await client.query('ROLLBACK');console.error('Close assignment failed',error);return Response.json({error:'Could not close the assignment. Please retry.'},{status:500});}
  finally{client.release();}
}
