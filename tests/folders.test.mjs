import {test} from 'node:test';
import assert from 'node:assert/strict';
import {POST as folder} from '../src/app/api/folders/route.ts';
import {POST as upload} from '../src/app/api/question-imports/route.ts';
import {state} from './folder-test-auth.mjs';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const request=input=>new Request('http://localhost',{method:'POST',body:JSON.stringify(input)});
const create=(input={parentId:id(1),name:' Chapter 1 '})=>folder(request(input));
const start=(patch={})=>upload(request({folderId:id(1),setName:' Practice ',files:['Question.png'],choiceCount:4,...patch}));
function setup(options={}){
  const queries=[];state.user={id:id(50),role:'teacher',status:'active'};state.storage=true;
  const query=async(sql,args)=>{
    queries.push([sql,args]);
    if(sql.startsWith('SELECT f.id FROM folders'))return {rowCount:options.noAccess?0:1,rows:[{id:id(1)}]};
    if(sql.startsWith('SELECT 1 FROM folders')||sql.startsWith('SELECT 1 FROM question_sets'))return {rowCount:options.duplicate?1:0,rows:[]};
    if(sql.startsWith('INSERT INTO folders'))return {rows:[{id:id(2),parent_folder_id:args[0],name:args[1],can_upload:true}]};
    if(sql.startsWith('INSERT INTO question_sets'))return {rows:[{id:id(3)}]};
    if(sql.startsWith('INSERT INTO imports'))return {rows:[{id:id(4)}]};
    if(sql.startsWith('INSERT INTO import_files')){if(options.fail)throw new Error('Simulated failure');return {rows:[{id:id(5),source_path:args[1]}]};}
    return {rowCount:1,rows:[]};
  };state.database={connect:async()=>({query,release(){}})};return queries;
}
test('only active staff can create folders or upload sets',async()=>{
  for(const user of [null,{role:'student',status:'active'},{role:'teacher',status:'pending'}]){
    setup();state.user=user;assert.equal((await create()).status,403);assert.equal((await start()).status,403);
  }
});
test('folder creation trims the name, stays under the requested parent, and is audited',async()=>{
  const queries=setup();const response=await create();assert.equal(response.status,201);
  assert.equal((await response.json()).folder.name,'Chapter 1');
  assert.deepEqual(queries.find(([s])=>s.startsWith('INSERT INTO folders'))[1],[id(1),'Chapter 1',id(50)]);
  assert.ok(queries.some(([s])=>s.includes("'folder.created'")));assert.equal(queries.at(-1)[0],'COMMIT');
});
test('active staff can create a root folder but children require upload permission',async()=>{
  let queries=setup();assert.equal((await create({parentId:null,name:'Biology'})).status,201);
  assert.equal(queries.find(([s])=>s.startsWith('INSERT INTO folders'))[1][0],null);
  queries=setup({noAccess:true});assert.equal((await create()).status,403);assert.ok(!queries.some(([s])=>s.startsWith('INSERT')));
});
test('duplicate sibling folders are rejected inside a serialized transaction',async()=>{
  const queries=setup({duplicate:true});assert.equal((await create()).status,409);
  assert.ok(queries.some(([s])=>s.includes('pg_advisory_xact_lock')));
  assert.ok(queries.some(([s])=>s.includes('parent_folder_id IS NOT DISTINCT FROM')&&s.includes('lower(btrim(name))=lower($2)')));
  assert.ok(!queries.some(([s])=>s.startsWith('INSERT')));assert.equal(queries.at(-1)[0],'ROLLBACK');
});
test('paths, malformed names, and missing or forged folder identifiers are rejected',async()=>{
  setup();for(const input of [{parentId:id(1),name:'A/B'},{parentId:'bad',name:'Biology'},{name:'Biology'}])assert.equal((await create(input)).status,400);
  for(const patch of [{folderId:null},{folderId:'Biology'},{setName:'A/B'},{setName:''}])assert.equal((await start(patch)).status,400);
  assert.equal((await upload(request({path:'Biology / Set',files:['q.png'],choiceCount:4}))).status,400);
});
test('imports use only the chosen folder ID and never implicitly create folders',async()=>{
  const queries=setup();assert.equal((await start()).status,200);
  assert.deepEqual(queries.find(([s])=>s.startsWith('INSERT INTO question_sets'))[1],[id(1),'Practice',id(50)]);
  assert.ok(!queries.some(([s])=>s.startsWith('INSERT INTO folders')));assert.equal(queries.at(-1)[0],'COMMIT');
});
test('imports recheck access and duplicate names before writing',async()=>{
  let queries=setup({noAccess:true});assert.equal((await start()).status,403);assert.ok(!queries.some(([s])=>s.startsWith('INSERT')));
  queries=setup({duplicate:true});assert.equal((await start()).status,409);assert.ok(!queries.some(([s])=>s.startsWith('INSERT')));
  setup();state.storage=false;assert.equal((await start()).status,503);
});
test('failed import creation rolls back the set and job together',async()=>{
  const queries=setup({fail:true});assert.equal((await start()).status,500);assert.equal(queries.at(-1)[0],'ROLLBACK');
});
