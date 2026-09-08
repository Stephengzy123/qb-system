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
  await page.goto('/navigation-demo?role=admin&settings=1');await page.getByText('Admin appearance (temporary)',{exact:true}).click();
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
for(const path of ['/create-assignment','/student-management','/navigation-demo?role=admin&settings=1'])test(`form layout fits a phone at ${path}`,async({page})=>{
  await page.setViewportSize({width:375,height:812});await page.goto(path);
  if(path.includes('navigation'))await page.getByText('Admin appearance (temporary)',{exact:true}).click();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  for(const input of await page.locator('input:not([type=checkbox]):not([type=radio]):visible,textarea:visible,select:visible').all()){
    const box=await input.boundingBox();expect(box!.x).toBeGreaterThanOrEqual(0);expect(box!.x+box!.width).toBeLessThanOrEqual(375);expect(box!.height).toBeGreaterThanOrEqual(40);
  }
});

test('palette controls stay in settings while the entire admin palette follows navigation',async({page})=>{
  await page.goto('/navigation-demo?role=admin');
  await expect(page.getByText('Admin appearance (temporary)',{exact:true})).toHaveCount(0);
  await page.getByRole('link',{name:'Test settings',exact:true}).click();
  await page.getByText('Admin appearance (temporary)',{exact:true}).click();
  await page.getByLabel('Start color').fill('#112233');await page.getByLabel('End color').fill('#445566');
  await page.getByLabel('Sidebar background',{exact:true}).fill('#abcdef');await page.getByLabel('Sidebar text',{exact:true}).fill('#123456');
  await page.getByLabel('Primary color',{exact:true}).fill('#aa1122');await page.getByLabel('Secondary color',{exact:true}).fill('#22bb33');await page.getByLabel('Accent color',{exact:true}).fill('#3344cc');
  await expect(page.locator('.sidebar')).toHaveCSS('background-color','rgb(171, 205, 239)');
  await expect(page.locator('.sidebar nav a.active')).toHaveCSS('background-color','rgb(51, 68, 204)');
  await expect(page.getByRole('button',{name:'Primary preview',exact:true})).toHaveCSS('background-color','rgb(170, 17, 34)');
  await expect(page.getByRole('button',{name:'Secondary preview',exact:true})).toHaveCSS('background-color','rgb(34, 187, 51)');
  await page.getByRole('button',{name:'Switch to dark mode'}).first().click();
  await expect(page.getByRole('button',{name:'Secondary preview',exact:true})).toHaveCSS('background-color','rgb(34, 187, 51)');
  await page.getByRole('link',{name:'Test overview',exact:true}).click();
  await expect(page.getByText('Admin appearance (temporary)',{exact:true})).toHaveCount(0);
  await expect(page.locator('.app-shell')).toHaveCSS('background-image','linear-gradient(135deg, rgb(17, 34, 51), rgb(68, 85, 102))');
  await expect(page.locator('.sidebar')).toHaveCSS('background-color','rgb(171, 205, 239)');
  await page.reload();await expect(page.locator('.sidebar')).toHaveCSS('background-color','rgb(171, 205, 239)');
  await page.goto('/navigation-demo?role=teacher&settings=1');
  await expect(page.getByText('Admin appearance (temporary)',{exact:true})).toHaveCount(0);
  await expect(page.locator('.app-shell')).not.toHaveAttribute('data-admin-appearance');
  await expect(page.locator('.sidebar')).toHaveCSS('background-color','rgb(17, 28, 54)');
  await page.goto('/learn');await expect(page.locator('[data-admin-appearance]')).toHaveCount(0);
});
test('previously saved gradients survive the palette upgrade',async({page})=>{
  await page.goto('/navigation-demo?role=admin');
  await page.evaluate(()=>localStorage.setItem('qb-admin-appearance',JSON.stringify({start:'#123456',end:'#654321',angle:90,style:'gradient',radius:20})));
  await page.reload();await expect(page.locator('.app-shell')).toHaveCSS('background-image','linear-gradient(90deg, rgb(18, 52, 86), rgb(101, 67, 33))');
  await page.getByRole('link',{name:'Test settings',exact:true}).click();await page.getByText('Admin appearance (temporary)',{exact:true}).click();
  await expect(page.getByLabel('Start color')).toHaveValue('#123456');
  await page.getByRole('button',{name:'Reset appearance'}).click();
  await expect(page.locator('.app-shell')).not.toHaveAttribute('data-admin-appearance');
});
