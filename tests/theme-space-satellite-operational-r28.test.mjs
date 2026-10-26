import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {readApprovedSpacePrices,runApprovedSpacePcR28} from
 '../scripts/pc-writer/theme-space-satellite-operational-r28.mjs';

const symbols=['UFO','NASA','WARP','ROKT'];
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const days=()=>{
 const rows=[];for(let ms=Date.parse('2025-01-01T00:00:00Z');
  ms<=Date.parse('2026-10-23T00:00:00Z');ms+=86_400_000){
  const date=new Date(ms).toISOString().slice(0,10);
  // All synthetic dates are calendar dates, used only by this unit test.
  const trial=new Date(date+'T20:00:00Z');
  const localHour=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',
   hour:'2-digit',hourCycle:'h23'}).format(trial);
  const timestamp=date+(localHour==='15'?'T20:00:00Z':'T19:00:00Z');
  rows.push({date,timestamp});
 }
 return rows;
};
test('R28 produces the approved basket from newly verified PC prices, not pinned R21 scores',()=>{
 const calendar=days();
 const rawReader=()=>({manifestSha256:'a'.repeat(64),
  sessions:Object.fromEntries(symbols.map((symbol,j)=>[symbol,
   calendar.map(({date,timestamp},i)=>({date,timestamp,close:
    25+j*8+i*.14+Math.sin(i/7+j)*2}))]))});
 const spyReader=()=>({manifestSha256:'b'.repeat(64),
  priceMode:'RAW_UNADJUSTED_1H_NOT_OFFICIAL_CLOSE',
  bars:calendar.map(({timestamp},i)=>({timestamp,close:300+i*.18+Math.cos(i/11)}))});
 const out=runApprovedSpacePcR28({dataRoot:'unused-in-injected-test',rawReader,spyReader});
 assert.equal(out.status,'PRIVATE_CURRENT_APPROVED_BASKET_READY');
 assert.equal(out.scoreAsOf,'2026-10-23');
 assert.equal(out.latest.etfs.join(','),'UFO,NASA,WARP,ROKT');
 assert.ok(out.latest.score>=0&&out.latest.score<=100);
 assert.equal(out.history.length,252);
 assert.equal(out.scoredDays,252);
 assert.equal(out.providerCalls+out.d1Writes+out.publicWrites+out.schedulerWrites,0);
});
test('R28 raw reader checks content digest and ignores excluded previously collected symbols',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-space-r28-'));
 try{
  const home=path.join(root,'themes','space-satellite');
  fs.mkdirSync(path.join(home,'raw'),{recursive:true});
  const files=[];
  for(const symbol of [...symbols,'MARS']){
   const raw=JSON.stringify({symbol,timestamp:'2026-10-23T19:00:00Z',
    close:50,is_gap:false})+'\n';
   const digest=hash(raw),relative=`raw/${symbol}_${digest}.jsonl`;
   fs.writeFileSync(path.join(home,relative),raw);
   files.push({path:relative,sha256:digest,source:'https://getmarkethistory.com',
    priceMode:'RAW_UNADJUSTED_1H_NOT_OFFICIAL_CLOSE',
    collectedAt:'2026-10-24T00:00:00Z',observationFrom:'2026-10-23',
    observationThrough:'2026-10-23'});
  }
  fs.writeFileSync(path.join(home,'raw-manifest.json'),JSON.stringify({
   version:1,themeId:'space-satellite',files}));
  const result=readApprovedSpacePrices({dataRoot:root,symbols});
  assert.deepEqual(result.symbols,symbols);
  assert.equal(Object.keys(result.files).length,4);
  assert.equal(result.sessions.UFO.length,1);
  assert.equal(result.providerCalls,0);
  const target=path.join(home,files[0].path);
  fs.appendFileSync(target,'tamper');
  assert.throws(()=>readApprovedSpacePrices({dataRoot:root,symbols}),
   /SPACE_R28_RAW_SHA_MISMATCH/);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
