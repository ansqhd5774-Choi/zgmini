import test from 'node:test';
import assert from 'node:assert/strict';
import {koreaRev7ExternalScheduler as handle} from '../worker/korea-rev7-external-scheduler.mjs';
const secret='test-only-not-a-production-key-1234567890';
const env={KOREA_REV7_SCHEDULER_SECRET:secret};
const req=(method='POST',token=secret)=>new Request('https://example.test/api/internal/korea-rev7-scheduled',{method,headers:{authorization:`Bearer ${token}`}});
test('unauthorized and unconfigured requests do not collect',async()=>{
 let calls=0;const options={refresh:async()=>{calls++;}};
 assert.equal((await handle(req('GET'),env,options)).status,405);
 assert.equal((await handle(req(),{},options)).status,503);
 assert.equal((await handle(req('POST','wrong'),env,options)).status,401);
 assert.equal(calls,0);
});
test('authenticated scheduler uses one resumable date and no-store response',async()=>{
 const result={status:'COMPLETE',storedDates:1,scoreDate:'20260929'};
 const response=await handle(req(),env,{refresh:async args=>{assert.equal(args.maxDates,1);assert.equal(args.env,env);return result;}});
 assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');assert.deepEqual(await response.json(),result);
});
test('actual refresh failure is not reported as scheduler success',async()=>{
 assert.equal((await handle(req(),env,{refresh:async()=>({status:'ERROR',phase:'COLLECT'})})).status,503);
 assert.equal((await handle(req(),env,{refresh:async()=>{throw Error('private detail');}})).status,503);
 assert.equal((await handle(req(),env,{refresh:async()=>({status:'ALREADY_RUNNING'})})).status,200);
});
test('response deadline keeps real work attached without claiming completion',async()=>{
 let finish,attached;const work=new Promise(resolve=>{finish=resolve;});
 const response=await handle(req(),env,{refresh:()=>work,ctx:{waitUntil(p){attached=p;}},responseBudgetMs:1});
 assert.equal(response.status,202);assert.deepEqual(await response.json(),{status:'RUNNING'});
 assert.ok(attached);finish({status:'COMPLETE'});await attached;
});
