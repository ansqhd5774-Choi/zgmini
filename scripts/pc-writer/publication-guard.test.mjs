import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {affectsPublication,publicationCompatibility,recoverPublication} from './publication-guard.mjs';
import {save,read,hash} from './d1.mjs';

test('UI/content/research changes do not block; publisher/formula/dependencies do',()=>{
 for(const f of ['lib/iran-progress/facts.mjs','lib/iran-progress/r13.mjs','worker/iran-progress-public.mjs'])assert.equal(affectsPublication(f),false,f);
 assert.equal(affectsPublication('lib/market-score/composite-model-r1.mjs'),true);
 for(const f of ['app/dashboard-ui.tsx','app/responsive.css','docs/guide.md','scripts/pc-writer/backtest-sec.mjs'])assert.equal(affectsPublication(f),false,f);
 for(const f of ['worker/projection-runtime-r52.mjs','lib/score.mjs','scripts/pc-writer/run-local.mjs','package-lock.json'])assert.equal(affectsPublication(f),true,f);
});
test('real Git comparison permits UI commits and rejects a formula change',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'publication-git-'));
 const git=(...a)=>execFileSync('git',a,{cwd:dir,encoding:'utf8',windowsHide:true}).trim();
 try{
  git('init');git('config','user.name','Test');git('config','user.email','test@example.invalid');
  fs.mkdirSync(path.join(dir,'app'));fs.mkdirSync(path.join(dir,'worker'));
  fs.writeFileSync(path.join(dir,'worker','score.mjs'),'export const score=1;');git('add','worker/score.mjs');git('commit','-m','base');const approved=git('rev-parse','HEAD');
  fs.writeFileSync(path.join(dir,'app','ui.css'),'body{}');git('add','app/ui.css');git('commit','-m','ui');const ui=git('rev-parse','HEAD');
  assert.equal(publicationCompatibility(dir,approved,ui,ui),null);
  fs.writeFileSync(path.join(dir,'worker','score.mjs'),'export const score=2;');git('add','worker/score.mjs');git('commit','-m','formula');const changed=git('rev-parse','HEAD');
  assert.equal(publicationCompatibility(dir,approved,ui,changed).status,'PUBLICATION_CONTRACT_CHANGED');
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
for(const scenario of ['applied','missing','running','network','conflict'])test(`pending readback ${scenario}`,async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'publication-readback-'));
 try{
  const pending={status:'SUBMITTING',at:100,source:'a'.repeat(40)};
  save(path.join(dir,'local-publication-ledger.json'),pending);
  save(path.join(dir,'local-market-ledger.json'),{storedAt:90,bodyHash:scenario==='conflict'?'wrong':hash({status:'SUCCESS'})});
  let calls=0;
  const remote={query:async(_db,sql)=>{calls++;if(scenario==='network')throw Error('D1_OUTCOME_UNKNOWN');return {results:sql.includes('lease_until')?[{lease_until:scenario==='running'?200:0}]:scenario==='missing'?[]:[{stored_at:90,body:JSON.stringify({status:'SUCCESS'})}]};}};
  if(['running','network','conflict'].includes(scenario)){
   await assert.rejects(recoverPublication(remote,'db',dir,150));assert.deepEqual(read(path.join(dir,'local-publication-ledger.json')),pending);
  }else{
   const result=await recoverPublication(remote,'db',dir,150);assert.equal(result.status,'READBACK_RECOVERED');assert.equal(result.outcome,scenario==='missing'?'NOT_APPLIED':'APPLIED_OR_SUPERSEDED');assert.equal(calls,2);
   assert.ok(fs.existsSync(path.join(dir,'local-publication-ledger.readback-100.json')));
  }
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
