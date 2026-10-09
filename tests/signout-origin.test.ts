import {afterEach,expect,it,vi} from 'vitest';
import {NextRequest} from 'next/server';
import {middleware} from '../middleware';
afterEach(()=>vi.unstubAllEnvs());
it('allows same-origin sign-out but rejects opaque, missing and external origins',()=>{
 vi.stubEnv('DEPLOYMENT_MODE','production');vi.stubEnv('APP_URL','https://example.test');
 for(const origin of ['https://example.test','null',undefined,'https://external.test']){
  const request=new NextRequest('https://example.test/api/auth/logout',{method:'POST',headers:origin?{origin}:{}});
  const response=middleware(request);expect(response.status).toBe(origin==='https://example.test'?200:403);
  if(origin==='https://example.test')expect(response.headers.get('referrer-policy')).toBe('no-referrer');
 }
});
