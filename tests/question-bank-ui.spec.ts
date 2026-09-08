import { test, expect } from '@playwright/test';
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j8mQAAAAASUVORK5CYII=','base64');

test('browse nested folders, open a set, and save or clear correct choices', async ({ page }) => {
  await page.route('**/api/question-assets/*', route => route.fulfill({contentType:'image/png',body:png}));
  const requests: unknown[] = [];
  await page.route('**/api/question-sets/practice/answers', async route => {
    requests.push(route.request().postDataJSON());
    await route.fulfill({json:{saved:1}});
  });
  await page.goto('/admin/question-bank');
  await page.getByRole('navigation',{name:'Folder tree'}).getByRole('link',{name:'Chapter 3'}).click();
  await expect(page.getByRole('navigation',{name:'Folder path'})).toContainText('Biology/Year 1/Chapter 3');
  await page.getByRole('link',{name:/Practice set.*2 questions/}).click();
  await expect(page.getByRole('heading',{name:'Practice set',exact:true})).toBeVisible();
  await expect(page.getByText('1 of 2 questions have a saved answer.')).toBeVisible();
  await page.getByRole('group',{name:'Correct choice for question 1'}).getByRole('radio',{name:'B',exact:true}).check();
  await expect(page.getByText('1 unsaved changes')).toBeVisible();
  await page.getByRole('button',{name:'Save answer key'}).click();
  await expect(page.getByRole('status')).toHaveText('Answer key saved.');
  await expect(page.getByText('2 of 2 questions have a saved answer.')).toBeVisible();
  expect(requests[0]).toEqual({answers:[{questionId:'q1',versionId:'v1',choiceId:'b1',previousChoiceId:null}]});
  await page.getByRole('group',{name:'Correct choice for question 2'}).getByRole('radio',{name:'Not set'}).check();
  await page.getByRole('button',{name:'Save answer key'}).click();
  await expect(page.getByRole('button',{name:'Save answer key'})).toBeDisabled();
  expect(requests[1]).toEqual({answers:[{questionId:'q2',versionId:'v2',choiceId:null,previousChoiceId:'a2'}]});
});

test('failed saves preserve edits and read-only sets cannot be edited', async ({ page }) => {
  await page.route('**/api/question-assets/*', route => route.fulfill({contentType:'image/png',body:png}));
  await page.route('**/api/question-sets/practice/answers', route => route.fulfill({status:409,json:{error:'This set changed since you opened it. Reload the page and review the current answers before saving.'}}));
  await page.goto('/admin/question-bank/sets/practice');
  const answer = page.getByRole('group',{name:'Correct choice for question 1'}).getByRole('radio',{name:'A',exact:true});
  await answer.check();
  await page.getByRole('button',{name:'Save answer key'}).click();
  await expect(page.getByRole('alert').filter({hasText:'This set changed'})).toContainText('This set changed');
  await expect(answer).toBeChecked();
  await expect(page.getByText('1 unsaved changes')).toBeVisible();
  page.on('dialog', dialog => dialog.accept());
  await page.goto('/admin/question-bank/sets/practice?readonly=1');
  await expect(page.getByRole('button',{name:'Save answer key'})).toHaveCount(0);
  await expect(page.getByRole('radio',{name:'A',exact:true}).first()).toBeDisabled();
});

test('empty folders remain navigable and missing images show a warning', async ({ page }) => {
  await page.goto('/admin/question-bank?folder=empty');
  await expect(page.getByRole('heading',{name:'This folder is empty'})).toBeVisible();
  await page.route('**/api/question-assets/*', route => route.fulfill({status:502,body:''}));
  await page.goto('/admin/question-bank/sets/practice');
  await expect(page.getByText('The question image is unavailable.',{exact:false}).first()).toBeVisible();
});
