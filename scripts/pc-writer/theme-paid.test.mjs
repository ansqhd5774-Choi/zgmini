import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {easternBarToUtc,parseSelectedHourly,selectedHourlySql,syncPaidHourly,readPaidHourly,PAID_HOURLY_MODE} from './theme-paid-hourly-source.mjs';
import {choosePaidPhaseDates,mergePublishedThemeHistory,calculatePaidThemes} from './theme-paid-calculate.mjs';
import {scoreOneR25} from './theme-r25-pure.mjs';
import {mixNineR32Date} from './theme-r32-pure.mjs';
import {scoreAll252} from './theme-optional-score-r188.mjs';
import {publishPaidThemeRecord,storePaidPrivateResults} from './theme-paid-cycle.mjs';
import {validPaidThemeRecord,PAID_THEME_KEY} from '../../worker/theme-paid-contract.mjs';
import {readPaidThemeFeed} from '../../worker/theme-paid-public.mjs';
import {themeEtfDashboardSeries} from '../../lib/theme-etf-dashboard.mjs';
const H='a'.repeat(64),now=Date.parse('2026-11-20T15:00:00Z');
const dates=Array.from({length:760},(_,i)=>new Date(Date.parse('2024-01-01T00:00:00Z')+i*86400000).toISOString().slice(0,10));
const series={SPY:dates.map((date,i)=>({date,close:100+i*.1,timestamp:date+'T20:00:00Z'})),AAA:dates.map((date,i)=>({date,close:50+i*.08+Math.sin(i/8),timestamp:date+'T20:00:00Z'})),BBB:dates.map((date,i)=>({date,close:80+i*.03+Math.sin(i/13),timestamp:date+'T20:00:00Z'})),CCC:dates.map((date,i)=>({date,close:100+i*.05+Math.cos(i/18),timestamp:date+'T20:00:00Z'}))};
const phases={confirmed:dates.at(-2),provisional:dates.at(-1),sourceLatest:dates.at(-1),confirmedLagHours:48,provisionalLagHours:24,clockBasis:'ACTUAL_NY_PROXY_BAR_END'};
const method='ETF_ONLY_T40_R20_V40_ADAPTIVE_R2_DATED_ISSUER_AUM_R32';
function input(n=1){const themes=Array.from({length:n},(_,i)=>({id:'theme-'+i,label:'테마 '+i,enabled:true,public:true,methodologyVersion:method,etfs:['AAA','BBB','CCC']}));return {registry:{themes},aumByTheme:Object.fromEntries(themes.map(t=>[t.id,t.etfs.map((ticker,i)=>({ticker,aumUsd:(i+1)*100,aumAsOf:'2024-01-01'}))])),series,phases,sourceStoredAt:new Date(now-1000).toISOString(),registrySha256:H,sourceVersion:H,now};}
function fixture(){const x=input();x.previousThemes=[{id:'theme-0',theme:'테마 0',history:dates.slice(-254,-2).map(date=>({date,score:42}))}];const r=calculatePaidThemes(x).record;const end=r.observationDate;const shift=Date.parse('2026-11-17T00:00:00Z')-Date.parse(end+'T00:00:00Z');const move=d=>new Date(Date.parse(d+'T00:00:00Z')+shift).toISOString().slice(0,10);r.observationDate=move(r.observationDate);r.confirmedObservationDate=r.observationDate;r.sourceLatestDate=move(r.sourceLatestDate);for(const t of r.themes){t.confirmedObservationDate=r.observationDate;t.provisionalObservationDate=move(t.provisionalObservationDate);t.history=t.history.map(p=>({...p,date:move(p.date)}));t.provisional=t.provisional.map(p=>({...p,date:move(p.date)}));}r.provisional.points=r.provisional.points.map(p=>({...p,date:move(p.date)}));return r;}
test('Eastern provider wall times convert through DST without shifting observation date',()=>{assert.equal(easternBarToUtc('2026-10-30 15:00:00'),'2026-10-30T19:00:00.000Z');assert.equal(easternBarToUtc('2026-11-02 15:00:00'),'2026-11-02T20:00:00.000Z');assert.equal(easternBarToUtc('2026-11-27 12:00:00'),'2026-11-27T17:00:00.000Z');});
test('paid provider published completed bars confirm immediately without inherited 48h/24h delay',()=>{const spy=['2026-11-16','2026-11-17','2026-11-18','2026-11-19'].map(date=>({date,timestamp:date+'T20:00:00Z'}));const p=choosePaidPhaseDates(spy,{now});assert.equal(p.confirmed,'2026-11-19');assert.equal(p.provisional,'2026-11-19');assert.equal(p.sourceLatest,'2026-11-19');assert.equal(p.confirmedLagHours,0);assert.equal(p.provisionalLagHours,0);});
test('SQL uses approved half-day selector and refuses untrusted symbols',()=>{assert.match(selectedHourlySql(['SPY','AAA']),/2026-11-27/);assert.match(selectedHourlySql(['SPY']),/THEN 12 ELSE 15/);assert.throws(()=>selectedHourlySql(["SPY';DROP TABLE bars"]));});
test('truncated, wrong-hour and duplicate observations never become prices',()=>{const q={columns:['trade_date','observations'],rows:[['2026-11-19',JSON.stringify([{symbol:'SPY',bar_time:'2026-11-19 15:00:00',close:100}])]],truncated:false};const opts={symbols:['SPY'],start:'2026-11-19',end:'2026-11-19'};assert.equal(parseSelectedHourly(q,opts).SPY.length,1);assert.throws(()=>parseSelectedHourly({...q,truncated:true},opts));const bad=structuredClone(q);bad.rows[0][1]=bad.rows[0][1].replace('15:00','14:00');assert.throws(()=>parseSelectedHourly(bad,opts));});
test('approved pure source sections retain their original byte identities',()=>{for(const [name,marker,hash] of [['theme-r25-pure.mjs','export function scoreOneR25','7a601057c58bebb6f788c6a914efb6ba9f0f6072b35d00f5480659bd46901de2'],['theme-r32-pure.mjs','const fail','2ff010aeb0d45c0665ad7b92134c2c014486ed452138c98d8d82f5e3cd6c5b95'],['theme-space-basket-pure.mjs','const need','e4c8b207e0b1569f5280343ae445666d4c2d6347b2f6794d9b54fa7a8cfece57']]){const source=fs.readFileSync(new URL('./'+name,import.meta.url),'utf8').replaceAll('\r\n','\n');assert.equal(createHash('sha256').update(source.slice(source.indexOf(marker))).digest('hex'),hash);}});
test('R25 mature scores equal the independent original R188 implementation',()=>{const own=series.AAA.map(p=>p.close),spy=series.SPY.map(p=>p.close);const expected=scoreAll252(own,spy),actual=scoreOneR25({symbol:'AAA',ownSessions:series.AAA,spySessions:series.SPY}).history;assert.equal(expected.length,actual.length);for(let i=0;i<expected.length;i++)assert.ok(Math.abs(expected[i]-actual[i].score)<1e-9);});
test('R32 preserves AUM weighting and real zero scores',()=>{const rows=[{ticker:'AAA',score:0,sessions:800,status:'R188_COMPATIBLE',aumUsd:100,aumAsOf:'2026-10-23'},{ticker:'BBB',score:50,sessions:800,status:'R188_COMPATIBLE',aumUsd:200,aumAsOf:'2026-10-23'},{ticker:'CCC',score:100,sessions:800,status:'R188_COMPATIBLE',aumUsd:100,aumAsOf:'2026-10-23'}];const x=mixNineR32Date({date:'2026-11-17',rows,benchmarkDate:'2026-11-17',allowDatedOfficialAum:true});assert.equal(x.score,50);assert.deepEqual(x.weightsPercent,{AAA:25,BBB:50,CCC:25});});
test('published past values are retained exactly, including zero; only new real dates append',()=>{const prior={history:[{date:'2026-11-16',score:0},{date:'2026-11-17',score:40}]};assert.deepEqual(mergePublishedThemeHistory(prior,[{date:'2026-11-16',score:99},{date:'2026-11-18',score:20}], '2026-11-18'),[...prior.history,{date:'2026-11-18',score:20}]);});
test('105 public registrations calculate through one shared source and one private theme stays private',()=>{const x=input(105);x.registry.themes.push({...x.registry.themes[0],id:'private-development',label:'개발 중',public:false});x.aumByTheme['private-development']=x.aumByTheme['theme-0'];const r=calculatePaidThemes(x);assert.equal(r.record.themes.length,105);assert.equal(r.privateResults.length,1);assert.equal(r.privateRecords.length,1);assert.equal(r.privateRecords[0].id,'private-development');assert.equal(r.privateRecords[0].history.length,252);assert.equal(r.privateRecords[0].history.at(-1).date,phases.confirmed);assert.equal(r.record.themes.some(t=>t.id==='private-development'),false);assert.equal(JSON.stringify(r.record).includes('private-development'),false);assert.equal(r.results.length,106);});
test('private derived score history persists with immutable readback without D1 publication',()=>{
 const x=input();x.registry.themes[0].public=false;x.registry.themes[0].operational={family:'configured'};
 const output=calculatePaidThemes(x);assert.equal(output.record.themes.length,0);
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'paid-private-result-'));
 try{
  const args={privateRecords:output.privateRecords,sourceVersion:H,registrySha256:H,phases};
  const first=storePaidPrivateResults(dir,args);
  assert.equal(first.status,'PRIVATE_STORED_READBACK_VERIFIED');assert.equal(first.count,1);
  const filenames=fs.readdirSync(dir);assert.equal(filenames.length,1);
  const stored=JSON.parse(fs.readFileSync(path.join(dir,filenames[0]),'utf8'));
  assert.equal(stored.themes[0].id,'theme-0');assert.equal(stored.themes[0].history.length,252);
  assert.equal(storePaidPrivateResults(dir,args).bodySha256,first.bodySha256);
  assert.equal(fs.readdirSync(dir).length,1);
  fs.writeFileSync(path.join(dir,filenames[0]),'{}');
  assert.throws(()=>storePaidPrivateResults(dir,args),/PAID_THEME_PRIVATE_READBACK_MISMATCH/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('configured private to approved-public boundary uses the same stored paid Reader',async()=>{
 const x=input(2),confirmed=phases.confirmed;
 // Fixed simulated current observation, no real provider, D1 or approval file writes.
 const at=Date.parse(confirmed+'T23:00:00Z');
 x.now=at-1000;x.sourceStoredAt=new Date(at-2000).toISOString();
 x.phases={confirmed,provisional:confirmed,sourceLatest:confirmed,
  confirmedLagHours:0,provisionalLagHours:0,clockBasis:'PROVIDER_PUBLISHED_PROXY_BAR_END'};
 x.registry.themes[1].id='ai-software';x.registry.themes[1].label='AI 소프트웨어';
 x.registry.themes[1].public=false;x.registry.themes[1].operational={family:'configured'};
 x.aumByTheme['ai-software']=x.aumByTheme['theme-1'];delete x.aumByTheme['theme-1'];
 const privateOutput=calculatePaidThemes(x);
 assert.equal(privateOutput.privateRecords.length,1);
 assert.equal(privateOutput.privateRecords[0].id,'ai-software');
 assert.equal(privateOutput.record.themes.some(t=>t.id==='ai-software'),false);
 const stored=(record)=>({prepare(){
  return {bind(key){
   assert.equal(key,PAID_THEME_KEY);
   return {async first(){return {body:JSON.stringify(record),stored_at:at-1000};}};
  }};
 }});
 const before=await readPaidThemeFeed(stored(privateOutput.record),{now:at});
 assert.equal(before.status,200);
 const beforeBody=await before.json();
 assert.deepEqual(beforeBody.themes.map(t=>t.id),['theme-0']);
 assert.equal(JSON.stringify(beforeBody).includes('ai-software'),false);
 assert.equal(beforeBody.dataQuality.expectedPublicIds.includes('ai-software'),false);
 // Simulate a previously approved registry result, not grant actual publication approval.
 x.registry.themes[1].public=true;
 const approvedOutput=calculatePaidThemes(x);
 assert.equal(approvedOutput.privateRecords.length,0);
 assert.equal(approvedOutput.record.themes.length,2);
 assert.ok(validPaidThemeRecord(approvedOutput.record));
 const after=await readPaidThemeFeed(stored(approvedOutput.record),{now:at});
 assert.equal(after.status,200);
 const afterBody=await after.json();
 assert.deepEqual(afterBody.themes.map(t=>t.id),['theme-0','ai-software']);
 assert.equal(afterBody.themes[1].history.length,252);
 assert.equal(afterBody.dataQuality.pendingPublicIds.length,0);
});
test('one incomplete registration does not block independent ready themes',()=>{const x=input(2);x.registry.themes[1].etfs=['MISSING'];const r=calculatePaidThemes(x);assert.equal(r.record.themes.length,1);assert.deepEqual(r.record.dataQuality.pendingPublicIds,['theme-1']);});
test('paid record is renderable by existing dashboard adapter',()=>{const r=fixture();assert.ok(validPaidThemeRecord(r));const view=themeEtfDashboardSeries(r);assert.equal(view.series.length,1);assert.equal(view.data.length,253);assert.equal(Object.keys(view.provisionalBySeries).length,1);});
test('record validation rejects bad numbers, method changes and dishonest coverage',()=>{const r=fixture();for(const change of [x=>x.themes[0].score=NaN,x=>x.themes[0].methodologyVersion='FAKE',x=>x.dataQuality.readyPublicIds.push('private')]){const b=structuredClone(r);change(b);assert.equal(validPaidThemeRecord(b),false);}});
function remoteStore(initial=null,{failWrite=false,loseCas=false}={}){let row=initial,writes=0;return {get row(){return row;},get writes(){return writes;},async query(){return {results:row?[row]:[]};},async request(_db,[entry]){writes++;if(failWrite)throw Error('NETWORK');if(loseCas)return [{meta:{changes:0}}];row={feed_key:PAID_THEME_KEY,body:entry.params[row?0:1],stored_at:entry.params[row?1:2]};return [{meta:{changes:1}}];}};}
test('CAS publish verifies exact stored bytes, and unchanged source does not publish twice',async()=>{const r=fixture(),remote=remoteStore();const p=await publishPaidThemeRecord({remote,dbId:'db',record:r,preimage:null,now});assert.equal(p.written,1);assert.equal(JSON.parse(remote.row.body).themes.length,1);const again=await publishPaidThemeRecord({remote,dbId:'db',record:{...r,updatedAt:new Date(now+1000).toISOString()},preimage:remote.row,now:now+1000});assert.equal(again.written,0);assert.equal(remote.writes,1);});
test('lost CAS and unknown write outcome are never retried or reported successful',async()=>{const r=fixture();for(const opts of [{failWrite:true},{loseCas:true}]){const remote=remoteStore(null,opts);await assert.rejects(publishPaidThemeRecord({remote,dbId:'db',record:r,preimage:null,now}));assert.equal(remote.writes,1);}});
test('public GET strips raw/private extras and performs no provider fetch',async()=>{const r=fixture();r.rawPrices=[123];r.themes[0].privateSecret='must-not-escape';r.themes[0].history[0].close=123;const db={prepare(){return {bind(){return {async first(){return {body:JSON.stringify(r),stored_at:now};}};}};}};const response=await readPaidThemeFeed(db,{now});const body=await response.json();assert.equal(body.themes.length,1);assert.ok(!JSON.stringify(body).includes('must-not-escape'));assert.equal(body.rawPrices,undefined);assert.equal(body.themes[0].history[0].close,undefined);});
test('stale or absent paid records preserve existing reader fallback',async()=>{const r=fixture();const db={prepare(){return {bind(){return {async first(){return {body:JSON.stringify(r),stored_at:now};}};}};}};assert.equal(await readPaidThemeFeed(db,{now:now+9*86400000}),null);assert.equal(await readPaidThemeFeed({prepare(){throw Error('MISSING');}},{now}),null);});

test('first mature publication keeps 252 confirmed observations independently of provisional tail',()=>{const r=calculatePaidThemes(input());assert.equal(r.record.themes[0].history.length,252);assert.equal(r.record.themes[0].history.at(-1).date,phases.confirmed);assert.equal(r.record.provisional.points.length,1);});

test('hourly cache resumes chunks and refreshes a coherent generation only on a new publication day',async()=>{
 const base=fs.mkdtempSync(path.join(os.tmpdir(),'paid-hourly-test-'));
 try{
 fs.writeFileSync(path.join(base,'providers.env'),'MARKETPARQUET_API_KEY=fixture-only');
 let end='2026-11-19',queries=0;
 const fetchImpl=async(_url,options)=>{const call=JSON.parse(options.body).params;let value;
 if(call.name==='list_datasets')value={plan:'full',mcp_included:true,datasets:[{dataset:'etf_1hour',coverage:['2023-01-01',end]}]};
 else{queries++;const d=call.arguments.end_date;value={columns:['trade_date','observations'],rows:[[d,JSON.stringify([{symbol:'SPY',bar_time:d+' 15:00:00',close:100+queries}])]],truncated:false,row_count:1};}
 return new Response(JSON.stringify({jsonrpc:'2.0',id:1,result:{structuredContent:value}}));};
 const args={symbols:['SPY'],start:'2026-01-01',fetchImpl,maxChunks:1};
 assert.equal((await syncPaidHourly(base,args)).status,'RUNNING');assert.equal(queries,1);
 assert.equal((await syncPaidHourly(base,args)).status,'STORED_READBACK_VERIFIED');assert.equal(queries,2);
 assert.equal((await syncPaidHourly(base,args)).acquired,0);assert.equal(queries,2);
 const old=readPaidHourly(base,['SPY']);assert.equal(old.proofs.length,2);assert.equal(old.series.SPY.at(-1).date,'2026-11-19');
 end='2026-11-20';assert.equal((await syncPaidHourly(base,args)).status,'RUNNING');
 assert.deepEqual(readPaidHourly(base,['SPY']),old); // incomplete generation cannot replace last complete inputs
 assert.equal((await syncPaidHourly(base,args)).status,'STORED_READBACK_VERIFIED');
 assert.equal(readPaidHourly(base,['SPY']).series.SPY.at(-1).date,end);assert.equal(queries,4);
 }finally{fs.rmSync(base,{recursive:true,force:true});}
});

test('only a genuinely newer unfinished provider bar is provisional; a future bar is not exposed',()=>{
 const spy=['2026-11-19','2026-11-20','2026-11-23'].map(date=>({date,timestamp:date+'T20:00:00Z'}));
 const p=choosePaidPhaseDates(spy,{now:Date.parse('2026-11-20T20:30:00Z')});
 assert.equal(p.confirmed,'2026-11-19');assert.equal(p.provisional,'2026-11-20');assert.equal(p.sourceLatest,'2026-11-20');
 const q=choosePaidPhaseDates(spy,{now:Date.parse('2026-11-20T21:00:00Z')});assert.equal(q.confirmed,'2026-11-20');assert.equal(q.provisional,q.confirmed);
});
test('new provider policy is readable and a completed current-day row is not rejected until UTC midnight',async()=>{
 const r=fixture();r.phasePolicy={confirmedLagHours:0,provisionalLagHours:0,clockBasis:'PROVIDER_PUBLISHED_PROXY_BAR_END'};
 assert.ok(validPaidThemeRecord(r));r.sourceStoredAt='2026-11-17T21:01:00Z';r.updatedAt=r.sourceStoredAt;r.provisional.points=[];r.phase='CONFIRMED';r.sourceLatestDate=r.observationDate;
 const at=Date.parse('2026-11-17T22:00:00Z'),db={prepare(){return {bind(){return {async first(){return {body:JSON.stringify(r),stored_at:Date.parse(r.updatedAt)};}};}};}};
 const response=await readPaidThemeFeed(db,{now:at});assert.equal(response.status,200);
});
