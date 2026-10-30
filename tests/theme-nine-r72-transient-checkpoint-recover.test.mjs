import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {inspectR72Checkpoint,recoverR72Checkpoint} from
  '../scripts/pc-writer/theme-nine-r72-transient-checkpoint-recover.mjs';

const sha=x=>createHash('sha256').update(x).digest('hex');
function fixture(t,{failure='STOP_HTTP_502'}={}){
  const home=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-r72-'));
  t.after(()=>fs.rmSync(home,{recursive:true,force:true}));
  fs.mkdirSync(path.join(home,'raw'));
  fs.mkdirSync(path.join(home,'state'));
  const symbols=['SPY',...Array.from({length:63},(_,i)=>'T'+String(i+1).padStart(3,'0'))];
  const manifest={version:1,project:'legacy-nine-r35-delta',
    source:'https://getmarkethistory.com',rosterSha256:'a'.repeat(64),
    licenseStatus:'PRIVATE_RESEARCH_ONLY_PUBLICATION_NOT_APPROVED',files:[]};
  const checkpoints={};
  const rawHashes=[];
  for(const [i,symbol] of symbols.entries()){
    const completed=i<35,raw=Buffer.from(symbol+' 2026-10-27 bars\n');
    const digest=sha(raw),rel=`raw/${symbol}_${digest}.jsonl`;
    if(completed){
      fs.writeFileSync(path.join(home,rel),raw);
      manifest.files.push({symbol,path:rel,sha256:digest,
        priceMode:'RAW_UNADJUSTED_1H_NOT_OFFICIAL_CLOSE'});
      rawHashes.push([rel,digest]);
    }
    checkpoints[symbol]={complete:completed,
      files:completed?[{path:rel,sha256:digest}]:[],cursor:null};
  }
  fs.writeFileSync(path.join(home,'raw-manifest.json'),JSON.stringify(manifest));
  const state={version:1,project:'legacy-nine-r35-delta',
    rosterSha256:manifest.rosterSha256,start:'2026-10-26',end:'2026-10-28',
    symbols:checkpoints,failedAt:'2026-10-29T05:09:06.000Z',failure};
  const statePath=path.join(home,'state','delta-'+'b'.repeat(20)+'.json');
  fs.writeFileSync(statePath,JSON.stringify(state,null,2)+'\n');
  return {home,statePath,rawHashes,manifestSha:sha(fs.readFileSync(
    path.join(home,'raw-manifest.json')))};
}

test('R72 inspects exact 502 failure and preserves all 35 raw pages',t=>{
  const f=fixture(t);
  const info=inspectR72Checkpoint({home:f.home,now:new Date('2026-10-29T05:30:00Z')});
  assert.equal(info.sourceFailure,'STOP_HTTP_502');
  assert.equal(info.completedSymbols,35);
  assert.equal(info.manifestPagesVerified,35);
  assert.equal(info.ageMinutes,20);
});

test('reviewed 503 recovery is explicit, preserves checkpoint and permits only one retry',t=>{
 const f=fixture(t,{failure:'STOP_HTTP_503'}),now=new Date('2026-10-29T05:30:00Z');
 assert.throws(()=>inspectR72Checkpoint({home:f.home,now}),{code:'R72_FAILURE_NOT_EXACT_HTTP_502'});
 const before=JSON.parse(fs.readFileSync(f.statePath));
 const out=recoverR72Checkpoint({home:f.home,now,expectedFailure:'STOP_HTTP_503',preflightFn:()=>({canRun:true})});
 assert.equal(out.completedSymbolsPreserved,35);assert.equal(out.rawPagesChanged,0);
 assert.equal(out.status,'R72_503_CHECKPOINT_RECOVERED_WITH_BACKUP');
 assert.deepEqual(JSON.parse(fs.readFileSync(f.statePath)).symbols,before.symbols);
 fs.writeFileSync(f.statePath,JSON.stringify(before));
 assert.throws(()=>recoverR72Checkpoint({home:f.home,now,expectedFailure:'STOP_HTTP_503',preflightFn:()=>({canRun:true})}),{code:'R72_503_REVIEWED_RETRY_ALREADY_USED'});
 assert.throws(()=>inspectR72Checkpoint({home:f.home,now,expectedFailure:'STOP_HTTP_403'}),{code:'R72_UNAPPROVED_TRANSIENT_STATUS'});
});

test('R72 backs up only one checkpoint, then clears 502 marker without adding delta-*.json',t=>{
  const f=fixture(t);
  const result=recoverR72Checkpoint({home:f.home,now:new Date('2026-10-29T05:30:00Z'),
    preflightFn:()=>({canRun:true})});
  assert.equal(result.status,'R72_502_CHECKPOINT_RECOVERED_WITH_BACKUP');
  assert.equal(result.rawPagesChanged,0);
  assert.equal(result.completedSymbolsPreserved,35);
  assert.equal(result.backup.endsWith('.bak'),true);
  const files=fs.readdirSync(path.join(f.home,'state'));
  assert.equal(files.filter(name=>name.startsWith('delta-')&&name.endsWith('.json')).length,1);
  assert.equal(files.filter(name=>name.endsWith('.bak')).length,1);
  const state=JSON.parse(fs.readFileSync(f.statePath));
  assert.equal(state.failure,undefined);
  assert.equal(state.failedAt,undefined);
  assert.equal(inspectR72Checkpoint({home:f.home,
    now:new Date('2026-10-29T05:31:00Z'),allowNoFailure:true}).noFailed,true);
  for(const [rel,digest] of f.rawHashes)
    assert.equal(sha(fs.readFileSync(path.join(f.home,rel))),digest);
  assert.equal(sha(fs.readFileSync(path.join(f.home,'raw-manifest.json'))),f.manifestSha);
});

test('R72 rejects unknown failure or any live lock, without arbitrary 15min wait',t=>{
  const f=fixture(t,{failure:'REQUEST_OUTCOME_UNKNOWN'});
  assert.throws(()=>inspectR72Checkpoint({home:f.home,
    now:new Date('2026-10-29T05:30:00Z')}),{code:'R72_FAILURE_NOT_EXACT_HTTP_502'});
  const state=JSON.parse(fs.readFileSync(f.statePath));
  state.failure='STOP_HTTP_502';
  fs.writeFileSync(f.statePath,JSON.stringify(state));
  const immediate=recoverR72Checkpoint({home:f.home,
    now:new Date('2026-10-29T05:09:10Z'),preflightFn:()=>({canRun:true})});
  assert.equal(immediate.status,'R72_502_CHECKPOINT_RECOVERED_WITH_BACKUP');
  state.failure='STOP_HTTP_502';
  fs.writeFileSync(f.statePath,JSON.stringify(state));
  fs.writeFileSync(path.join(f.home,'state','delta.lock'),'');
  assert.throws(()=>inspectR72Checkpoint({home:f.home,
    now:new Date('2026-10-29T05:30:00Z')}),{code:'R72_ACTIVE_COLLECTION_LOCK_PRESENT'});
});
