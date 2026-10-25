import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {collectOptional} from '../scripts/pc-writer/theme-optional-collect.mjs';
import {calculateDataCenterPower,saveDataCenterPower} from '../scripts/pc-writer/theme-data-center-power-r1.mjs';
import {scoreAll252} from '../scripts/pc-writer/theme-optional-score-r188.mjs';

const sha=buffer=>createHash('sha256').update(buffer).digest('hex');
const hourInNy=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',hour:'2-digit',hourCycle:'h23'});
const early=new Set(['2024-07-03','2024-11-29','2024-12-24','2025-07-03','2025-11-28','2025-12-24']);
function barTimestamp(date){
 const target=early.has(date)?'12':'15';
 for(const hour of [16,17,18,19,20,21]){
  const stamp=date+'T'+String(hour).padStart(2,'0')+':00:00Z';
  if(hourInNy.format(new Date(stamp))===target)return stamp;
 }
 throw Error('NO_NEW_YORK_15_HOUR');
}
function fixture(root,{count=700}={}){
 const home=path.join(root,'themes','data-center-power'),raw=path.join(home,'raw');
 fs.mkdirSync(raw,{recursive:true});
 const days=[];
 for(let ms=Date.parse('2023-12-01T00:00:00Z');days.length<count;ms+=86400000){
  const date=new Date(ms),w=date.getUTCDay();
  if(w!==0&&w!==6)days.push(date.toISOString().slice(0,10));
 }
 const values={DTCR:[],GRID:[],SPY:[]},files=[];
 for(const symbol of Object.keys(values)){
  const rows=days.map((date,i)=>{
   const base=symbol==='DTCR'?105:symbol==='GRID'?80:130;
   const close=base*Math.exp(.00031*i+Math.sin(i*(symbol==='DTCR'?.13:symbol==='GRID'?.09:.07))*.025);
   values[symbol].push(close);
   return {symbol,timestamp:barTimestamp(date),close,is_gap:false};
  });
  const bytes=Buffer.from(rows.map(row=>JSON.stringify(row)).join('\n')+'\n');
  const digest=sha(bytes),file='raw/'+symbol+'_'+digest+'.jsonl';
  fs.writeFileSync(path.join(home,file),bytes);
  files.push({path:file,sha256:digest,source:'https://getmarkethistory.com',
   collectedAt:'2026-10-24T00:00:00Z',observationFrom:days[0],observationThrough:days.at(-1),
   priceMode:'RAW_UNADJUSTED_1H_NOT_OFFICIAL_CLOSE',schemaVersion:'GMH_NDJSON_1H_COLUMNS_V1'});
 }
 fs.writeFileSync(path.join(home,'raw-manifest.json'),JSON.stringify({version:1,themeId:'data-center-power',files}));
 return {days,values,files};
}

test('new pair uses exact existing scorer 50:50 on 252 matching saved sessions',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'dc-power-r1-'));
 try{
  const data=fixture(root),actual=calculateDataCenterPower({dataRoot:root});
  assert.equal(actual.status,'PRIVATE_CANDIDATE_NOT_PUBLISHED');
  assert.deepEqual(actual.etfs,['DTCR','GRID']);
  assert.equal(actual.commonSessions,700);
  assert.equal(actual.history.length,252);
  const etfValues=['DTCR','GRID'].map(s=>scoreAll252(data.values[s],data.values.SPY));
  for(let i=0;i<252;i++){
   assert.equal(actual.history[i].date,data.days.at(i-252));
   assert.equal(actual.history[i].score,Number(((etfValues[0][i]+etfValues[1][i])/2).toFixed(5)));
  }
  assert.equal(actual.d1Writes,0);
  assert.equal(actual.publicWrites,0);
  assert.equal(actual.scheduledWrites,undefined);
  const saved=saveDataCenterPower(root,actual);
  assert.deepEqual(saved,saveDataCenterPower(root,actual)); // deterministic hash/path
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('price tampering blocks calculation rather than inventing a score',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'dc-power-bad-'));
 try{
  const {files}=fixture(root),f=path.join(root,'themes','data-center-power',files[0].path);
  fs.appendFileSync(f,'tamper');
  assert.throws(()=>calculateDataCenterPower({dataRoot:root}),{message:'DC_POWER_RAW_HASH_MISMATCH'});
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('DTCR, GRID and SPY use existing bounded collector and private-only writes',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'dc-power-fetch-'));
 const seen=[];
 try{
  const report=await collectOptional({dataRoot:root,themeId:'data-center-power',
   start:'2026-10-19',end:'2026-10-21',fetchImpl:async url=>{
    const symbol=url.pathname.split('/').at(-2);seen.push(symbol);
    return new Response(JSON.stringify({symbol,timestamp:'2026-10-19T19:00:00Z',close:100,is_gap:false})+'\n');
   }});
  assert.equal(report.status,'PRIVATE_RAW_COLLECTION_COMPLETE');
  assert.deepEqual(seen,['DTCR','GRID','SPY']);
  assert.equal(report.providerCalls,3);
  assert.equal(report.d1Writes,0);
  assert.equal(report.publicWrites,0);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
