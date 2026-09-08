import {test,expect} from '@playwright/test';
test('practice sends any integer count and preserves retry identity after a network failure',async({page})=>{
  const requests:{count:number;requestId:string}[]=[];
  await page.route('**/api/error-practice',async route=>{requests.push(route.request().postDataJSON());await route.fulfill({status:500,json:{error:'Please retry.'}});});
  await page.goto('/practice-demo');await page.getByLabel('Number of questions').fill('17');await page.getByRole('button',{name:'Start error practice'}).click();
  await expect(page.getByRole('alert').filter({hasText:'Please retry.'})).toHaveText('Please retry.');await page.getByRole('button',{name:'Start error practice'}).click();
  await expect.poll(()=>requests.length).toBe(2);expect(requests[0].count).toBe(17);expect(requests[1].requestId).toBe(requests[0].requestId);
});
test('close confirmation waits for the teacher and reports errors',async({page})=>{
  let calls=0;await page.route('**/close',async route=>{calls++;await route.fulfill({status:409,json:{error:'Already changed. Reload.'}});});
  await page.goto('/practice-demo');await page.getByRole('button',{name:'Close assignment',exact:true}).click();expect(calls).toBe(0);
  await page.getByRole('button',{name:'Confirm close'}).click();await expect(page.getByRole('alert').filter({hasText:'Already changed.'})).toHaveText('Already changed. Reload.');expect(calls).toBe(1);
});
test('admin appearance persists, resets and is absent for teachers',async({page})=>{
  await page.goto('/navigation-demo?role=admin');await page.getByText('Admin appearance (temporary)',{exact:true}).click();
  await page.getByLabel('Background style').selectOption('solid');await page.getByLabel('Start color').fill('#123456');
  await expect(page.locator('.app-shell')).toHaveCSS('background-color','rgb(18, 52, 86)');await page.reload();await expect(page.locator('.app-shell')).toHaveCSS('background-color','rgb(18, 52, 86)');
  await page.getByText('Admin appearance (temporary)',{exact:true}).click();await page.getByRole('button',{name:'Reset appearance'}).click();await expect(page.locator('.app-shell')).toHaveCSS('background-color','rgba(0, 0, 0, 0)');
  await page.goto('/navigation-demo?role=teacher');await expect(page.getByText('Admin appearance (temporary)',{exact:true})).toHaveCount(0);
});
test('practice controls stay within a narrow viewport',async({page})=>{
  await page.setViewportSize({width:375,height:812});await page.goto('/practice-demo');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const input=await page.getByLabel('Number of questions').boundingBox();expect(input!.width).toBeGreaterThan(100);
  await page.screenshot({path:'test-results/practice-mobile.png',fullPage:true});
});
for(const path of ['/create-assignment','/student-management','/navigation-demo?role=admin'])test(`form layout fits a phone at ${path}`,async({page})=>{
  await page.setViewportSize({width:375,height:812});await page.goto(path);
  if(path.includes('navigation'))await page.getByText('Admin appearance (temporary)',{exact:true}).click();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  for(const input of await page.locator('input:not([type=checkbox]):not([type=radio]):visible,textarea:visible,select:visible').all()){
    const box=await input.boundingBox();expect(box!.x).toBeGreaterThanOrEqual(0);expect(box!.x+box!.width).toBeLessThanOrEqual(375);expect(box!.height).toBeGreaterThanOrEqual(40);
  }
});
