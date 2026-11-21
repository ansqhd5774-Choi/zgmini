import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {auditConfiguredR32SessionDates,scoreConfiguredR32Sessions,readConfiguredSessions}
 from '../scripts/pc-writer/theme-config-score.mjs';

const sha=b=>createHash('sha256').update(b).digest('hex');

test('configured reader reopens exact stored GMH bars and refuses SHA drift before any calculation',t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-w03-saved-score-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const internalId='registered-private-test',home=path.join(root,'themes',internalId);
 fs.mkdirSync(path.join(home,'raw'),{recursive:true});
 const files=[];
 let firstFile;
 for(const [symbol,offset] of [['AAA',0],['BBB',5],['SPY',30]]){
  const rows=[2,3].map(day=>({
   symbol,timestamp:`2026-02-0${day}T20:20:00Z`,
   close:100+offset+day,is_gap:false
  }));
  const bytes=Buffer.from(rows.map(r=>JSON.stringify(r)).join('\n')+'\n');
  const hash=sha(bytes),relative=`raw/${symbol}_${hash}.jsonl`;
  const file=path.join(home,relative);
  fs.writeFileSync(file,bytes);
  if(symbol==='AAA')firstFile=file;
  files.push({path:relative,sha256:hash,source:'https://getmarkethistory.com',
   priceMode:'RAW_UNADJUSTED_1H_NOT_OFFICIAL_CLOSE'});
 }
 fs.writeFileSync(path.join(home,'raw-manifest.json'),
  JSON.stringify({version:1,themeId:internalId,files}));
 const registration={internalId,definition:{etfs:['AAA','BBB'],benchmark:'SPY'}};
 const read=readConfiguredSessions({dataRoot:root,registration});
 assert.equal(read.sessions.get('AAA').length,2);
 assert.equal(read.sessions.get('BBB').length,2);
 assert.equal(read.sessions.get('SPY').length,2);
 assert.equal(read.sessions.get('AAA')[1].date,'2026-02-03');
 assert.equal(read.daily.AAA.get('2026-02-02'),102);
 fs.appendFileSync(firstFile,'corrupt\n');
 assert.throws(()=>readConfiguredSessions({dataRoot:root,registration}),/CONFIG_RAW_SHA/);
});

test('registered R32 reuses existing saved-session score without inventing missing values',()=>{
 const dates=[];
 for(let t=Date.UTC(2024,0,2);dates.length<720;t+=86400000){
  const d=new Date(t),weekday=d.getUTCDay();
  if(weekday!==0&&weekday!==6)dates.push(d.toISOString().slice(0,10));
 }
 const sessions=new Map([
  ['SPY',dates.map((date,i)=>({date,close:100+i*.12+Math.sin(i/8)}))],
  ['AAA',dates.map((date,i)=>({date,close:40+i*.17+Math.sin(i/5)}))],
  ['BBB',dates.map((date,i)=>({date,close:80+i*.08+Math.sin(i/7)}))]
 ]);
 const definition={id:'test-private-r32',benchmark:'SPY',etfs:['AAA','BBB']};
 const asOf=dates.at(-1),aum={
  AAA:{aumUsd:100,aumAsOf:asOf},
  BBB:{aumUsd:200,aumAsOf:asOf}
 };
 assert.equal(auditConfiguredR32SessionDates({definition,sessions}).status,'PASS');
 const output=scoreConfiguredR32Sessions({
  definition,sessions,aum,allowDatedOfficialAum:true
 });
 assert.equal(output.history.length,252);
 assert.equal(output.history.at(-1).date,asOf);
 assert.ok(Number.isFinite(output.history.at(-1).score));
 assert.ok(output.history.at(-1).score>=0&&output.history.at(-1).score<=100);
 assert.deepEqual(output.history.at(-1).contributingETFs,['AAA','BBB']);
 const changed=new Map(sessions);
 changed.set('AAA',[...sessions.get('AAA'),{date:'2027-01-01',close:999}]);
 const audit=auditConfiguredR32SessionDates({definition,sessions:changed});
 assert.equal(audit.reasonCode,'THEME_NINE_R25_NON_SPY_DATE');
 assert.throws(()=>scoreConfiguredR32Sessions({definition,sessions:changed,aum}),
  error=>error.code==='THEME_NINE_R25_NON_SPY_DATE'&&
   error.firstFail==='ETF_DATE_NOT_PRESENT_IN_SPY');
 assert.throws(()=>scoreConfiguredR32Sessions({definition,sessions,aum:{AAA:aum.AAA}}),
  /THEME_AUM_MISSING/);
});
