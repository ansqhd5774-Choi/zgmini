import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {collectOptional} from '../scripts/pc-writer/theme-optional-collect.mjs';
import {auditSpaceSatellite,saveSpaceSatellite} from '../scripts/pc-writer/theme-space-satellite-r1.mjs';
import {scoreAll252} from '../scripts/pc-writer/theme-optional-score-r188.mjs';

const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const nyHour=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',hour:'2-digit',hourCycle:'h23'});
function barTimestamp(date){
 const early=new Set(['2024-07-03','2024-11-29','2024-12-24','2025-07-03','2025-11-28','2025-12-24']);
 const selectedHour=early.has(date)?'12':'15';
 for(const hour of [16,17,18,19,20,21]){
  const stamp=date+'T'+String(hour).padStart(2,'0')+':00:00Z';
  if(nyHour.format(new Date(stamp))===selectedHour)return stamp;
 }
 throw Error('NO_NY_HOUR');
}
function fixture(root,{exclude=[]}={}){
 const home=path.join(root,'themes','space-satellite');
 fs.mkdirSync(path.join(home,'raw'),{recursive:true});
 const days=[];
 for(let ms=Date.parse('2023-12-01T00:00:00Z');days.length<700;ms+=86400000){
  const day=new Date(ms);if(day.getUTCDay()!==0&&day.getUTCDay()!==6)days.push(day.toISOString().slice(0,10));
 }
 const values={UFO:[],ROKT:[],ARKX:[],SPY:[]},files=[];
 for(const symbol of Object.keys(values)){
  const rows=days.map((date,i)=>{
   const base={UFO:80,ROKT:90,ARKX:110,SPY:150}[symbol];
   const speed={UFO:.13,ROKT:.09,ARKX:.11,SPY:.07}[symbol];
   const close=base*Math.exp(.00031*i+Math.sin(i*speed)*.025);
   values[symbol].push(close);
   return {symbol,timestamp:barTimestamp(date),close,is_gap:false};
  });
  if(exclude.includes(symbol))continue;
  const bytes=Buffer.from(rows.map(row=>JSON.stringify(row)).join('\n')+'\n');
  const digest=sha(bytes),relative='raw/'+symbol+'_'+digest+'.jsonl';
  fs.writeFileSync(path.join(home,relative),bytes);
  files.push({path:relative,sha256:digest,source:'https://getmarkethistory.com',
   collectedAt:'2026-10-25T00:00:00Z',observationFrom:days[0],observationThrough:days.at(-1),
   priceMode:'RAW_UNADJUSTED_1H_NOT_OFFICIAL_CLOSE',schemaVersion:'GMH_NDJSON_1H_COLUMNS_V1'});
 }
 fs.writeFileSync(path.join(home,'raw-manifest.json'),JSON.stringify({version:1,themeId:'space-satellite',files}));
 return {days,values,files};
}

test('space R1 computes only private 252-point ETF pair alternatives using approved scorer',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'space-r1-'));
 try{
  const {days,values}=fixture(root),result=auditSpaceSatellite({dataRoot:root});
  assert.equal(result.status,'PRIVATE_ALTERNATIVES_READY');
  assert.deepEqual(result.symbols,['UFO','ROKT','ARKX','SPY']);
  assert.equal(result.individualStocksUsed,0);
  assert.equal(result.publicationAuthorized,false);
  assert.equal(result.derivedLicenseVerified,false);
  assert.equal(result.d1Writes,0);
  assert.equal(result.schedulerWrites,0);
  assert.equal(result.candidates.length,2);
  for(const candidate of result.candidates){
   assert.equal(candidate.commonSessions,700);
   assert.equal(candidate.history.length,252);
   const scores=candidate.etfs.map(etf=>scoreAll252(values[etf],values.SPY));
   for(let i=0;i<252;i++){
    assert.equal(candidate.history[i].date,days.at(i-252));
    assert.equal(candidate.history[i].score,Number(((scores[0][i]+scores[1][i])/2).toFixed(5)));
   }
  }
  const stored=saveSpaceSatellite(root,result);
  assert.deepEqual(stored,saveSpaceSatellite(root,result));
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('space R1 does not invent missing ARKX history or block independently ready ROKT option',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'space-r1-partial-'));
 try{
  fixture(root,{exclude:['ARKX']});
  const result=auditSpaceSatellite({dataRoot:root});
  assert.equal(result.status,'PRIVATE_ALTERNATIVES_PARTIAL');
  assert.equal(result.candidates[0].history.length,252);
  assert.equal(result.candidates[1].status,'INSUFFICIENT_REAL_COMMON_SESSIONS');
  assert.equal(result.candidates[1].history.length,0);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('space R1 refuses modified historical raw bytes',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'space-r1-tamper-'));
 try{
  const {files}=fixture(root),raw=path.join(root,'themes','space-satellite',files[0].path);
  fs.appendFileSync(raw,'tampered');
  assert.throws(()=>auditSpaceSatellite({dataRoot:root}),{message:'SPACE_RAW_HASH_MISMATCH'});
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('space R1 bounded collector retrieves UFO/ROKT/ARKX/SPY and never publishes',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'space-r1-collect-'));
 const seen=[];
 try{
  const fetchImpl=async url=>{
   const symbol=url.pathname.split('/').at(-2);seen.push(symbol);
   return new Response(JSON.stringify({symbol,timestamp:'2026-10-22T19:00:00Z',close:100,is_gap:false})+'\n');
  };
  const options={dataRoot:root,themeId:'space-satellite',start:'2024-01-01',end:'2026-10-24',fetchImpl};
  const report=await collectOptional(options);
  assert.equal(report.status,'PRIVATE_RAW_COLLECTION_COMPLETE');
  assert.deepEqual(seen,['UFO','ROKT','ARKX','SPY']);
  assert.equal(report.providerCalls,4);
  assert.equal(report.publicWrites,0);
  assert.equal(report.d1Writes,0);
  assert.equal(report.schedulerWrites,0);
  const again=await collectOptional(options);
  assert.equal(again.providerCalls,0);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
