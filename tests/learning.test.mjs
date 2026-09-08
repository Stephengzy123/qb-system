import {test} from 'node:test';
import assert from 'node:assert/strict';
import {POST} from '../src/app/api/assignments/[assignmentId]/work/route.ts';
import {PATCH} from '../src/app/api/admin/students/[studentId]/route.ts';
import {getStudentResult} from '../src/lib/learning.ts';
import {parseWorkInput,markChoice,accuracy} from '../src/lib/learning-model.ts';
import {state} from './learning-test-auth.mjs';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const answers=[{questionId:id(1),choiceId:id(11)},{questionId:id(2),choiceId:null},{questionId:id(3),choiceId:id(31)}];
const questions=[{id:id(1),grading_choice_id:id(11),choice_ids:[id(11),id(12)]},{id:id(2),grading_choice_id:id(21),choice_ids:[id(21)]},{id:id(3),grading_choice_id:null,choice_ids:[id(31)]}];
const work=(patch={})=>POST(new Request('http://localhost/work',{method:'POST',body:JSON.stringify({action:'submit',revision:0,answers,...patch})}),{params:Promise.resolve({assignmentId:id(90)})});
const manage=(input)=>PATCH(new Request('http://localhost/account',{method:'PATCH',body:JSON.stringify(input)}),{params:Promise.resolve({studentId:id(50)})});
function setup(options={}) {
  const queries=[];
  state.user={id:id(50),role:'student',status:'active'};
  const query=async(sql,args)=>{
    queries.push([sql,args]);
    if(sql.startsWith('SELECT a.due_at'))return {rows:options.noAccess?[]:[{due_at:null}]};
    if(sql.startsWith('SELECT id,status,revision'))return {rows:[{id:id(80),status:options.submitted?'submitted':'in_progress',revision:options.revision??0,retry_after:options.retryAfter??0}]};
    if(sql.startsWith('SELECT aq.id,aq.grading_choice_id'))return {rows:questions};
    if(sql.startsWith('UPDATE student_assignments'))return {rows:[{revision:1}]};
    if(sql.startsWith('SELECT auth_subject'))return {rows:[{auth_subject:'auth-student'}]};
    if(sql.startsWith('SELECT 1 FROM users'))return {rowCount:options.badPrimary?0:1,rows:[]};
    if(sql.startsWith('SELECT 1 FROM assignments'))return {rowCount:options.noAccess?0:1,rows:[]};
    if(sql.startsWith('SELECT u.id AS student_id'))return {rows:[{student_id:id(50),student_name:'Student',status:options.submitted?'submitted':'in_progress',attempt_id:id(80),submitted_at:null}]};
    if(sql.includes('AS selected_label'))return {rows:[]};
    return {rows:[],rowCount:1};
  };
  state.database={query,connect:async()=>({query,release(){}})};return queries;
}
test('grading counts blank keyed questions as wrong and leaves unkeyed questions ungraded',()=>{
  assert.equal(markChoice(id(11),id(11)),true);assert.equal(markChoice(null,id(11)),false);assert.equal(markChoice(id(12),id(11)),false);assert.equal(markChoice(id(31),null),null);
  assert.equal(accuracy(1,2),'50%');assert.equal(accuracy(0,0),'Not graded');
});
test('invalid actions, revisions and repeated question IDs are rejected',()=>{
  for(const patch of [{action:'grade'},{revision:-1},{answers:[answers[0],answers[0]]},{answers:[{questionId:id(1),choiceId:'A'}]}])assert.throws(()=>parseWorkInput({action:'save',revision:0,answers,...patch}));
});
test('only active students may save or submit',async()=>{
  setup();state.user=null;assert.equal((await work()).status,403);
  state.user={role:'admin',status:'active'};assert.equal((await work()).status,403);
  state.user={role:'student',status:'rejected'};assert.equal((await work()).status,403);
});
test('saving persists choices without grading or exposing an answer key',async()=>{
  const queries=setup();const response=await work({action:'save'});assert.equal(response.status,200);
  const rows=JSON.parse(queries.find(([sql])=>sql.startsWith('INSERT INTO responses'))[1][1]);assert.ok(rows.every(r=>r.is_correct===null));
  assert.ok(!queries.some(([sql])=>sql.startsWith('INSERT INTO submission_events')));
  assert.deepEqual(await response.json(),{status:'in_progress',revision:1,retryAfterSeconds:30});
});
test('submit grades server-side and records a single submission event atomically',async()=>{
  const queries=setup();assert.equal((await work()).status,200);
  const rows=JSON.parse(queries.find(([sql])=>sql.startsWith('INSERT INTO responses'))[1][1]);assert.deepEqual(rows.map(r=>r.is_correct),[true,false,null]);
  assert.equal(queries.filter(([sql])=>sql.startsWith('INSERT INTO submission_events')).length,1);assert.ok(queries.some(([sql])=>sql==='COMMIT'));
});
test('submission replay never changes submitted answers',async()=>{
  const queries=setup({submitted:true});assert.equal((await work()).status,200);
  assert.ok(!queries.some(([sql])=>sql.startsWith('INSERT INTO responses')||sql.startsWith('INSERT INTO submission_events')));
});
test('stale revisions and choices from other questions roll back',async()=>{
  let queries=setup({revision:3});assert.equal((await work()).status,409);assert.ok(queries.some(([sql])=>sql==='ROLLBACK'));
  queries=setup();assert.equal((await work({answers:[{...answers[0],choiceId:id(21)},...answers.slice(1)]})).status,400);assert.ok(!queries.some(([sql])=>sql.startsWith('INSERT INTO responses')));
  setup({noAccess:true});assert.equal((await work()).status,403);
});
test('students cannot read peers results or see correct choices before submitting',async()=>{
  let queries=setup();assert.equal(await getStudentResult(state.user,id(90),id(51)),null);assert.equal(queries.length,0);
  queries=setup();assert.equal(await getStudentResult(state.user,id(90),id(50)),null);assert.ok(!queries.some(([sql])=>sql.includes('AS selected_label')));
});
test('teachers outside a class cannot read student results',async()=>{
  setup({noAccess:true});state.user={id:id(60),role:'teacher',status:'active'};assert.equal(await getStudentResult(state.user,id(90),id(50)),null);
});
test('account changes require admin and preserve historical student work',async()=>{
  setup();assert.equal((await manage({disabled:true,duplicateOf:null})).status,403);
  const queries=setup();state.user={id:id(60),role:'admin',status:'active'};
  assert.equal((await manage({disabled:true,duplicateOf:id(51)})).status,200);
  assert.ok(queries.some(([sql])=>sql.startsWith('DELETE FROM "session"')));assert.ok(queries.some(([sql])=>sql.startsWith('INSERT INTO audit_logs')));
  assert.ok(!queries.some(([sql])=>/DELETE FROM (users|responses|student_assignments)/.test(sql)));
});
test('duplicate linking rejects self links and inactive primary accounts',async()=>{
  setup();state.user={id:id(60),role:'admin',status:'active'};assert.equal((await manage({disabled:true,duplicateOf:id(50)})).status,400);
  setup({badPrimary:true});state.user={id:id(60),role:'admin',status:'active'};assert.equal((await manage({disabled:true,duplicateOf:id(51)})).status,400);
});

test('cloud save cooldown returns 429 before any data writes, and submission bypasses it',async()=>{
  let queries=setup({retryAfter:25});
  const response=await work({action:'save'});
  assert.equal(response.status,429);assert.equal(response.headers.get('Retry-After'),'25');
  assert.ok(!queries.some(([sql])=>sql.startsWith('INSERT')||sql.startsWith('UPDATE')));
  queries=setup({retryAfter:25});assert.equal((await work()).status,200);
  assert.ok(queries.some(([sql])=>sql.startsWith('INSERT INTO submission_events')));
});

test('local drafts are scoped to a student and assignment and validate their choices',async()=>{
  const {draftKey,parseLocalDraft}=await import('../src/lib/local-work.ts');
  assert.notEqual(draftKey(id(50),id(90)),draftKey(id(51),id(90)));
  assert.notEqual(draftKey(id(50),id(90)),draftKey(id(50),id(91)));
  const qs=[{id:id(1),choices:[{id:id(11)}]}];
  const draft={revision:0,answers:{[id(1)]:id(11)},cooldownUntil:0};
  assert.deepEqual(parseLocalDraft(JSON.stringify(draft),qs),draft);
  assert.equal(parseLocalDraft('{broken',qs),null);
  assert.equal(parseLocalDraft(JSON.stringify({...draft,answers:{[id(1)]:id(21)}}),qs),null);
});
