import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validAnswerChanges, folderAncestors } from '../src/lib/question-bank-model.ts';
import { PATCH } from '../src/app/api/question-sets/[setId]/answers/route.ts';
import { state } from './answer-test-auth.mjs';
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const change = {questionId:id(1),versionId:id(2),choiceId:id(3),previousChoiceId:null};
const call = answers => PATCH(new Request('http://localhost/api/answers',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({answers})}),{params:Promise.resolve({setId:id(9)})});
function setup(options={}) {
  const queries=[];
  state.user={id:id(10),role:'teacher',status:'active'};
  const client={
    release(){queries.push(['RELEASE']);},
    async query(sql,args){
      queries.push([sql,args]);
      if(sql.includes('SELECT s.id FROM question_sets')) return {rowCount:options.forbidden?0:1,rows:[]};
      if(sql.includes('SELECT q.current_version_id')) return {rowCount:1,rows:[{version_id:options.version??id(2),correct_choice_id:options.previous??null}]};
      if(sql.includes('SELECT 1 FROM question_choices')) return {rowCount:options.badChoice?0:1,rows:[]};
      if(options.failWrite && sql.includes('INSERT INTO question_set_answers')) throw new Error('Simulated database failure');
      return {rowCount:1,rows:[]};
    },
  };
  state.database={connect:async()=>client};
  return queries;
}
test('answer payload rejects duplicate questions, missing versions and malformed choice IDs',()=>{
  assert.equal(validAnswerChanges([change]),true);
  assert.equal(validAnswerChanges([{...change,choiceId:null}]),true);
  for(const input of [[],[change,change],[{...change,versionId:undefined}],[{...change,choiceId:'A'}],[{...change,previousChoiceId:undefined}]]) assert.equal(validAnswerChanges(input),false);
});
test('breadcrumbs follow folder IDs even when names repeat',()=>{
  const folders=[{id:'a',name:'Topic',parent_folder_id:null},{id:'b',name:'Topic',parent_folder_id:'a'}];
  assert.deepEqual(folderAncestors(folders,'b').map(f=>f.id),['a','b']);
});
test('students and signed-out callers cannot update answers',async()=>{
  setup();state.database=null;
  state.user=null;assert.equal((await call([change])).status,403);
  state.user={role:'student',status:'active'};assert.equal((await call([change])).status,403);
});
test('staff without edit access cannot write answers',async()=>{
  const queries=setup({forbidden:true});
  assert.equal((await call([change])).status,403);
  assert.ok(queries.some(([sql])=>sql==='ROLLBACK'));
  assert.ok(!queries.some(([sql])=>sql.startsWith('INSERT')));
});
test('answers save with audit history in one transaction',async()=>{
  const queries=setup();
  const response=await call([change]);
  assert.equal(response.status,200);
  assert.deepEqual(await response.json(),{saved:1});
  assert.ok(queries.some(([sql])=>sql.includes('INSERT INTO question_set_answers')));
  assert.ok(queries.some(([sql])=>sql.includes('INSERT INTO audit_logs')));
  assert.ok(queries.some(([sql])=>sql==='COMMIT'));
});
test('stale choices or changed versions are rejected without overwriting answers',async()=>{
  for(const options of [{previous:id(4)},{version:id(5)}]) {
    const queries=setup(options);
    assert.equal((await call([change])).status,409);
    assert.ok(queries.some(([sql])=>sql==='ROLLBACK'));
    assert.ok(!queries.some(([sql])=>sql.startsWith('INSERT')));
  }
});
test('a choice from another question cannot be saved',async()=>{
  const queries=setup({badChoice:true});
  assert.equal((await call([change])).status,400);
  assert.ok(queries.some(([sql])=>sql==='ROLLBACK'));
});
test('clearing an answer deletes only its set-question key',async()=>{
  const queries=setup({previous:id(3)});
  assert.equal((await call([{...change,choiceId:null,previousChoiceId:id(3)}])).status,200);
  assert.ok(queries.some(([sql,args])=>sql==='DELETE FROM question_set_answers WHERE set_question_id=$1' && args[0]===id(1)));
});
