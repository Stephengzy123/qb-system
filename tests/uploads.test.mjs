import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { pathParts, validSourcePath, imageType } from '../src/lib/upload-validation.ts';
import { getBrandingStorage } from '../src/lib/branding-storage.ts';
import { storeVerifiedImage } from '../src/lib/question-storage.ts';

test('nested destinations normalize whitespace and reject unsafe or empty segments',()=>{
  assert.deepEqual(pathParts(' Biology / Year 1 / Chapter 3 / The set '),['Biology','Year 1','Chapter 3','The set']);
  for(const path of ['Set only','/Folder/Set','Folder//Set','Folder/../Set','Folder/./Set','Folder/Set/','Folder\\bad/Set',null]) assert.throws(()=>pathParts(path));
});
test('folder-relative paths retain subfolders and disallow traversal',()=>{
  assert.equal(validSourcePath('Folder/Subfolder/Question10.png'),true);
  for(const path of ['../image.png','Folder/../../image.png','/image.png','Folder\\image.png','',null]) assert.equal(validSourcePath(path),false);
});
test('image signatures reject renamed text files',()=>{
  assert.equal(imageType(Buffer.from('not really an image.png')),null);
  assert.equal(imageType(Buffer.from([137,80,78,71,13,10,26,10,0,0,0,0])),'image/png');
  assert.equal(imageType(Buffer.from([255,216,255,0,0,0,0,0,0,0,0,0])),'image/jpeg');
  assert.equal(imageType(Buffer.from('RIFF0000WEBP')),'image/webp');
});
test('R2 success requires reading back exactly the uploaded bytes',async()=>{
  Object.assign(process.env,{R2_ACCOUNT_ID:'test',R2_ACCESS_KEY_ID:'test',R2_SECRET_ACCESS_KEY:'test',R2_BUCKET_NAME:'test'});
  const storage=getBrandingStorage();
  const original=storage.client.send;
  const body=Buffer.from('verified image bytes');
  let stored=body;
  const calls=[];
  storage.client.send=async command=>{
    calls.push(command.constructor.name);
    assert.equal(command.input.Key,'test/image');
    if(command.constructor.name==='PutObjectCommand') {assert.deepEqual(command.input.Body,body);return {};}
    return {Body:{transformToByteArray:async()=>stored}};
  };
  try {
    assert.equal(await storeVerifiedImage('test/image',body,'image/png'),createHash('sha256').update(body).digest('hex'));
    assert.deepEqual(calls,['PutObjectCommand','GetObjectCommand']);
    stored=Buffer.from('different image byte');
    await assert.rejects(storeVerifiedImage('test/image',body,'image/png'),/could not be verified/);
    storage.client.send=async()=>{throw new Error('R2 unavailable');};
    await assert.rejects(storeVerifiedImage('test/image',body,'image/png'),/R2 unavailable/);
  } finally {storage.client.send=original;}
});
