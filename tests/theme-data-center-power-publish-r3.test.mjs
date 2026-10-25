import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {buildDcPowerPublicR3} from '../scripts/pc-writer/theme-data-center-power-public-r3.mjs';
import {dcPowerVersionedD1} from '../scripts/pc-writer/theme-data-center-power-d1-r3.mjs';
import {runDcPowerPublishR3} from '../scripts/pc-writer/theme-data-center-power-publish-r3.mjs';
import {eligibleDcPower,DC_POWER_PUBLIC_KEY} from '../worker/theme-data-center-power-r1.mjs';

const CLOCK=Date.parse('2026-10-25T08:00:00Z');
const SHA=bytes=>createHash('sha256').update(bytes).digest('hex');
const dates=[];
for(let ms=Date.parse('2025-10-31T00:00:00Z');dates.length<252;ms+=86400000){
 const day=new Date(ms).getUTCDay();if(day!==0&&day!==6)dates.push(new Date(ms).toISOString().slice(0,10));
}
const last=dates.at(-1);
const base={status:'READY',observationDate:last,themes:Array.from({length:9},(_,i)=>({
 theme:'old-'+i,score:50,history:dates.map(date=>({date,score:50}))}))};
const candidate={status:'PRIVATE_CANDIDATE_NOT_PUBLISHED',themeId:'data-center-power',
 theme:'데이터센터·전력',etfs:['DTCR','GRID'],benchmark:'SPY',
 methodologyVersion:'ETF_ONLY_T40_R20_V40_PAIR50',individualStocksUsed:0,
 priceMode:'UNADJUSTED_15_NY_HOURLY_PROXY_WITH_OFFICIAL_EARLY_CLOSE_12',
 sourceVersion:'GMH_MANIFEST_SHA256_'+'a'.repeat(64),publicationAuthorized:false,
 d1Writes:0,publicWrites:0,observationDate:last,score:14.75794,
 history:dates.map((date,i)=>({date,score:i===251?14.75794:25}))};
const options=()=>({candidate,sourceStoredAt:'2026-10-25T07:00:00.000Z',
 candidateFileSha256:'b'.repeat(64),base,optIn:true,acceptAnonymousLicenseRisk:true,now:CLOCK});

test('the ninth-theme anonymous route works without a provider account but discloses unverified rights',()=>{
 const pub=buildDcPowerPublicR3(options());
 assert.equal(pub.accountGoodStandingVerified,false);
 assert.equal(pub.anonymousScopeIndependentlyConfirmed,false);
 assert.equal(pub.derivedLicenseVerified,false);
 assert.equal(pub.upstreamCommercialRightsVerified,false);
 assert.equal(pub.licensingRiskAcceptedByPublisher,true);
 assert.equal(pub.derivedOnlyNoRaw,true);
 assert.equal(eligibleDcPower(pub,base,{now:CLOCK,storedAt:CLOCK}),true);
 assert.equal(base.themes.length,9);
});

test('no silent publisher approval and no false verified rights',()=>{
 assert.throws(()=>buildDcPowerPublicR3({...options(),optIn:false}),
  /PUBLICATION_NOT_OPTED_IN/);
 assert.throws(()=>buildDcPowerPublicR3({...options(),acceptAnonymousLicenseRisk:false}),
  /PUBLISHER_RISK_ACKNOWLEDGEMENT_REQUIRED/);
 const pub=buildDcPowerPublicR3(options());
 const misrepresented={...pub,derivedLicenseVerified:true};
 assert.equal(eligibleDcPower(misrepresented,base,{now:CLOCK,storedAt:CLOCK}),false);
 const tooOld={...pub,sourceStoredAt:'2026-10-15T00:00:00Z'};
 assert.equal(eligibleDcPower(tooOld,base,{now:CLOCK,storedAt:CLOCK}),false);
});

test('tenth-key D1 CAS and readback preserve other nine keys and reject rewritten history',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'dc-power-d1-r3-'));
 fs.mkdirSync(path.join(root,'pc-writer'));
 fs.writeFileSync(path.join(root,'pc-writer','config.json'),
  JSON.stringify({account:'a'.repeat(32),core:'11111111-1111-1111-1111-111111111111'}));
 try{
  const oldNine='theme-etf-only-rolling';
  const rows=new Map([[oldNine,{body:'DO_NOT_TOUCH',stored_at:123}]]);let writes=0;
  const fetchImpl=async(_url,req)=>{
   const {sql,params}=JSON.parse(req.body).batch[0];let changes=0,results=[];
   if(sql.startsWith('SELECT'))results=rows.has(params[0])?[rows.get(params[0])]:[];
   else if(sql.startsWith('INSERT')){
    assert.equal(params[1],DC_POWER_PUBLIC_KEY);writes++;
    if(!rows.has(params[1])){rows.set(params[1],{body:params[3],stored_at:params[4]});changes=1;}
   }else if(sql.startsWith('UPDATE')){
    assert.equal(params[2],DC_POWER_PUBLIC_KEY);writes++;
    if(rows.get(params[2])?.stored_at===params[3]){rows.set(params[2],{body:params[0],stored_at:params[1]});changes=1;}
   }else throw Error('UNEXPECTED_SQL');
   return {ok:true,json:async()=>({success:true,result:[{success:true,results,meta:{changes}}]})};
  };
  const db=dcPowerVersionedD1({dataRoot:root,fetchImpl,tokenFn:()=> 'existing-pc-token',clock:()=>CLOCK});
  const pub=buildDcPowerPublicR3(options());
  const one=await db.writeVersioned(DC_POWER_PUBLIC_KEY,pub,null);
  assert.equal(one.status,'WRITTEN');assert.equal(one.changes,1);
  assert.equal(rows.get(oldNine).body,'DO_NOT_TOUCH');
  assert.equal((await db.writeVersioned(DC_POWER_PUBLIC_KEY,pub,one.storedAt)).status,'UNCHANGED');
  assert.equal(writes,1);
  const drift=structuredClone(pub);drift.history[17].score=100;
  await assert.rejects(()=>db.writeVersioned(DC_POWER_PUBLIC_KEY,drift,one.storedAt),
   /PUBLIC_HISTORY_DRIFT/);
  await assert.rejects(()=>db.writeVersioned(oldNine,pub,123),/WRITE_KEY_DENIED/);
  assert.equal(writes,1);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('r3 private mode does not touch D1 or public API',async()=>{
 let calls=0;
 const result=await runDcPowerPublishR3({dataRoot:'unneeded',now:()=>CLOCK,
  runCycle:async()=>({status:'PRIVATE_CANDIDATE_VERIFIED_NOT_PUBLISHED',
   artifact:{sha256:'a'.repeat(64)},score:14.75794,observationDate:last}),
  db:{read:()=>{calls++;throw Error('UNEXPECTED_DB_READ');}},
  readPublic:()=>{calls++;throw Error('UNEXPECTED_PUBLIC_REQUEST');}});
 assert.equal(result.status,'PRIVATE_CANDIDATE_VERIFIED_NOT_PUBLISHED');
 assert.equal(result.d1Writes,0);assert.equal(calls,0);
});

test('r3 explicit publisher approval reads actual verified candidate and only tenth D1 key',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'dc-power-pub-r3-'));
 const home=path.join(root,'themes','data-center-power'),dir=path.join(home,'derived');
 fs.mkdirSync(dir,{recursive:true});
 try{
  const manifest={version:1,themeId:'data-center-power',files:['DTCR','GRID','SPY'].map(symbol=>({
   path:`raw/${symbol}_${'a'.repeat(64)}.jsonl`,collectedAt:'2026-10-25T07:00:00.000Z'}))};
  const raw=Buffer.from(JSON.stringify(manifest));fs.writeFileSync(path.join(home,'raw-manifest.json'),raw);
  const local={...candidate,sourceVersion:'GMH_MANIFEST_SHA256_'+SHA(raw)};
  const saved=Buffer.from(JSON.stringify(local));
  const artifact={relativePath:'themes/data-center-power/derived/local.json',sha256:SHA(saved)};
  fs.writeFileSync(path.join(dir,'local.json'),saved);
  let d1=0,read=0;
  const db={read:async key=>{assert.equal(key,DC_POWER_PUBLIC_KEY);return null;},
   writeVersioned:async(key,pub,prior)=>{
    assert.equal(key,DC_POWER_PUBLIC_KEY);assert.equal(prior,null);d1++;
    assert.equal(eligibleDcPower(pub,base,{now:CLOCK,storedAt:CLOCK}),true);
    return {status:'WRITTEN',changes:1};}};
  const result=await runDcPowerPublishR3({dataRoot:root,allowPublish:true,
   acceptAnonymousLicenseRisk:true,now:()=>CLOCK,db,
   runCycle:async()=>({status:'PRIVATE_CANDIDATE_VERIFIED_NOT_PUBLISHED',artifact,
    observationDate:last,score:14.75794}),
   readPublic:async()=>{read++;return read===1?base:{...base,themes:[...base.themes,{
    theme:'데이터센터·전력',score:local.score,history:local.history}]};}});
  assert.equal(result.status,'PUBLIC_API_VERIFIED');assert.equal(result.d1Writes,1);
  assert.equal(d1,1);assert.equal(read,2);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
