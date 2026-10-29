import {test} from 'node:test';
import assert from 'node:assert/strict';
import {runR73PrivateAutoRetry} from
  '../scripts/pc-writer/theme-nine-r73-auto-http502-private-retry.mjs';

const preflight=()=>({canRun:true});
const failed=()=>({noFailed:false,sourceFailure:'STOP_HTTP_502'});
const clean=()=>({noFailed:true});
const repaired={backup:'checkpoint.bak',completedSymbolsPreserved:36};
const failRun=()=>({existingPrivateCommandExit:3,status:'R71_EXISTING_PRIVATE_RUN_NONZERO'});
const goodRun=()=>({existingPrivateCommandExit:0,status:'R71_EXISTING_PRIVATE_RUN_RETURNED_ZERO'});

test('R73 automatically retries 502 with one full 60-second batch gap',async()=>{
  const calls=[],events=[];
  let currentlyFailed=true;
  const out=await runR73PrivateAutoRetry({preflight,
    inspect:()=>currentlyFailed?failed():clean(),
    recover:()=>{calls.push('backup');currentlyFailed=false;return repaired;},
    run:()=>{calls.push('run');if(calls.filter(x=>x==='run').length===1){
      currentlyFailed=true;return failRun();}return goodRun();},
    delay:async ms=>calls.push(ms),report:e=>events.push(e),
  });
  assert.equal(out.status,'R73_PRIVATE_COMMAND_RETURNED_ZERO');
  assert.equal(out.attempts,2);
  assert.equal(out.recoveries,2);
  assert.deepEqual(calls,['backup','run',60_000,'backup','run']);
  assert.equal(events.filter(x=>x.event==='HTTP502_PAUSE_BEFORE_RETRY').length,1);
});

test('R73 never retries 429 or ambiguous errors',async()=>{
  let runs=0;
  const result=await runR73PrivateAutoRetry({preflight,inspect:()=>clean(),
    recover:()=>{throw Error('should not modify a checkpoint');},
    run:()=>{runs++;return failRun();},delay:async()=>{throw Error('must not wait');},
    report:()=>{},maxAttempts:3});
  assert.equal(result.status,'STOP_R73_PRIVATE_NON_502_FAILURE');
  assert.equal(runs,1);
});

test('R73 caps three HTTP502 private invocations, leaving final failure marker',async()=>{
  let runs=0,recoveries=0,waits=0;
  const result=await runR73PrivateAutoRetry({preflight,inspect:failed,
    recover:()=>{recoveries++;return repaired;},
    run:()=>{runs++;return failRun();},delay:async ms=>{waits++;assert.equal(ms,60_000);},
    report:()=>{}});
  assert.equal(result.status,'STOP_R73_HTTP502_RETRY_CAP');
  assert.equal(runs,3);
  assert.equal(recoveries,3);
  assert.equal(waits,2);
});

test('R73 stops before any request when the PC task overlap gate is closed',async()=>{
  let runs=0;
  const result=await runR73PrivateAutoRetry({preflight:()=>({canRun:false}),
    inspect:()=>{throw Error('should not inspect');},
    run:()=>{runs++;return goodRun();},report:()=>{}});
  assert.equal(result.status,'STOP_R73_PC_PREFLIGHT');
  assert.equal(runs,0);
});
