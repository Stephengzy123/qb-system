import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parsePracticeInput,selectPracticeQuestions} from '../src/lib/error-practice-model.ts';
import {POST as practice} from '../src/app/api/error-practice/route.ts';
import {POST as close} from '../src/app/api/assignments/[assignmentId]/close/route.ts';
import {state} from './assignment-test-auth.mjs';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const now=Date.parse('2026-09-08T00:00:00Z');
const candidate=(n,errors=1,days=0)=>({version_id:id(n),grading_choice_id:id(n+10),errors,last_wrong:new Date(now-days*86400000),last_correct:null});
test('question count accepts every integer from 5 to 50 and rejects invalid input',()=>{
  for(let count=5;count<=50;count++)assert.equal(parsePracticeInput({count,requestId:id(1)}).count,count);
  for(const count of [0,2,4,51,5.5,'10',null])assert.throws(()=>parsePracticeInput({count,requestId:id(1)}));
  assert.throws(()=>parsePracticeInput({count:5,requestId:'invalid'}));
});
test('practice caps at available unique questions, including only two and none',()=>{
  const two=[candidate(1),candidate(2)];assert.equal(selectPracticeQuestions(two,50,now).length,2);
  assert.deepEqual(selectPracticeQuestions([],5,now),[]);
  const many=Array.from({length:60},(_,n)=>candidate(n+1));
  const selected=selectPracticeQuestions(many,50,now);assert.equal(selected.length,50);assert.equal(new Set(selected.map(q=>q.version_id)).size,50);
});
test('both repeated mistakes and recent mistakes are favoured while older mistakes remain possible',()=>{
  let seed=1234;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;};
  const pool=[candidate(1,1,90),candidate(2,1,0),candidate(3,4,0)];const counts=[0,0,0];
  for(let i=0;i<6000;i++){const q=selectPracticeQuestions(pool,1,now,random)[0];counts[pool.indexOf(q)]++;}
  assert.ok(counts[2]>counts[1]*2);assert.ok(counts[1]>counts[0]*2);assert.ok(counts[0]>0);
});
function setup(options={}) {
  const queries=[];state.user={id:id(50),role:'student',status:'active'};
  const query=async(sql,args)=>{
    queries.push([sql,args]);
    if(sql.startsWith('SELECT id,practice_student_id'))return {rows:options.previous?[{id:id(90),practice_student_id:options.other?id(51):id(50)}]:[]};
    if(sql.startsWith('SELECT aq.question_version_id'))return {rows:options.empty?[]:[candidate(1),candidate(2)]};
    if(sql.startsWith('INSERT INTO assignments'))return {rows:[{id:id(90)}]};
    if(sql.startsWith('SELECT a.status'))return {rows:options.noAccess?[]:[{status:options.closed?'closed':options.draft?'draft':'open',due_at:options.due?new Date():null}]};
    if(options.fail && sql.startsWith('INSERT INTO assignment_questions'))throw new Error('Simulated write failure');
    return {rows:[],rowCount:1};
  };state.database={connect:async()=>({query,release(){}})};return queries;
}
const start=()=>practice(new Request('http://localhost/api/error-practice',{method:'POST',body:JSON.stringify({count:50,requestId:id(80)})}));
const finish=()=>close(new Request('http://localhost/close',{method:'POST'}),{params:Promise.resolve({assignmentId:id(90)})});
test('practice creation is student-only',async()=>{setup();for(const user of [null,{role:'admin',status:'active'},{role:'student',status:'pending'}]){state.user=user;assert.equal((await start()).status,403);}});
test('practice creates just available questions and one private student attempt',async()=>{
  const queries=setup();const response=await start();assert.equal(response.status,201);assert.equal((await response.json()).questionCount,2);
  assert.equal(JSON.parse(queries.find(([sql])=>sql.startsWith('INSERT INTO assignment_questions'))[1][1]).length,2);
  assert.deepEqual(queries.find(([sql])=>sql.startsWith('INSERT INTO student_assignments'))[1],[id(90),id(50)]);
  assert.equal(queries.at(-1)[0],'COMMIT');
});
test('practice retries return the same work and reject another owner',async()=>{
  let queries=setup({previous:true});assert.equal((await start()).status,200);assert.ok(!queries.some(([sql])=>sql.startsWith('INSERT')));
  setup({previous:true,other:true});assert.equal((await start()).status,409);
});
test('empty error history and failed writes do not leave partial practice',async()=>{
  let queries=setup({empty:true});assert.equal((await start()).status,400);assert.equal(queries.at(-1)[0],'ROLLBACK');assert.ok(!queries.some(([sql])=>sql.startsWith('INSERT')));
  queries=setup({fail:true});assert.equal((await start()).status,500);assert.equal(queries.at(-1)[0],'ROLLBACK');
});
test('close requires staff and checks scope, status and missing due date',async()=>{
  setup();assert.equal((await finish()).status,403);
  for(const options of [{noAccess:true},{due:true},{draft:true}]){const queries=setup(options);state.user.role='teacher';assert.ok([404,409].includes((await finish()).status));assert.ok(!queries.some(([sql])=>sql.startsWith('UPDATE')));}
});
test('close records an audit event, serializes with submissions, and is idempotent',async()=>{
  let queries=setup();state.user.role='teacher';assert.equal((await finish()).status,200);
  assert.ok(queries.some(([sql])=>sql.includes('FOR UPDATE OF a')));assert.ok(queries.some(([sql])=>sql.startsWith('INSERT INTO audit_logs')));assert.equal(queries.at(-1)[0],'COMMIT');
  queries=setup({closed:true});state.user.role='admin';assert.equal((await finish()).status,200);assert.ok(!queries.some(([sql])=>sql.startsWith('UPDATE')));
});

const corrected=(n,errors=1)=>({...candidate(n,errors,7),last_correct:new Date(now)});
test('corrected mistakes form a small review portion even with many historical errors',()=>{
  const unresolved=Array.from({length:60},(_,n)=>candidate(n+1));
  const recovered=Array.from({length:60},(_,n)=>corrected(n+101,100));
  for(const count of [5,10,17,50]) {
    const selected=selectPracticeQuestions([...unresolved,...recovered],count,now);
    assert.equal(selected.length,count);
    assert.equal(selected.filter(q=>q.last_correct!==null).length,Math.round(count*0.2));
    assert.equal(new Set(selected.map(q=>q.version_id)).size,count);
  }
});
test('either pool fills shortages, including only corrected mistakes and only two available',()=>{
  const recovered=Array.from({length:20},(_,n)=>corrected(n+101));
  let selected=selectPracticeQuestions([candidate(1),candidate(2),...recovered],10,now);
  assert.equal(selected.length,10);assert.equal(selected.filter(q=>q.last_correct!==null).length,8);
  assert.equal(selectPracticeQuestions(recovered,10,now).length,10);
  assert.equal(selectPracticeQuestions(recovered.slice(0,2),50,now).length,2);
  selected=selectPracticeQuestions([...Array.from({length:20},(_,n)=>candidate(n+1)),corrected(101)],10,now);
  assert.equal(selected.length,10);assert.equal(selected.filter(q=>q.last_correct!==null).length,1);
});
test('a fresh mistake after a correct answer returns to the main practice pool',()=>{
  const relapsed={...candidate(1,3,0),last_correct:new Date(now-86400000)};
  const selected=selectPracticeQuestions([relapsed,...Array.from({length:20},(_,n)=>corrected(n+101))],5,now);
  assert.ok(selected.includes(relapsed));
});
