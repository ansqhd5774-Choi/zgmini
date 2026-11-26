import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {SYMBOLS,PAIRS,HOME,DATA_SCHEMA,
 collectSevenGmh,computeSevenGmh,saveSevenPrivateCandidate}
 from '../scripts/pc-writer/theme-seven-gmh-history-r1.mjs';
const digest=b=>createHash('sha256').update(b).digest('hex');
const early=new Set(['2024-07-03','2024-11-29','2024-12-24',
 '2025-07-03','2025-11-28','2025-12-24','2026-11-27','2026-12-24']);
const nyHour=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',
 hour:'2-digit',hourCycle:'h23'});
const utcBar=day=>{
 const at19=Number(nyHour.formatToParts(new Date(day+'T19:00:00Z'))
  .find(p=>p.type==='hour').value);
 const expectedNY=early.has(day)?12:15;
 const utc=19+expectedNY-at19;
 return day+'T'+String(utc).padStart(2,'0')+':00:00Z';
};
const days=()=>{
 const a=[];for(let t=Date.UTC(2024,2,4);a.length<628;t+=86400000){
  const d=new Date(t),weekday=d.getUTCDay();
  if(weekday!==0&&weekday!==6)a.push(d.toISOString().slice(0,10));
 }return a;
};
const sample=days();
const price=(j,s)=>100+j*.07+s*.65+Math.sin((j+s*5)/23)*2+
 Math.cos((j-s)/31)*1.15;
const body=s=>sample.map((day,j)=>JSON.stringify({
 symbol:s,timestamp:utcBar(day),close:price(j,SYMBOLS.indexOf(s)),
 is_gap:false})).join('\n')+'\n';
test('manual GMH-only 14-symbol 628-session bridge resumes exact 4 GETs, computes 7x252 offline',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'w03-seven-gmh-'));
 const seen=[];const now=()=> '2026-11-16T00:00:00.000Z';
 const fetchImpl=async url=>{
  assert.equal(url.origin,'https://getmarkethistory.com');
  assert.match(url.pathname,/^\/api\/v1\/bars\/stocks\/us\/[A-Z]+\/1h$/);
  assert.equal(url.searchParams.get('start'),'2024-03-04');
  assert.equal(url.searchParams.get('end'),'2026-11-13');
  assert.equal(url.searchParams.get('limit'),'5000');
  assert.equal(url.searchParams.get('format'),'jsonl');
  assert.equal(url.searchParams.has('cursor'),false);
  const sym=url.pathname.split('/').at(-2);seen.push(sym);
  return new Response(body(sym),{status:200,
   headers:{'content-type':'application/x-ndjson'}});
 };
 try{
  const opts={dataRoot:root,start:'2024-03-04',end:'2026-11-13',
   fetchImpl,clock:now};
  for(let i=0;i<4;i++){
   const result=await collectSevenGmh(opts);
   assert.equal(result.providerCalls,i===3?2:4);
   assert.equal(result.status,i===3?'PRIVATE_GMH_HISTORY_COLLECTED':
    'CHECKPOINT_READY_TO_RESUME');
  }
  assert.deepEqual(seen,SYMBOLS,'ticker order is exact, no duplicate GET');
  assert.equal((await collectSevenGmh(opts)).providerCalls,0);
  const output=computeSevenGmh({dataRoot:root});
  assert.equal(output.status,'PRIVATE_GMH_ONLY_7X252_NOT_PUBLISHED');
  assert.equal(output.commonSessionCount,628);
  assert.equal(output.themes.length,7);
  assert.equal(output.themes[0].theme,PAIRS[0].theme);
  assert.equal(output.observationDate,sample.at(-1));
  assert.equal(output.inputProvider,'GETMARKETHISTORY_FREE_HOURLY_ONLY');
  assert.equal(output.barRowsRead,14*628);
  assert.equal(output.publicationAuthorized,false);
  assert.equal(output.providerCalls,0);
  assert.equal(output.d1Writes,0);
  assert.ok(output.themes.every(t=>t.history.length===252&&
   t.history.every(p=>p.score>=0&&p.score<=100)));
  const file=saveSevenPrivateCandidate(root,output);
  assert.equal(file.status,'PRIVATE_CANDIDATE_SAVED');
  assert.equal(saveSevenPrivateCandidate(root,output).status,'EXISTING_IDENTICAL');
  const saved=path.join(root,...HOME.split('/'),'derived',
    'seven-gmh-'+file.sha256.slice(0,16)+'.json');
  assert.equal(digest(fs.readFileSync(saved)),file.sha256);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('provider-declared gap bars are preserved, not rejected or invented as a price',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'w03-seven-gap-'));
 let calls=0;
 try{
  const r=await collectSevenGmh({dataRoot:root,start:'2026-11-10',
   end:'2026-11-13',maxRequests:1,fetchImpl:async url=>{
    calls++;return new Response(JSON.stringify({symbol:'SPY',
     timestamp:'2026-11-12T20:00:00Z',close:null,is_gap:true})+'\n');
   }});
  assert.equal(r.status,'CHECKPOINT_READY_TO_RESUME');
  assert.equal(calls,1);
  const saved=JSON.parse(fs.readFileSync(path.join(root,...HOME.split('/'),
   'raw-manifest.json'),'utf8'));
  assert.equal(saved.files.length,1);
  const raw=fs.readFileSync(path.join(root,...HOME.split('/'),
   ...saved.files[0].path.split('/')),'utf8');
  assert.equal(JSON.parse(raw).is_gap,true);
  assert.equal(JSON.parse(raw).close,null);
  assert.equal(saved.files[0].source,'GETMARKETHISTORY_FREE_1H');
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('wrong provider ticker cannot commit raw and failed attempt does not auto-replay',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'w03-seven-stop-'));
 let calls=0;
 const opts={dataRoot:root,start:'2026-11-10',end:'2026-11-13',
  maxRequests:1,fetchImpl:async()=>{
   calls++;
   return new Response(JSON.stringify({symbol:'OTHER',
    timestamp:'2026-11-12T20:00:00Z',close:100,is_gap:false})+'\n');
  }};
 try{
  await assert.rejects(()=>collectSevenGmh(opts),/PROVIDER_IDENTITY_OR_ORDER/);
  assert.equal(calls,1);
  const home=path.join(root,...HOME.split('/'));
  assert.equal(fs.existsSync(path.join(home,'raw-manifest.json')),false);
  assert.deepEqual(fs.readdirSync(path.join(home,'raw')),[]);
  const second=await collectSevenGmh(opts);
  assert.equal(second.status,'STOP_PREVIOUS_FAILURE_REVIEW_REQUIRED');
  assert.equal(second.providerCalls,0);
  assert.equal(calls,1);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('GET 429 is never masked by preview data, and no retry occurs',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'w03-seven-rate-'));
 let calls=0;
 try{
  const opts={dataRoot:root,start:'2026-11-10',end:'2026-11-13',
   fetchImpl:async()=>{calls++;return new Response('',{status:429});}};
  assert.equal((await collectSevenGmh(opts)).status,'STOP_PROVIDER_HTTP_429');
  assert.equal((await collectSevenGmh(opts)).providerCalls,0);
  assert.equal(calls,1);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
