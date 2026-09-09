import {test,expect} from '@playwright/test';
const id=(n:number)=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const key=(n:number)=>`qb-work:${id(50)}:${id(n)}`;
test('bin asks first and removes only the chosen local draft after server confirmation',async({page})=>{
  const calls:unknown[]=[];
  await page.route('**/api/assignments/*/work',async route=>{calls.push({method:route.request().method(),input:route.request().postDataJSON(),url:route.request().url()});await route.fulfill({json:{discarded:true,revision:4,deleted:false}});});
  await page.goto('/discard-demo');await page.evaluate(keys=>{for(const k of keys)localStorage.setItem(k,'draft');},[key(90),key(91)]);
  await page.getByRole('button',{name:'Discard progress on this assignment',exact:true}).click();
  await expect(page.getByRole('region',{name:'Confirm discard'})).toContainText('Your other work is unaffected');expect(calls).toHaveLength(0);
  await page.getByRole('button',{name:'Keep working',exact:true}).click();expect(calls).toHaveLength(0);
  await page.getByRole('button',{name:'Discard progress on this assignment',exact:true}).click();await page.getByRole('button',{name:'Discard progress',exact:true}).click();
  await expect.poll(()=>calls.length).toBe(1);
  await expect.poll(()=>page.evaluate(k=>localStorage.getItem(k),key(90))).toBeNull();
  expect(await page.evaluate(k=>localStorage.getItem(k),key(91))).toBe('draft');
  expect(calls[0]).toMatchObject({method:'DELETE',input:{revision:3}});
});
test('failed discard preserves progress and shows the server error',async({page})=>{
  await page.route('**/api/assignments/*/work',route=>route.fulfill({status:409,json:{error:'Submitted work cannot be discarded.'}}));
  await page.goto('/discard-demo');await page.evaluate(k=>localStorage.setItem(k,'draft'),key(90));
  await page.getByRole('button',{name:'Discard progress on this assignment',exact:true}).click();await page.getByRole('button',{name:'Discard progress',exact:true}).click();
  await expect(page.getByRole('alert').filter({hasText:'Submitted work'})).toBeVisible();expect(await page.evaluate(k=>localStorage.getItem(k),key(90))).toBe('draft');
});
test('practice has its own bin and confirmation fits on a phone',async({page})=>{
  await page.setViewportSize({width:375,height:812});await page.goto('/discard-demo');await page.getByRole('button',{name:'Delete unfinished error practice'}).click();
  await expect(page.getByRole('region',{name:'Confirm discard'})).toContainText('The unfinished practice will be removed.');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const box=await page.getByRole('button',{name:'Discard progress',exact:true}).boundingBox();expect(box!.y+box!.height).toBeLessThanOrEqual(812);
});
test('a discard signal disables an already-open editor and newer server state ignores old drafts',async({page})=>{
  await page.route('**/api/assignments/*/images/*',route=>route.fulfill({status:404}));
  await page.goto('/learn');await page.getByRole('group',{name:'Your choice for question 1'}).getByRole('radio',{name:'A',exact:true}).check();
  await page.evaluate(assignment=>window.dispatchEvent(new CustomEvent('qb-work-discarded',{detail:assignment})),id(90));
  await expect(page.getByRole('button',{name:'Submit answers'})).toHaveCount(0);
  await page.context().addCookies([{name:'test-work',value:encodeURIComponent(JSON.stringify({revision:1,discardedRevision:1,answers:[],status:'not_started'})),url:'http://127.0.0.1:3105'}]);
  await page.reload();await expect(page.getByRole('group',{name:'Your choice for question 1'}).getByRole('radio',{name:'Unanswered'})).toBeChecked();
  await expect(page.getByRole('region',{name:'Resolve local draft'})).toHaveCount(0);
});
