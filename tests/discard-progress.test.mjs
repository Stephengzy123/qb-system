import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DELETE,POST} from '../src/app/api/assignments/[assignmentId]/work/route.ts';
import {parseLocalDraft} from '../src/lib/local-work.ts';
import {state} from './learning-test-auth.mjs';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const discard=(revision=3)=>DELETE(new Request('http://localhost/work',{method:'DELETE',body:JSON.stringify({revision})}),{params:Promise.resolve({assignmentId:id(90)})});
function setup(options={}){
  const queries=[];state.user={id:id(50),role:'student',status:'active'};
  const query=async(sql,args)=>{
    queries.push([sql,args]);
    if(sql.startsWith('SELECT a.practice_student_id'))return {rows:options.noAccess?[]:[{practice_student_id:options.practice?id(50):null}]};
    if(sql.startsWith('SELECT sa.id,sa.status'))return {rows:options.noAttempt?[]:[{id:id(80),status:options.status??'in_progress',revision:options.revision??3,has_submission:options.submission??false}]};
    if(sql.startsWith('SELECT a.due_at'))return {rows:[{due_at:null,practice_student_id:null,class_id:null}]};
    if(sql.startsWith('SELECT id,status,revision'))return {rows:[{id:id(80),status:'not_started',revision:4,retry_after:0}]};
    if(options.fail&&sql.startsWith('DELETE FROM responses'))throw new Error('Simulated failure');
    return {rows:[],rowCount:1};
  };state.database={connect:async()=>({query,release(){}})};return queries;
}
test('discard requires an active student and their own accessible work',async()=>{
  for(const user of [null,{role:'admin',status:'active'},{role:'student',status:'pending'}]){setup();state.user=user;assert.equal((await discard()).status,403);}
  const queries=setup({noAccess:true});assert.equal((await discard()).status,404);assert.ok(!queries.some(([sql])=>sql.startsWith('DELETE')));
});
test('class discard only deletes the signed-in student responses and retains the assignment',async()=>{
  const queries=setup();const response=await discard();assert.deepEqual(await response.json(),{discarded:true,deleted:false,revision:4});
  assert.deepEqual(queries.find(([sql])=>sql.startsWith('SELECT sa.id,sa.status'))[1],[id(90),id(50)]);
  assert.deepEqual(queries.find(([sql])=>sql.startsWith('DELETE FROM responses'))[1],[id(80)]);
  assert.deepEqual(queries.find(([sql])=>sql.startsWith('UPDATE student_assignments'))[1],[id(80),id(50)]);
  assert.ok(queries.some(([sql])=>sql.includes('discarded_revision=revision+1')));
  assert.ok(!queries.some(([sql])=>sql.startsWith('DELETE FROM assignments')||sql.startsWith('DELETE FROM student_assignments')));
  assert.equal(queries.at(-1)[0],'COMMIT');
});
test('unfinished personal practice is removed after its own responses and attempt',async()=>{
  const queries=setup({practice:true});assert.equal((await discard()).status,200);
  const deletes=queries.filter(([sql])=>sql.startsWith('DELETE'));
  assert.equal(deletes.length,3);assert.deepEqual(deletes[2][1],[id(90),id(50)]);
  assert.match(deletes[2][0],/practice_student_id=\$2/);
});
test('submitted, previously submitted, reopened and stale work cannot be discarded',async()=>{
  for(const options of [{status:'submitted'},{status:'reopened'},{submission:true},{revision:4}]){
    const queries=setup(options);assert.equal((await discard()).status,409);assert.ok(!queries.some(([sql])=>sql.startsWith('DELETE')||sql.startsWith('UPDATE')));
  }
});
test('discard creates a revision barrier for drafts that have never reached cloud',async()=>{
  const queries=setup({noAttempt:true});assert.equal((await discard(0)).status,200);
  assert.deepEqual(queries.find(([sql])=>sql.startsWith('INSERT INTO student_assignments'))[1],[id(90),id(50)]);
  assert.ok(queries.some(([sql])=>sql.includes('VALUES($1,$2,1,1)')));
});
test('old tabs cannot save answers after a discard',async()=>{
  const queries=setup();const response=await POST(new Request('http://localhost/work',{method:'POST',body:JSON.stringify({action:'save',revision:3,answers:[]})}),{params:Promise.resolve({assignmentId:id(90)})});
  assert.equal(response.status,409);assert.ok(!queries.some(([sql])=>sql.startsWith('INSERT INTO responses')));
});
test('old drafts on another device are ignored even after fresh cloud work begins',()=>{
  const questions=[{id:id(1),choices:[{id:id(11)}]}];
  const raw=revision=>JSON.stringify({revision,answers:{[id(1)]:id(11)},cooldownUntil:0});
  assert.equal(parseLocalDraft(raw(3),questions,4),null);
  assert.notEqual(parseLocalDraft(raw(4),questions,4),null);
});
test('database failures roll back without claiming progress was discarded',async()=>{
  const queries=setup({fail:true});assert.equal((await discard()).status,500);assert.equal(queries.at(-1)[0],'ROLLBACK');
});
