import { test, expect } from '@playwright/test';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { zipSync } from 'fflate';
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j8mQAAAAASUVORK5CYII=','base64');

test('folder upload preserves nested names, reviews, warns, and retries only failed images',async({page})=>{
  const directory=await mkdtemp(path.join(os.tmpdir(),'qb-folder-'));
  try {
    await mkdir(path.join(directory,'Nested'));
    await writeFile(path.join(directory,'Nested','Question10.png'),png);
    await writeFile(path.join(directory,'Nested','Question2.png'),png);
    await writeFile(path.join(directory,'notes.txt'),'not an image');
    const attempts:Record<string,number>={};
    let created=0;
    await page.route('**/api/question-imports',async route=>{
      created++;
      const data=route.request().postDataJSON();
      expect(data.path).toBe('Biology / Year 1 / Chapter 3 / Practice set');
      expect(data.files).toHaveLength(2);
      expect(data.files[0]).toMatch(/Nested\/Question2.png$/);
      expect(data.files[1]).toMatch(/Nested\/Question10.png$/);
      await route.fulfill({json:{id:'test-import',files:data.files.map((source_path:string,index:number)=>({source_path,id:`file-${index}`}))}});
    });
    await page.route('**/api/question-imports/test-import/files/*',async route=>{
      const id=route.request().url().split('/').at(-1)!;
      attempts[id]=(attempts[id]??0)+1;
      if(id==='file-1'&&attempts[id]===1) await route.fulfill({status:422,json:{error:'Upload to R2 could not be verified. Retry this file.'}});
      else await route.fulfill({json:{status:'succeeded',assetId:id}});
    });
    await page.route('**/api/question-assets/*',route=>route.fulfill({contentType:'image/png',body:png}));
    await page.goto('/');
    await page.getByLabel('Folder (includes subfolders)').setInputFiles(directory);
    await expect(page.getByRole('button',{name:'Continue to review'})).toBeEnabled();
    await expect(page.getByText('Skipped: Unsupported file.')).toBeVisible();
    await page.getByLabel('Destination path, including set name').fill('Biology / Year 1 / Chapter 3 / Practice set');
    await page.getByRole('button',{name:'Continue to review'}).click();
    await expect(page.getByRole('heading',{name:'Review 2 images'})).toBeVisible();
    await page.getByRole('button',{name:'Confirm and upload 2 images'}).click();
    await expect(page.getByRole('heading',{name:'Upload needs attention'})).toBeVisible();
    await expect(page.getByRole('status')).toContainText('1 of 2 images verified');
    await page.getByRole('button',{name:'Retry failed files'}).click();
    await expect(page.getByRole('heading',{name:'Upload needs attention'})).toBeVisible();
    await expect(page.getByText('All selected valid images are uploaded and verified.')).toBeVisible();
    expect(created).toBe(1);expect(attempts).toEqual({'file-0':1,'file-1':2});
    await expect(page.getByRole('link',{name:'Review saved upload'})).toHaveAttribute('href','/admin/question-bank/imports/test-import');
  } finally {await rm(directory,{recursive:true,force:true});}
});

test('ZIP preview, destination validation, and backend failures remain actionable',async({page})=>{
  await page.goto('/');
  const zip=zipSync({'Folder/Question2.png':png,'Folder/readme.txt':Buffer.from('notes')});
  await page.getByLabel('Images or ZIP').setInputFiles({name:'questions.zip',mimeType:'application/zip',buffer:Buffer.from(zip)});
  await expect(page.getByRole('button',{name:'Continue to review'})).toBeEnabled();
  await page.getByLabel('Destination path, including set name').fill('Biology/../set');
  await page.getByRole('button',{name:'Continue to review'}).click();
  await expect(page.getByText('Use a folder and set name separated')).toBeVisible();
  await page.getByLabel('Destination path, including set name').fill('Biology / New set');
  await page.getByRole('button',{name:'Continue to review'}).click();
  await page.route('**/api/question-imports',route=>route.fulfill({status:503,json:{error:'R2 storage is not configured.'}}));
  await page.getByRole('button',{name:'Confirm and upload 1 images'}).click();
  await expect(page.getByText('R2 storage is not configured.')).toBeVisible();
  await expect(page.getByRole('button',{name:'Confirm and upload 1 images'})).toBeEnabled();
});

test('upload warns against leaving, keeps final result, and restores saved review after return', async ({ page }) => {
  let release: () => void = () => undefined;
  const held = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/api/question-imports', route => route.fulfill({json:{id:'last-upload',files:[{id:'file',source_path:'Question.png'}]}}));
  await page.route('**/api/question-imports/last-upload/files/file', async route => {
    await held;
    await route.fulfill({json:{status:'succeeded',assetId:'image'}});
  });
  await page.route('**/api/question-assets/*', route => route.fulfill({contentType:'image/png',body:png}));
  await page.route('**/api/question-imports/last-upload', route => route.fulfill({json:{id:'last-upload',source_name:'Practice',total_files:1,succeeded_files:1,failed_files:0,status:'completed'}}));
  await page.goto('/');
  await page.getByLabel('Images or ZIP').setInputFiles({name:'Question.png',mimeType:'image/png',buffer:png});
  await page.getByLabel('Destination path, including set name').fill('Biology / Practice');
  await page.getByRole('button',{name:'Continue to review'}).click();
  await page.getByRole('button',{name:'Confirm and upload 1 images'}).click();
  await expect(page.getByRole('heading',{name:'Please keep this page open'})).toBeVisible();
  expect(await page.evaluate(() => {
    const event = new Event('beforeunload', {cancelable:true}); window.dispatchEvent(event); return event.defaultPrevented;
  })).toBe(true);
  release();
  await expect(page.getByRole('heading',{name:'Upload complete', exact:true})).toBeVisible();
  await expect(page.getByText('It is now safe to leave this page.',{exact:false})).toBeVisible();
  expect(await page.evaluate(() => {
    const event = new Event('beforeunload', {cancelable:true}); window.dispatchEvent(event); return event.defaultPrevented;
  })).toBe(false);
  await page.reload();
  await expect(page.getByRole('heading',{name:'Your previous upload is complete'})).toBeVisible();
  await expect(page.getByRole('link',{name:'Review upload results'})).toHaveAttribute('href','/admin/question-bank/imports/last-upload');
});
