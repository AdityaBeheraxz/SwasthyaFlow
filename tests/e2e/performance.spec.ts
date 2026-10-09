import {test,expect} from '@playwright/test';
test('queue opening shares the staff session check and avoids a background health query',async({page})=>{
 expect((await page.request.post('/api/auth/credentials',{data:{username:'health.worker',password:'HealthWorker!2026'}})).status()).toBe(200);
 const requests:string[]=[];page.on('request',request=>{const path=new URL(request.url()).pathname;if(path.startsWith('/api/'))requests.push(path);});
 await page.goto('/queue');await expect(page.getByRole('heading',{name:'Reviewer queue'})).toBeVisible();
 await expect(page.locator('table')).toBeVisible();
 expect(requests.filter(path=>path==='/api/session')).toHaveLength(1);
 expect(requests.filter(path=>path==='/api/health')).toHaveLength(0);
 expect(await page.locator('link[rel="preload"][as="font"]').count()).toBeLessThanOrEqual(2);
});
