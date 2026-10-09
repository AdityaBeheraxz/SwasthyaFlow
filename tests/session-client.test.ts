import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {intakeActor,invalidateOfflineActor} from '../lib/session-client';
const actor={id:'staff',facilityId:'facility',role:'nurse'};
let storage:Map<string,string>;
beforeEach(()=>{storage=new Map();vi.stubGlobal('sessionStorage',{getItem:(key:string)=>storage.get(key)??null,setItem:(key:string,value:string)=>storage.set(key,value),removeItem:(key:string)=>storage.delete(key)});vi.stubGlobal('navigator',{onLine:true});invalidateOfflineActor();});
afterEach(()=>vi.unstubAllGlobals());
it('shares concurrent session checks but revalidates on the next check',async()=>{
 let finish!:(value:Response)=>void;
 const fetcher=vi.fn(()=>new Promise<Response>(resolve=>{finish=resolve;}));vi.stubGlobal('fetch',fetcher);
 const checks=[intakeActor(),intakeActor(),intakeActor()];expect(fetcher).toHaveBeenCalledTimes(1);
 finish(Response.json({data:actor}));expect((await Promise.all(checks)).every(value=>value?.id==='staff')).toBe(true);
 const next=intakeActor();expect(fetcher).toHaveBeenCalledTimes(2);finish(Response.json({data:null}));expect(await next).toBeNull();expect(storage.size).toBe(0);
});
it('retries a failed network check and never keeps an authorization promise',async()=>{
 const fetcher=vi.fn().mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce(Response.json({data:actor}));vi.stubGlobal('fetch',fetcher);
 await expect(intakeActor()).rejects.toThrow('network');expect((await intakeActor())?.id).toBe('staff');expect(fetcher).toHaveBeenCalledTimes(2);
});
it('does not restore cached identity if sign-out starts during a session request',async()=>{
 let finish!:(value:Response)=>void;vi.stubGlobal('fetch',()=>new Promise<Response>(resolve=>{finish=resolve;}));
 const check=intakeActor();invalidateOfflineActor();finish(Response.json({data:actor}));expect(await check).toBeNull();expect(storage.size).toBe(0);
});
