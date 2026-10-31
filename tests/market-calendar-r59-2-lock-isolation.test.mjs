import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {publication} from '../tools/market-calendar-r59/R59_PC_ANNUAL_PUBLISH.mjs';
import {publishableFhsAnnualFromPrivate} from '../tools/market-calendar-r59/market-calendar-fhs-r3-public.mjs';

function tempFixture(){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'r59-2-'));
 const pcHome=path.join(root,'data');fs.mkdirSync(pcHome);
 const repo=path.join(root,'repo');fs.mkdirSync(path.join(repo,'scripts','pc-writer'),{recursive:true});
 fs.writeFileSync(path.join(repo,'scripts','pc-writer','d1.mjs'),'export default null;');
 execFileSync('git',['init','-q',repo]);
 execFileSync('git',['-C',repo,'-c','user.name=Test','-c','user.email=test@example.invalid','commit','--allow-empty','-qm','Test']);
 const head=execFileSync('git',['-C',repo,'rev-parse','HEAD'],{encoding:'utf8'}).trim();
 fs.writeFileSync(path.join(pcHome,'config.json'),JSON.stringify({source:head,collectionTarget:'pc',enabled:true,core:'core'}));
 const input={status:'PRIVATE_PROVISIONAL_ONLY',version:'ZGMINI-FHS-R3',publishReady:false,asOf:'2026-10-31',sourceStoredAt:1793332803000,recordCount:1,items:[{ticker:'ABBV',status:'PROVISIONAL_UNVERIFIED',version:'ZGMINI-FHS-R3',asOf:'2026-10-31',score:90,stars:3,publishReady:false,sectorVerified:false,cashUnrestrictedVerified:false,filingContextVerified:false}]};
 const privateFile=path.join(root,'MARKET_CALENDAR_R58_FHS_R3_PRIVATE_SHADOW.json');fs.writeFileSync(privateFile,JSON.stringify(input));
 return {root,pcHome,repo,privateFile,input};
}
function remote(){let stored=null,writes=0,queries=0;return {get writes(){return writes},get queries(){return queries},get stored(){return stored},async query(db,sql,params){assert.equal(db,'core');assert.deepEqual(params,['market-calendar:fhs-r3-annual']);queries++;return{results:stored?[stored]:[]}},async request(db,batches){writes++;const r=batches[0];stored={body:r.params[1],stored_at:r.params[2]};return [{success:true}]}}}
const wrap=(f,r)=>({privateFile:f.privateFile,pcHome:f.pcHome,rootResolver:()=>f.repo,remoteFactory:async()=>r,readerGate:async()=>true});

test('existing five-minute Core lock does not prevent independent annual D1 publication',async()=>{const f=tempFixture(),r=remote();try{
 const coreLock=path.join(f.pcHome,'local-cycle.lock');fs.writeFileSync(coreLock,'{ "pid":42 }');
 const x=await publication(wrap(f,r));
 assert.equal(x.status,'R59_D1_ANNUAL_PUBLISHED_AND_READBACK');assert.equal(x.dbWrites,1);
 assert.equal(r.writes,1);assert.equal(r.queries,2);
 assert.equal(fs.readFileSync(coreLock,'utf8'),'{ "pid":42 }');
 assert.equal(fs.existsSync(path.join(f.pcHome,'annual-fhs-r3.manual.lock')),false);
 const local=fs.readFileSync(path.join(f.pcHome,'annual-fhs-r3','fhs-r3-2026-10-31.json'),'utf8');
 assert.equal(local,JSON.stringify(publishableFhsAnnualFromPrivate(f.input)));
}finally{fs.rmSync(f.root,{recursive:true,force:true})}});

test('D1 same annual body is idempotent and produces no write',async()=>{const f=tempFixture(),r=remote();try{
 await publication(wrap(f,r));const x=await publication(wrap(f,r));
 assert.equal(x.status,'R59_ALREADY_PUBLISHED');assert.equal(x.dbWrites,0);assert.equal(r.writes,1);
}finally{fs.rmSync(f.root,{recursive:true,force:true})}});

test('annual lane lock is never removed when held by another process',async()=>{const f=tempFixture(),r=remote();try{
 const file=path.join(f.pcHome,'annual-fhs-r3.manual.lock');fs.writeFileSync(file,'reserved');
 await assert.rejects(publication(wrap(f,r)),/R59_ANNUAL_PUBLISH_LOCK_BUSY_STOP/);
 assert.equal(fs.readFileSync(file,'utf8'),'reserved');assert.equal(r.writes,0);
}finally{fs.rmSync(f.root,{recursive:true,force:true})}});

test('same-date conflicting remote annual data stops without changing it',async()=>{const f=tempFixture(),r=remote();try{
 const first=await publication(wrap(f,r));assert.equal(first.dbWrites,1);
 const prior=r.stored.body;
 // A conflict with an existing local annual output must also be protected.
 const data=JSON.parse(fs.readFileSync(f.privateFile));data.items[0].score=89;
 fs.writeFileSync(f.privateFile,JSON.stringify(data));
 await assert.rejects(publication(wrap(f,r)),/R59_LOCAL_ANNUAL_CONFLICT_STOP/);
 assert.equal(r.stored.body,prior);assert.equal(r.writes,1);
}finally{fs.rmSync(f.root,{recursive:true,force:true})}});
