import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {PGlite} from '@electric-sql/pglite';
import {drizzle} from 'drizzle-orm/pglite';
import {migrate} from 'drizzle-orm/pglite/migrator';
import {eq} from 'drizzle-orm';
import {auditLogs,facilities,users} from '../db/schema';
const state=vi.hoisted(()=>({cookies:new Map<string,string>(),conn:null as unknown}));
vi.mock('server-only',()=>({}));
vi.mock('next/headers',()=>({cookies:async()=>({get:(key:string)=>{const value=state.cookies.get(key);return value?{value}:undefined;}})}));
vi.mock('@/lib/db/server',()=>({db:async()=>state.conn}));
import {session,signSession,type Actor} from '../lib/auth';
import {clinicalReviewerSession,signReviewer} from '../lib/reviewer-auth';
import {referralWorkspaceSession,signReferralWorkspace} from '../lib/referral-workspace-auth';
import {POST as logout} from '../app/api/auth/logout/route';
let client:PGlite,conn:ReturnType<typeof drizzle>;
const owner:Actor={id:'owner',name:'Owner',role:'health_worker',facilityId:'F1'};
const doctor:Actor={id:'doctor',name:'Doctor',role:'medical_officer',facilityId:'F1'};
const receiver:Actor={id:'receiver',name:'Receiver',role:'medical_officer',facilityId:'F2'};
beforeEach(async()=>{
 vi.stubEnv('AUTH_SECRET','test-only-session-secret-with-at-least-32-characters');state.cookies.clear();client=new PGlite();conn=drizzle(client);state.conn=conn;
 await migrate(conn,{migrationsFolder:'db/migrations'});
 await conn.insert(facilities).values(['F1','F2'].map(id=>({id,name:id,type:'test',location:'test'})));
 await conn.insert(users).values([owner,doctor,receiver]);
 state.cookies.set('sf_session',await signSession(owner.id,owner.role,owner.facilityId));
},30000);
afterEach(async()=>{await client.close();vi.unstubAllEnvs();});
async function revoke(id:string,action:string,time=Date.now()+1000){await conn.insert(auditLogs).values({id:crypto.randomUUID(),userId:id,action,timestamp:new Date(time)});}
it('honours previous and current logout events, account disablement and facility changes',async()=>{
 await revoke(owner.id,'USER_SIGNED_OUT',Date.now()-60000);expect(await session()).toEqual(owner);
 await conn.update(users).set({active:false}).where(eq(users.id,owner.id));expect(await session()).toBeNull();
 await conn.update(users).set({active:true,facilityId:'F2'}).where(eq(users.id,owner.id));expect(await session()).toBeNull();
 await conn.update(users).set({facilityId:'F1'}).where(eq(users.id,owner.id));expect(await session()).toEqual(owner);
 await revoke(owner.id,'USER_SIGNED_OUT');expect(await session()).toBeNull();
});
it('revokes reviewer and receiving credentials while retaining the owner session',async()=>{
 state.cookies.set('sf_reviewer_session',await signReviewer(doctor,owner));expect(await clinicalReviewerSession()).toEqual(doctor);
 await revoke(doctor.id,'REVIEWER_WORKSPACE_CLOSED');expect(await clinicalReviewerSession()).toEqual(owner);
 state.cookies.set('sf_reviewer_session',await signReviewer(receiver,owner));expect(await clinicalReviewerSession()).toEqual(owner);
 state.cookies.set('sf_referral_session',await signReferralWorkspace(receiver,owner));expect(await referralWorkspaceSession()).toEqual(receiver);
 await revoke(receiver.id,'REFERRAL_WORKSPACE_CLOSED');expect(await referralWorkspaceSession()).toBeNull();expect(await session()).toEqual(owner);
 const nurse:Actor={id:'nurse',name:'Nurse',role:'nurse',facilityId:'F1'};
 await conn.insert(users).values(nurse);
 state.cookies.set('sf_reviewer_session',await signReviewer(nurse,owner));expect(await clinicalReviewerSession()).toEqual(nurse);
 await revoke(nurse.id,'USER_SIGNED_OUT');expect(await clinicalReviewerSession()).toEqual(owner);
 await revoke(owner.id,'USER_SIGNED_OUT');expect(await clinicalReviewerSession()).toBeNull();expect(await referralWorkspaceSession()).toBeNull();
});
it('JSON sign-out clears all workspace cookies and revokes replayed tokens',async()=>{
 state.cookies.set('sf_reviewer_session',await signReviewer(doctor,owner));
 state.cookies.set('sf_referral_session',await signReferralWorkspace(receiver,owner));
 const response=await logout(new Request('https://example.test/api/auth/logout',{method:'POST',headers:{accept:'application/json'}}));
 expect(response.status).toBe(200);expect(await response.json()).toEqual({ok:true,data:{signedOut:true}});
 for(const [name,path] of [['sf_session','/'],['sf_reviewer_session','/api'],['sf_referral_session','/api/referrals']]){
  const cookie=response.cookies.get(name);expect(cookie?.value).toBe('');expect(cookie?.path).toBe(path);
  expect(cookie?.maxAge===0||Number(cookie?.expires)===0).toBe(true);
 }
 expect(response.headers.get('clear-site-data')).toBe('"cache", "storage"');
 expect(await session()).toBeNull();expect(await clinicalReviewerSession()).toBeNull();expect(await referralWorkspaceSession()).toBeNull();
 const events=await conn.select().from(auditLogs).where(eq(auditLogs.action,'USER_SIGNED_OUT'));expect(events).toHaveLength(1);expect(events[0].userId).toBe(owner.id);
 const legacy=await logout(new Request('https://example.test/api/auth/logout',{method:'POST'}));expect(legacy.status).toBe(303);
});
