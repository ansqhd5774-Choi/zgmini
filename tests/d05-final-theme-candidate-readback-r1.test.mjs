import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {readVerifiedPaidThemeFinalOutputs,readStoredPaidThemeFinalScoreDays} from
 '../lib/score-history/d05-final-theme-candidate-readback-r1.mjs';
import {PAID_THEME_VERSION,PAID_HOURLY_MODE,validPaidThemeRecord} from
 '../worker/theme-paid-contract.mjs';

const CLOCK=Date.parse('2026-11-23T16:02:00.000Z'),DAY=86400000;
const iso=t=>new Date(t).toISOString();
const day=t=>iso(t).slice(0,10);
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
function record({at=CLOCK,score=55,phase='PROVISIONAL',extra=false}={}){
 const observationDate=day(at),nextDate=day(Date.parse(observationDate+'T00:00:00Z')+DAY);
 const themes=[
  {id:'robotics',theme:'로봇·자동화',etfs:['BOTZ','ROBO'],
   methodologyVersion:'ETF_ONLY_T40_R20_V40_PAIR50',sourcePriceMode:PAID_HOURLY_MODE,
   confirmedObservationDate:observationDate,score,
   history:[{date:observationDate,score}]}
 ];
 if(extra)themes.push({id:'biotech',theme:'바이오·신약',etfs:['IBB','XBI'],
  methodologyVersion:'ETF_ONLY_T40_R20_V40_PAIR50',sourcePriceMode:PAID_HOURLY_MODE,
  confirmedObservationDate:observationDate,score:0,history:[{date:observationDate,score:0}]});
 const names=themes.map(x=>x.theme),ids=themes.map(x=>x.id);
 return {
  version:PAID_THEME_VERSION,status:'READY',phase,
  observationDate,confirmedObservationDate:observationDate,
  sourceLatestDate:phase==='PROVISIONAL'?nextDate:observationDate,
  sourcePriceMode:PAID_HOURLY_MODE,
  sourceVersion:'a'.repeat(64),registrySha256:'b'.repeat(64),
  updatedAt:iso(at),methodologyVersion:'REGISTERED_APPROVED_THEME_METHODS_V1',
  phasePolicy:{confirmedLagHours:0,provisionalLagHours:0,
   clockBasis:'PROVIDER_PUBLISHED_PROXY_BAR_END'},
  themes,privateInputNeverExpose:{customerSecret:'private'},
  provisional:{points:phase==='PROVISIONAL'?[
   {date:nextDate,scores:Object.fromEntries(names.map(name=>[name,60]))}
  ]:[]},
  dataQuality:{expectedPublicIds:ids,readyPublicIds:ids,pendingPublicIds:[]}
 };
}
function fixture(records=[]){
 const directory='/mock/derived',files=new Map();
 for(const data of records){
  const bytes=Buffer.from(JSON.stringify(data));
  files.set(path.join(directory,'theme-'+sha(bytes)+'.json'),bytes);
 }
 const fileSystem={
  readFileSync(file){if(!files.has(file))throw Error('ENOENT');return files.get(file);},
  readdirSync(dir){assert.equal(dir,directory);return [...files.keys()].map(file=>path.basename(file));}
 };
 return {directory,files,fileSystem,paths:[...files.keys()]};
}
const verified=(fx,at=CLOCK,now=at+10000)=>readVerifiedPaidThemeFinalOutputs({
 candidatePath:fx.paths[0],calculatedAtMs:at,now,fileSystem:fx.fileSystem
});
const daily=(fx,fromDay='2026-11-24',toDay='2026-11-24',now=CLOCK+10000)=>
 readStoredPaidThemeFinalScoreDays({
  directory:fx.directory,fromDay,toDay,now,fileSystem:fx.fileSystem
 });
test('paid theme fixture matches existing approved output contract',()=>{
 assert.equal(validPaidThemeRecord(record()),true);
 assert.equal(validPaidThemeRecord(record({phase:'CONFIRMED',extra:true})),true);
});
test('one immutable confirmed final theme score verifies without raw data exposure',()=>{
 const fx=fixture([record()]),out=verified(fx);
 assert.equal(out.status,'LOCAL_FINAL_THEME_OUTPUT_VERIFIED');
 assert.equal(out.scoreCount,1);
 assert.equal(out.confirmedObservationDate,'2026-11-23');
 assert.equal(out.calculatedAt,iso(CLOCK));
 assert.match(out.outputEventsSha256,/^[a-f0-9]{64}$/);
 assert.match(out.candidateBodySha256,/^[a-f0-9]{64}$/);
 assert.ok(!('privateInputNeverExpose'in out)&&!('themes'in out));
});
test('provisional wrapper does not relabel confirmed final score as provisional',()=>{
 const fx=fixture([record()]),out=daily(fx);
 assert.equal(out.dailyFinalScorePoints,1);
 assert.equal(out.points[0].phase,'CONFIRMED');
 assert.equal(out.points[0].asOfDate,'2026-11-23');
 assert.equal(out.points[0].calculatedDateKst,'2026-11-24');
});
test('confirmed wrapper retains its finalized score and methodology',()=>{
 const fx=fixture([record({phase:'CONFIRMED'})]);
 const out=daily(fx);
 assert.equal(out.points.length,1);
 assert.equal(out.points[0].phase,'CONFIRMED');
 assert.equal(out.points[0].formulaVersion,'ETF_ONLY_T40_R20_V40_PAIR50');
});
test('multiple public themes include a real zero without reconstructing model history',()=>{
 const fx=fixture([record({extra:true})]),out=daily(fx);
 assert.equal(out.dailyFinalScorePoints,2);
 assert.equal(out.points.find(x=>x.scoreId==='theme:biotech')?.score,0);
 assert.ok(out.points.every(x=>!('history'in x)&&!('privateInputNeverExpose'in x)));
});
test('a single real calculation is not extended into 252 historical daily scores',()=>{
 const fx=fixture([record()]),out=daily(fx,'2025-11-24','2026-11-24');
 assert.equal(out.candidateFiles,1);
 assert.equal(out.actualOutputEvents,1);
 assert.equal(out.dailyFinalScorePoints,1);
});
test('two genuine calculations on the same KST day choose the latest for daily display',()=>{
 const later=CLOCK+3600000;
 const fx=fixture([record(),record({at:later,score:56})]);
 const out=daily(fx,'2026-11-24','2026-11-24',later+10000);
 assert.equal(out.candidateFiles,2);
 assert.equal(out.actualOutputEvents,2);
 assert.equal(out.dailyFinalScorePoints,1);
 assert.equal(out.points[0].score,56);
 assert.equal(out.points[0].calculatedAt,iso(later));
});
test('duplicate immutable candidate replay is one event, never another date',()=>{
 const data=record(),fx=fixture([data,data]),out=daily(fx);
 assert.equal(out.candidateFiles,1);
 assert.equal(out.actualOutputEvents,1);
 assert.equal(out.dailyFinalScorePoints,1);
});
test('same score and clock with conflicting bytes must fail rather than silently overwrite',()=>{
 const fx=fixture([record(),record({score:65})]);
 assert.throws(()=>daily(fx),/SAME_CLOCK_CONFLICT/);
});
test('modified immutable body is rejected by SHA before considering score',()=>{
 const fx=fixture([record()]);
 fx.files.set(fx.paths[0],Buffer.from(JSON.stringify(record({score:60}))));
 assert.throws(()=>verified(fx),/SHA_MISMATCH/);
});
test('a matching file name containing invalid JSON cannot create a score',()=>{
 const fx=fixture([]),bytes=Buffer.from('{not-json');
 const name=path.join(fx.directory,'theme-'+sha(bytes)+'.json');
 fx.files.set(name,bytes);fx.paths=[name];
 assert.throws(()=>verified(fx),/JSON_INVALID/);
});
test('unapproved malformed paid-theme record is not given final-output status',()=>{
 const data=record();data.status='PENDING';
 const fx=fixture([data]);
 assert.throws(()=>verified(fx),/FINAL_OUTPUT_NOT_APPROVED/);
});
test('publication or GET timestamp cannot replace the actual local calculation clock',()=>{
 const fx=fixture([record()]);
 assert.throws(()=>verified(fx,CLOCK+1000),/CHECKPOINT_MISMATCH/);
 assert.throws(()=>verified(fx,CLOCK,CLOCK-1),/CALCULATION_CLOCK_INVALID/);
});
test('future candidate in archive cannot be presented as an earlier real event',()=>{
 const fx=fixture([record({at:CLOCK+1000})]);
 assert.throws(()=>daily(fx,'2026-11-24','2026-11-24',CLOCK),/CALCULATION_CLOCK_UNVERIFIED/);
});
test('missing candidate file is an error, never a synthetic successful readback',()=>{
 const fx=fixture([record()]);fx.files.clear();
 assert.throws(()=>verified(fx),/CANDIDATE_UNAVAILABLE/);
});
test('candidate over public derived byte budget is rejected before SHA parsing',()=>{
 const fx=fixture([record()]);
 fx.files.set(fx.paths[0],Buffer.alloc(1800001,32));
 assert.throws(()=>verified(fx),/SIZE_INVALID/);
});
test('no immutable candidates means no actual output days',()=>{
 const fx=fixture([]),out=daily(fx);
 assert.deepEqual(out.points,[]);assert.equal(out.actualOutputEvents,0);
 assert.equal(out.dailyFinalScorePoints,0);
});
test('invalid date range and more than one year stop without reading records',()=>{
 const fx=fixture([record()]);
 assert.throws(()=>daily(fx,'2026-02-30','2026-11-24'),/RANGE_INVALID/);
 assert.throws(()=>daily(fx,'2025-01-01','2026-11-24'),/RANGE_INVALID/);
});
test('bounded complete-archive scan refuses partial 1-year coverage',()=>{
 const fx=fixture([]);
 fx.fileSystem.readdirSync=()=>Array.from({length:10001},(_,i)=>
  'theme-'+i.toString(16).padStart(64,'0')+'.json');
 assert.throws(()=>daily(fx),/FILES_LIMIT_EXCEEDED/);
});
