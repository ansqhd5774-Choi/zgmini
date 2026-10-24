import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {scoreAll252} from '../scripts/pc-writer/theme-optional-score-r188.mjs';
import {buildBiotechShadow,saveBiotechShadow} from '../scripts/pc-writer/theme-biotech-shadow-core-r5.mjs';
import {readBiotechPrior} from '../scripts/pc-writer/theme-biotech-shadow-r5.mjs';

const SHA=b=>createHash('sha256').update(b).digest('hex');
function fixture({alterPrior=false}={}){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'biotech-shadow-r5-'));
 const home=path.join(root,'themes','biotech'),raw=path.join(home,'raw');fs.mkdirSync(raw,{recursive:true});
 const dates=Array.from({length:660},(_,i)=>new Date(Date.UTC(2024,0,1+i)).toISOString().slice(0,10));
 const hour=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',hour:'2-digit',hourCycle:'h23'});
 const early=new Set(['2024-07-03','2024-11-29','2024-12-24','2025-07-03','2025-11-28','2025-12-24']);
 const values={},files=[];
 for(const symbol of ['IBB','XBI','SPY']){
  const offset={IBB:20,XBI:5,SPY:200}[symbol];
  const prices=dates.map((_,i)=>offset+90+i*(symbol==='SPY'?.14:.18)+Math.sin(i*.09+(symbol==='IBB'?0:2)));
  values[symbol]=prices;
  const rows=dates.map((d,i)=>{
   const selected=early.has(d)?'12':'15';
   const h=['16','17','18','19','20','21'].find(h=>hour.format(new Date(d+'T'+h+':00:00Z'))===selected);
   assert.ok(h);
   return {symbol,timestamp:d+'T'+h+':00:00.000Z',close:prices[i],is_gap:false};
  });
  const body=rows.map(JSON.stringify).join('\n'),digest=SHA(Buffer.from(body)),relative='raw/'+symbol+'_'+digest+'.jsonl';
  fs.writeFileSync(path.join(home,relative),body);
  files.push({path:relative,sha256:digest,source:'https://getmarkethistory.com',collectedAt:'2026-10-24T01:00:00Z',
   observationFrom:dates[0],observationThrough:dates.at(-1),priceMode:'RAW_UNADJUSTED_1H_NOT_OFFICIAL_CLOSE',schemaVersion:'GMH_NDJSON_1H_COLUMNS_V1'});
 }
 fs.writeFileSync(path.join(home,'raw-manifest.json'),JSON.stringify({version:1,themeId:'biotech',files}));
 const priorIndex=657,priorDate=dates[priorIndex],endPrices=Object.fromEntries(Object.entries(values).map(([k,v])=>[k,v.slice(priorIndex-627,priorIndex+1)]));
 const scoreA=scoreAll252(endPrices.IBB,endPrices.SPY),scoreB=scoreAll252(endPrices.XBI,endPrices.SPY);
 const history=dates.slice(priorIndex-251,priorIndex+1).map((date,i)=>({date,score:Number(((scoreA[i]+scoreB[i])/2).toFixed(5))}));
 if(alterPrior)history[0].score=Math.min(100,history[0].score+.1);
 const priorRecord={status:'READY',methodologyVersion:'ETF_ONLY_T40_R20_V40_PAIR50',etfs:['IBB','XBI'],
  observationDate:priorDate,history};
 return {root,home,priorRecord,dates};
}
test('biotech Shadow advances the observation without changing the old published record',()=>{
 const f=fixture({alterPrior:true});
 try{
  const original=JSON.stringify(f.priorRecord),r=buildBiotechShadow({dataRoot:f.root,priorRecord:f.priorRecord});
  assert.equal(r.status,'PRIVATE_SHADOW_COMPUTED_NOT_PUBLISHED');
  assert.equal(r.observationDate,f.dates.at(-1));assert.equal(r.history.length,252);
  assert.equal(r.priorComparison.comparedDates,252);assert.equal(r.priorComparison.changedDates,1);
  assert.equal(r.provisional.points.length,0);assert.equal(r.publicWrites,0);assert.equal(r.providerCalls,0);
  assert.equal(JSON.stringify(f.priorRecord),original);
  const a=saveBiotechShadow(f.root,r),b=saveBiotechShadow(f.root,buildBiotechShadow({dataRoot:f.root,priorRecord:f.priorRecord}));
  assert.equal(a.status,'IMMUTABLE_SAVED');assert.equal(b.status,'EXISTING_IDENTICAL');
  assert.equal(a.sha256,b.sha256);assert.equal(fs.readdirSync(path.join(f.home,'derived')).length,1);
 }finally{fs.rmSync(f.root,{recursive:true,force:true});}
});
test('tampered biotech raw is rejected before calculation',()=>{
 const f=fixture();
 try{const target=fs.readdirSync(path.join(f.home,'raw'))[0];fs.appendFileSync(path.join(f.home,'raw',target),'BAD');
  assert.throws(()=>buildBiotechShadow({dataRoot:f.root,priorRecord:f.priorRecord}),/BIOTECH_RAW_SHA_MISMATCH/);
 }finally{fs.rmSync(f.root,{recursive:true,force:true});}
});
test('D1 prior request reads only biotech current record',async()=>{
 const f=fixture(),configDir=path.join(f.root,'pc-writer');fs.mkdirSync(configDir);
 fs.writeFileSync(path.join(configDir,'config.json'),JSON.stringify({account:'a'.repeat(32),core:'11111111-1111-1111-1111-111111111111'}));
 try{let calls=0;const result=await readBiotechPrior({dataRoot:f.root,tokenFn:()=> 'test-token',fetchImpl:async(_url,req)=>{
  calls++;assert.match(JSON.parse(req.body).batch[0].sql,/^SELECT body,stored_at/);
  assert.deepEqual(JSON.parse(req.body).batch[0].params,['theme-biotech-optional-r1']);
  return {ok:true,json:async()=>({success:true,result:[{success:true,results:[{body:JSON.stringify(f.priorRecord),stored_at:1}]}]})};
 }});
  assert.equal(calls,1);assert.equal(result.observationDate,f.priorRecord.observationDate);
 }finally{fs.rmSync(f.root,{recursive:true,force:true});}
});
