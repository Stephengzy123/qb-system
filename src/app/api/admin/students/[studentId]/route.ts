import { getAppUser,getDatabase } from '@/lib/app-user';
import { isUuid } from '@/lib/question-bank-model';
export async function PATCH(request:Request,{params}:{params:Promise<{studentId:string}>}) {
  const actor=await getAppUser();
  if(!actor||actor.status!=='active'||actor.role!=='admin')return Response.json({error:'Administrator access required.'},{status:403});
  const {studentId}=await params;
  const input=await request.json().catch(()=>null);
  if(!isUuid(studentId)||!input||typeof input.disabled!=='boolean'||!(input.duplicateOf===null||isUuid(input.duplicateOf))||input.duplicateOf===studentId||!input.disabled&&input.duplicateOf!==null)return Response.json({error:'Choose a valid account action and duplicate account.'},{status:400});
  const client=await getDatabase().connect();
  try {
    await client.query('BEGIN');
    // Serialize account links so simultaneous changes cannot create duplicate cycles.
    await client.query('SELECT pg_advisory_xact_lock(418206094)');
    const student=(await client.query<{auth_subject:string}>(`SELECT auth_subject FROM users WHERE id=$1 AND default_role='student' FOR UPDATE`,[studentId])).rows[0];
    if(!student){await client.query('ROLLBACK');return Response.json({error:'Student not found.'},{status:404});}
    if(input.duplicateOf && !(await client.query(`SELECT 1 FROM users WHERE id=$1 AND default_role='student' AND disabled_at IS NULL AND approval_status='active' AND duplicate_of_id IS NULL`,[input.duplicateOf])).rowCount){await client.query('ROLLBACK');return Response.json({error:'Choose an active primary student account.'},{status:400});}
    await client.query(`UPDATE users SET disabled_at=CASE WHEN $2 THEN COALESCE(disabled_at,now()) ELSE NULL END,duplicate_of_id=$3,updated_at=now() WHERE id=$1`,[studentId,input.disabled,input.duplicateOf]);
    if(input.disabled)await client.query('DELETE FROM "session" WHERE "userId"=$1',[student.auth_subject]);
    await client.query(`INSERT INTO audit_logs(actor_user_id,action,entity_type,entity_id,metadata) VALUES($1,$2,'user',$3,$4::jsonb)`,[actor.id,input.disabled?'student.disabled':'student.restored',studentId,JSON.stringify({duplicateOf:input.duplicateOf})]);
    await client.query('COMMIT');return Response.json({saved:true});
  } catch(error){await client.query('ROLLBACK');console.error('Student account update failed',error);return Response.json({error:'Could not update this account.'},{status:500});}
  finally{client.release();}
}
