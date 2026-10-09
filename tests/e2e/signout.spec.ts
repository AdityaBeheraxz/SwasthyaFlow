import {test,expect} from '@playwright/test';
test('desktop and mobile sign-out clear the session and handle rejection within the page',async({page})=>{
 test.setTimeout(180000);
 const password=process.env.E2E_HEALTH_WORKER_PASSWORD;if(!password)throw Error('Set E2E_HEALTH_WORKER_PASSWORD for the local test account.');
 for(const mobile of [false,true]){
  await page.setViewportSize(mobile?{width:900,height:700}:{width:1600,height:900});
  expect((await page.request.post('/api/auth/credentials',{data:{username:'health.worker',password}})).status()).toBe(200);
  await page.goto('/');
  if(mobile)await page.getByRole('button',{name:'Open navigation'}).click();
  const button=page.getByRole('button',{name:'Sign out',exact:true});await expect(button).toBeVisible();
  if(!mobile){
   await page.route('**/api/auth/logout',route=>route.fulfill({status:403,contentType:'application/json',body:JSON.stringify({ok:false,error:{code:'ORIGIN_REJECTED',message:'Request origin was rejected.'}})}));
   await button.click();await expect(page.getByRole('alert').filter({hasText:'Request origin was rejected.'})).toBeVisible();
   expect(new URL(page.url()).pathname).toBe('/');expect((await (await page.request.get('/api/session')).json()).data).not.toBeNull();
   await page.unroute('**/api/auth/logout');
  }
  await page.evaluate(()=>localStorage.setItem('sf_simulate_offline','1'));
  const sent=page.waitForRequest(request=>request.url().endsWith('/api/auth/logout'));
  const received=page.waitForResponse(response=>response.url().endsWith('/api/auth/logout'));
  await button.click();const request=await sent,response=await received;
  expect(response.status()).toBe(200);expect(await request.headerValue('origin')).toBe(new URL(page.url()).origin);
  await expect(page.getByRole('button',{name:'Sign out',exact:true})).toHaveCount(0);
  await expect.poll(async()=>(await (await page.request.get('/api/session')).json()).data).toBeNull();
  expect((await page.request.get('/api/queue')).status()).toBe(401);
  expect(await page.evaluate(()=>localStorage.getItem('sf_simulate_offline'))).toBeNull();
 }
});
