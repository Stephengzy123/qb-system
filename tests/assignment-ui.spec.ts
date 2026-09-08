import { test,expect } from '@playwright/test';
const id=(n:number)=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
async function select(page:import('@playwright/test').Page) {
  await page.goto('/create-assignment');
  await page.getByLabel('Assignment title',{exact:true}).fill('Biology practice');
  await page.getByRole('checkbox',{name:/Cells/}).check();
  await page.getByRole('checkbox',{name:/Genetics/}).check();
  await page.getByRole('checkbox',{name:/Class A/}).check();
  await page.getByRole('checkbox',{name:/Class B/}).check();
  await page.getByRole('button',{name:'Continue to review'}).click();
}
test('assign multiple existing sets to multiple classes with a review and success links',async({page})=>{
  let received:Record<string,unknown>|undefined;
  await page.route('**/api/assignments',async route=>{received=route.request().postDataJSON();await route.fulfill({status:201,json:{assignments:[{id:'a',class_name:'Class A'},{id:'b',class_name:'Class B'}]}});});
  await select(page);
  await expect(page.getByRole('heading',{name:'Review assignment'})).toBeVisible();
  await expect(page.getByText('The selected sets will be combined')).toBeVisible();
  await expect(page.getByText('2 questions across the selected sets have no correct choice yet.')).toBeVisible();
  await page.getByRole('button',{name:'Assign to 2 classes'}).click();
  await expect(page.getByRole('heading',{name:'Assignments published'})).toBeVisible();
  expect(received?.setIds).toEqual([id(1),id(2)]);expect(received?.classIds).toEqual([id(10),id(11)]);
  await expect(page.getByRole('link',{name:'Biology practice — Class A'})).toHaveAttribute('href','/admin/assignments/a');
  await expect(page.getByRole('link',{name:'Biology practice — Class B'})).toHaveAttribute('href','/admin/assignments/b');
});
test('empty sets cannot be chosen and onboarding depends on actual available data',async({page})=>{
  await page.goto('/create-assignment');
  await expect(page.getByRole('checkbox',{name:/Pending upload/})).toBeDisabled();
  await expect(page.getByRole('button',{name:'Continue to review'})).toBeDisabled();
  await page.goto('/create-assignment?empty=classes');
  await expect(page.getByRole('heading',{name:'Add a class first'})).toBeVisible();
  await page.goto('/create-assignment?empty=sets');
  await expect(page.getByRole('heading',{name:'Add a question set first'})).toBeVisible();
});
test('retrying an uncertain creation reuses the same request and preserves selections',async({page})=>{
  const attempts:unknown[]=[];
  await page.route('**/api/assignments',async route=>{
    attempts.push(route.request().postDataJSON());
    if(attempts.length===1) await route.abort();
    else await route.fulfill({json:{assignments:[{id:'a',class_name:'Class A'},{id:'b',class_name:'Class B'}]}});
  });
  await select(page);
  await page.getByRole('button',{name:'Assign to 2 classes'}).click();
  await expect(page.getByText('The result has not been confirmed.')).toBeVisible();
  await expect(page.getByRole('button',{name:'Back to edit'})).toBeDisabled();
  await page.getByRole('button',{name:'Assign to 2 classes'}).click();
  await expect(page.getByRole('heading',{name:'Assignments published'})).toBeVisible();
  expect(attempts).toHaveLength(2);expect(attempts[1]).toEqual(attempts[0]);
});
