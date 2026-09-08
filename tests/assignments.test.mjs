import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {parseAssignmentInput,combineAssignmentQuestions} from '../src/lib/assignment-model.ts';
import {POST} from '../src/app/api/assignments/route.ts';
import {state} from './assignment-test-auth.mjs';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const input={requestId:id(99),title:'Practice',instructions:'Read each question.',setIds:[id(1),id(2)],classIds:[id(10),id(11)],dueAt:null};
const sources=[{set_id:id(1),version_id:id(21),position:0,grading_choice_id:id(31)},{set_id:id(2),version_id:id(22),position:0,grading_choice_id:null}];
const call=(value=input)=>POST(new Request('http://localhost/api/assignments',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(value)}));
function setup(options={}) {
  const queries=[];let count=0;
  state.user={id:id(50),role:'teacher',status:'active'};
  state.database={connect:async()=>({release(){},async query(sql,args){
    queries.push([sql,args]);
    if(sql.startsWith('SELECT created_by,request_hash')) return {rows:options.replay?[{created_by:id(50),request_hash:createHash('sha256').update(JSON.stringify(parseAssignmentInput(input))).digest('hex')}]:[]};
    if(sql.startsWith('SELECT c.id,c.name')) return {rowCount:options.forbiddenClass?1:2,rows:[{id:id(10),name:'Class A'},{id:id(11),name:'Class B'}]};
    if(sql.startsWith('SELECT s.id')) return {rowCount:options.forbiddenSet?1:2,rows:[]};
    if(sql.startsWith('SELECT sq.set_id')) return {rows:options.empty?[]:sources};
    if(sql.startsWith('INSERT INTO assignments(')) {count++;if(options.failSecond&&count===2)throw new Error('Simulated second-class failure');return {rows:[{id:id(60+count)}]};}
    if(sql.startsWith('SELECT a.id,c.name')) return {rows:[{id:id(61),class_name:'Class A'},{id:id(62),class_name:'Class B'}]};
    return {rows:[],rowCount:1};
  }})};return queries;
}
test('validate nonempty unique sets/classes, titles and due dates',()=>{
  assert.deepEqual(parseAssignmentInput(input),input);
  for(const patch of [{setIds:[]},{classIds:[]},{setIds:[id(1),id(1)]},{classIds:['invalid']},{title:' '},{dueAt:'invalid'}]) assert.throws(()=>parseAssignmentInput({...input,...patch}));
});
test('combine sets in selected order, deduplicate questions and keep available grading keys',()=>{
  const combined=combineAssignmentQuestions([id(2),id(1)],[...sources,{...sources[0],set_id:id(2),grading_choice_id:null,position:1}]);
  assert.deepEqual(combined.map(q=>q.version_id),[id(22),id(21)]);assert.equal(combined[1].grading_choice_id,id(31));
});
test('empty sets and conflicting grading keys cannot create an assignment',()=>{
  assert.throws(()=>combineAssignmentQuestions([id(1),id(2)],[sources[0]]),/no verified questions/);
  assert.throws(()=>combineAssignmentQuestions([id(1),id(2)],[sources[0],{...sources[0],set_id:id(2),grading_choice_id:id(32)}]),/different correct choices/);
});
test('students and signed-out callers cannot assign work',async()=>{
  setup();state.database=null;state.user=null;assert.equal((await call()).status,403);
  state.user={role:'student',status:'active'};assert.equal((await call()).status,403);
});
test('forged class or set access rolls back without creating any assignments',async()=>{
  for(const options of [{forbiddenClass:true},{forbiddenSet:true}]) {
    const queries=setup(options);assert.equal((await call()).status,403);
    assert.ok(queries.some(([sql])=>sql==='ROLLBACK'));assert.ok(!queries.some(([sql])=>sql.startsWith('INSERT')));
  }
});
test('multi-set multi-class assignment snapshots questions, records sources and enrolls active students',async()=>{
  const queries=setup();const response=await call();assert.equal(response.status,201);
  assert.equal((await response.json()).assignments.length,2);
  assert.equal(queries.filter(([sql])=>sql.startsWith('INSERT INTO assignments(')).length,2);
  assert.equal(queries.filter(([sql])=>sql.startsWith('INSERT INTO assignment_sets')).length,2);
  assert.equal(queries.filter(([sql])=>sql.startsWith('INSERT INTO student_assignments')).length,2);
  const snapshot=queries.find(([sql])=>sql.startsWith('INSERT INTO assignment_questions'));
  assert.equal(JSON.parse(snapshot[1][1])[0].grading_choice_id,id(31));
  assert.ok(queries.some(([sql])=>sql==='COMMIT'));
});
test('retry returns saved assignments without inserting duplicates',async()=>{
  const queries=setup({replay:true});const response=await call();assert.equal(response.status,200);
  assert.equal((await response.json()).assignments.length,2);assert.ok(!queries.some(([sql])=>sql.startsWith('INSERT')));
});
test('empty sources and past deadlines are rejected before writes',async()=>{
  let queries=setup({empty:true});assert.equal((await call()).status,400);assert.ok(!queries.some(([sql])=>sql.startsWith('INSERT')));
  queries=setup();assert.equal((await call({...input,dueAt:'2000-01-01T00:00:00.000Z'})).status,400);
});
test('failure in a later class rolls back the entire batch',async()=>{
  const queries=setup({failSecond:true});const original=console.error;console.error=()=>{};
  try{assert.equal((await call()).status,500);}finally{console.error=original;}
  assert.ok(queries.some(([sql])=>sql==='ROLLBACK'));assert.ok(!queries.some(([sql])=>sql==='COMMIT'));
});
