import {test,expect} from '@playwright/test';
const id=(n:number)=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j8mQAAAAASUVORK5CYII=','base64');
test.beforeEach(async({page})=>{await page.route('**/api/assignments/*/images/*',route=>route.fulfill({contentType:'image/png',body:png}));});
test('student selects MCQ, saves, reloads and submits to see overall and question results',async({page})=>{
  const requests:{action:string;revision:number;answers:unknown[]}[]=[];
  await page.route('**/api/assignments/*/work',async route=>{
    const input=route.request().postDataJSON();requests.push(input);
    const work={revision:input.revision+1,status:input.action==='submit'?'submitted':'in_progress',answers:input.answers};
    await route.fulfill({json:{revision:work.revision,status:work.status},headers:{'Set-Cookie':`test-work=${encodeURIComponent(JSON.stringify(work))}; Path=/`}});
  });
  await page.goto('/learn');
  await page.getByRole('group',{name:'Your choice for question 1'}).getByRole('radio',{name:'A',exact:true}).check();
  await page.getByRole('button',{name:'Save to cloud',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('Saved to cloud');
  await page.reload();
  await expect(page.getByRole('group',{name:'Your choice for question 1'}).getByRole('radio',{name:'A',exact:true})).toBeChecked();
  await page.getByRole('button',{name:'Submit assignment'}).click();
  await expect(page.getByRole('region',{name:'Confirm submission'})).toContainText('2 questions are unanswered');
  await page.getByRole('button',{name:'Confirm submission'}).click();
  await expect(page.getByRole('heading',{name:'Alex — Results'})).toBeVisible();
  await expect(page.getByText('50%',{exact:true})).toBeVisible();
  await expect(page.getByRole('cell',{name:'Incorrect',exact:true})).toBeVisible();
  await expect(page.getByRole('cell',{name:'Ungraded',exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Submit assignment'})).toHaveCount(0);
  expect(requests.map(r=>r.action)).toEqual(['save','submit']);expect(requests[1].revision).toBe(1);
});
test('failed save keeps selected answers and does not report submission',async({page})=>{
  await page.route('**/api/assignments/*/work',route=>route.fulfill({status:409,json:{error:'Your work changed in another tab. Reload to recover saved answers.'}}));
  await page.goto('/learn');
  const answer=page.getByRole('group',{name:'Your choice for question 1'}).getByRole('radio',{name:'B',exact:true});
  await answer.check();await page.getByRole('button',{name:'Save to cloud',exact:true}).click();
  await expect(page.getByRole('alert').filter({hasText:'Your work changed'})).toBeVisible();await expect(answer).toBeChecked();
  await expect(page.getByRole('button',{name:'Submit assignment'})).toBeEnabled();
});
test('class report and completed history link to individual and per-question results',async({page})=>{
  await page.goto('/results-demo');
  await expect(page.getByRole('heading',{name:'Class results'})).toBeVisible();
  await expect(page.getByText('1 of 2 students submitted')).toBeVisible();
  await expect(page.getByRole('link',{name:'Alex (@alex)'})).toHaveAttribute('href',`/admin/assignments/${id(90)}/students/${id(50)}`);
  await expect(page.getByRole('heading',{name:'By question'})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Completed assignments'})).toBeVisible();
  await expect(page.getByRole('link',{name:'Biology practice'})).toHaveAttribute('href',`/student/assignments/${id(90)}`);
  await page.getByRole('link',{name:'Question 2',exact:true}).click();
  await expect(page).toHaveURL(new RegExp(`#question-${id(2)}$`));
});
test('admin can find a duplicate, disable it with confirmation and restore it',async({page})=>{
  const changes:unknown[]=[];
  await page.route('**/api/admin/students/*',async route=>{
    const input=route.request().postDataJSON();changes.push(input);
    await route.fulfill({json:{saved:true},headers:{'Set-Cookie':`test-disabled=${input.disabled?'yes':'no'}; Path=/`}});
  });
  await page.goto('/student-management');
  await page.getByLabel('Find a student').fill('alex2');
  await expect(page.getByRole('link',{name:'Alex',exact:true})).toHaveAttribute('href',`/admin/students/${id(50)}`);
  await page.getByLabel('Duplicate of (optional)').selectOption(id(51));
  await page.getByRole('button',{name:'Disable account',exact:true}).click();
  await expect(page.getByText('Disable this account and end its active sessions?')).toBeVisible();
  await page.getByRole('button',{name:'Confirm disable'}).click();
  await expect(page.getByRole('button',{name:'Restore account'})).toBeVisible();
  await expect(page.getByRole('link',{name:'retained student account'})).toHaveAttribute('href',`/admin/students/${id(51)}`);
  await page.getByRole('button',{name:'Restore account'}).click();
  await expect(page.getByRole('button',{name:'Disable account',exact:true})).toBeVisible();
  expect(changes).toEqual([{disabled:true,duplicateOf:id(51)},{disabled:false,duplicateOf:null}]);
});
test('Students navigation is admin-only',async({page})=>{
  await page.goto('/navigation-demo?role=admin');
  await expect(page.getByRole('navigation',{name:'Main navigation'}).getByRole('link',{name:'Students'})).toBeVisible();
  await page.goto('/navigation-demo?role=teacher');
  await expect(page.getByRole('navigation',{name:'Main navigation'}).getByRole('link',{name:'Students'})).toHaveCount(0);
});

test('answer actions autosave locally without a request and survive reload',async({page})=>{
  let requests=0;
  await page.route('**/api/assignments/*/work',route=>{requests++;return route.abort();});
  await page.goto('/learn');
  const answer=page.getByRole('group',{name:'Your choice for question 1'}).getByRole('radio',{name:'B',exact:true});
  await answer.check();
  await expect(page.getByText('Saved on this device.',{exact:false})).toBeVisible();
  await page.reload();await expect(answer).toBeChecked();expect(requests).toBe(0);
  await page.getByRole('group',{name:'Your choice for question 1'}).getByRole('radio',{name:'Unanswered'}).check();
  await page.reload();await expect(page.getByRole('group',{name:'Your choice for question 1'}).getByRole('radio',{name:'Unanswered'})).toBeChecked();
});

test('cloud save has a persisted countdown while submission stays available',async({page})=>{
  await page.clock.install();
  await page.route('**/api/assignments/*/work',async route=>{
    const input=route.request().postDataJSON();
    const work={revision:input.revision+1,status:'in_progress',answers:input.answers};
    await route.fulfill({json:{revision:work.revision,status:work.status,retryAfterSeconds:30},headers:{'Set-Cookie':`test-work=${encodeURIComponent(JSON.stringify(work))}; Path=/`}});
  });
  await page.goto('/learn');
  await page.getByRole('group',{name:'Your choice for question 1'}).getByRole('radio',{name:'A',exact:true}).check();
  await page.getByRole('button',{name:'Save to cloud',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('Saved to cloud');
  await page.getByRole('group',{name:'Your choice for question 2'}).getByRole('radio',{name:'B',exact:true}).check();
  await expect(page.getByRole('button',{name:/Save to cloud \(/})).toBeDisabled();
  await expect(page.getByRole('button',{name:'Submit assignment'})).toBeEnabled();
  await page.reload();await expect(page.getByRole('button',{name:/Save to cloud \(/})).toBeDisabled();
  await page.clock.fastForward(31000);
  await expect(page.getByRole('button',{name:'Save to cloud',exact:true})).toBeEnabled();
});

test('storage failure is visible and cloud saving remains available',async({page})=>{
  await page.addInitScript(()=>{Storage.prototype.setItem=function(){throw new Error('Storage blocked');};});
  await page.goto('/learn');
  await page.getByRole('group',{name:'Your choice for question 1'}).getByRole('radio',{name:'A',exact:true}).check();
  await expect(page.getByText('Local saving is unavailable.',{exact:false})).toBeVisible();
  await expect(page.getByRole('button',{name:'Save to cloud',exact:true})).toBeEnabled();
});

test('newer cloud work is not silently overwritten by an older local draft',async({page,context})=>{
  await page.goto('/learn');
  await page.evaluate(({student,assignment,q1,q2,q3,choice})=>localStorage.setItem(`qb-work:${student}:${assignment}`,JSON.stringify({revision:0,cooldownUntil:0,answers:{[q1]:choice,[q2]:null,[q3]:null}})),{student:id(50),assignment:id(90),q1:id(1),q2:id(2),q3:id(3),choice:id(12)});
  const cloud={revision:1,status:'in_progress',answers:[{questionId:id(1),choiceId:id(11)}]};
  await context.addCookies([{name:'test-work',value:encodeURIComponent(JSON.stringify(cloud)),url:'http://127.0.0.1:3105'}]);
  await page.reload();
  await expect(page.getByRole('region',{name:'Resolve local draft'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Submit assignment'})).toBeDisabled();
  await page.getByRole('button',{name:'Use local answers'}).click();
  await expect(page.getByRole('group',{name:'Your choice for question 1'}).getByRole('radio',{name:'B',exact:true})).toBeChecked();
  await expect(page.getByRole('button',{name:'Save to cloud',exact:true})).toBeEnabled();
});
