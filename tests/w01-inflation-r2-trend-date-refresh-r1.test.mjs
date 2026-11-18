import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {requiresInflationR2TrendDateRefresh as refresh,
 inflationR2AsOfTrendCompatibility as compatible}
 from '../scripts/pc-writer/inflation-r2-trend-date-refresh.mjs';
import {inflationR2TrendDates}
 from '../worker/projection-builders/inflation.mjs';

const value=58.125;
const trend=[
 {label:'2025-12-31',value:62},
 {label:'2026-01-31',value:61},
 {label:'2026-02-28',value:60},
 {label:'2026-03-31',value:59},
 {label:'2026-04-30',value:58},
 {label:'2026-05-31',value:57},
 {label:'2026-06-30',value:56},
 {label:'2026-07-31',value:57},
 {label:'2026-08-31',value:58},
 {label:'2026-09-30',value:59},
 {label:'2026-10-31',value:60},
 {label:'2026-11-30',value},
];
const shell=(patch={})=>({projection:{
 status:'READY',sourceStoredAt:1794825002905,sourceVersion:'unchanged',
},payload:{status:'READY',methodologyVersion:'INFLATION_R2_R29_56_IA',
 score:value,asOfDate:'2026-11-18',trend,...patch}});

test('W01 #1330 legacy future month-end stored R2 triggers exactly once',()=>{
 const legacy=shell();
 const snapshot=JSON.stringify(legacy);
 assert.equal(refresh(legacy),true);
 assert.equal(JSON.stringify(legacy),snapshot,'readonly gate must not mutate stored data');
 assert.deepEqual(inflationR2TrendDates('2026-11-18'),[
 ...trend.slice(0,-1).map(row=>row.label),'2026-11-18']);
 const repaired=shell({trend:[...trend.slice(0,-1),
  {label:'2026-11-18',value}]});
 assert.equal(refresh(repaired),false);
 assert.equal(refresh(shell({trend:trend.slice(0,-1)})),false);
});

test('W01 #1330 genuine completed month-end, leap day and rollover are not stale',()=>{
 assert.equal(refresh(shell({asOfDate:'2026-11-30'})),false);
 assert.equal(refresh(shell({asOfDate:'2026-11-18',
  trend:[{label:'2026-10-31',value}]})),false);
 assert.equal(refresh(shell({asOfDate:'2024-02-29',
  trend:[{label:'2024-02-29',value}]})),false);
 assert.equal(refresh(shell({asOfDate:'2024-02-15',
  trend:[{label:'2024-02-29',value}]})),true);
 assert.equal(refresh(shell({asOfDate:'2026-01-03',
  trend:[{label:'2025-12-31',value},{label:'2026-01-31',value}]})),true);
});

test('W01 #1330 unrelated/malformed/unsafe inputs do not trigger a publisher',()=>{
 for(const candidate of [
  null,{},shell({status:'PARTIAL'}),shell({methodologyVersion:'OTHER'}),
  shell({score:null}),shell({score:101}),shell({asOfDate:'2026-11-31'}),
  shell({asOfDate:'2026-02-30'}),shell({trend:[]}),shell({trend:null}),
  shell({trend:[{label:'2026-12-31',value}]}),
  shell({trend:[{label:'2026-11-30',value:null}]}),
  shell({trend:[{label:'2026-10-31',value:58},{label:'2026-10-31',value:59},
   {label:'2026-11-30',value}]}),
  shell({trend:[{label:'2026-12-01',value:99},{label:'2026-11-30',value}]}),
  shell({trend:[{label:'2026-11-18',value:60},{label:'2026-11-30',value}]}),
 ]){
  assert.equal(refresh(candidate),false,JSON.stringify(candidate));
 }
});

test('W01 one-time repair uses existing saved-input checkpoint, writer and D1 publication lane',()=>{
 const script=readFileSync('scripts/pc-writer/run-local.mjs','utf8');
 assert.match(script,/id==='inflation'&&requiresInflationR2TrendDateRefresh\(envelope\)/);
 assert.match(script,/debtHistoryRefresh\|\|inflationR2DateRefresh/);
 assert.match(script,/const input=r10\?\.status==='READY'\?null:await loadProjectionSource\(id,scope,\{now:checkpoint\.sourceStoredAt\}\)/);
 assert.match(script,/await builders\[id\]\(input\)/);
 assert.match(script,/await projectionWriter\(core\)\.write\(id,payload,Date\.now\(\),checkpoint\)/);
 assert.match(script,/await projectionWriter\(remote\.adapter\(config\.core,\{allowWrites:true\}\)\)\.write\(id,envelope\.payload,row\.stored_at,envelope\.projection\)/);
 assert.doesNotMatch(script,/\bfetch\s*\('https:\/\//);
});

test('W01 legacy PC builder display repair uses its genuine current score, not the future score',()=>{
 const legacy=shell({score:58.125,
  updatedAt:'2026-11-18T08:30:00.000Z',
  sourceStoredAt:'2026-11-16T10:30:00.000Z',
  scoreComparisons:{week:1,month:null},
  axes:{TARGET_STABILITY:53},
  features:{CORE_PCE:{value:3.8}},
  trend:[...trend.slice(0,-1),{label:'2026-11-30',value:77}],
 });
 const source=structuredClone(legacy.payload);
 const fixed=compatible(legacy.payload);
 assert.notStrictEqual(fixed,legacy.payload);
 assert.equal(fixed.score,58.125);
 assert.deepEqual(fixed.trend.slice(0,-1),trend.slice(0,-1));
 assert.deepEqual(fixed.trend.at(-1),{label:'2026-11-18',value:58.125});
 assert.strictEqual(fixed.axes,legacy.payload.axes);
 assert.strictEqual(fixed.features,legacy.payload.features);
 assert.strictEqual(fixed.scoreComparisons,legacy.payload.scoreComparisons);
 assert.equal(fixed.sourceStoredAt,legacy.payload.sourceStoredAt);
 assert.equal(fixed.updatedAt,legacy.payload.updatedAt);
 assert.deepEqual(legacy.payload,source,'existing stored payload must remain byte-equivalent');
 assert.equal(refresh({payload:fixed}),false,'exact repair must not repeat');
});

test('W01 actual as-of builder or unsafe/missing source never triggers a synthetic repair',()=>{
 const current=shell({trend:[...trend.slice(0,-1),
  {label:'2026-11-18',value}]});
 assert.strictEqual(compatible(current.payload),current.payload);
 const invalids=[
  null,{},shell({status:'PARTIAL'}).payload,
  shell({score:null}).payload,
  shell({methodologyVersion:'OTHER'}).payload,
  shell({trend:[{label:'2026-11-30',value:null}]}).payload,
  shell({asOfDate:'2026-11-31'}).payload,
  shell({trend:[{label:'2026-12-31',value:40}]}).payload,
  shell({trend:[]}).payload,
 ];
 for(const candidate of invalids)
  assert.strictEqual(compatible(candidate),candidate);
});

test('W01 compatibility is pure and affects no existing scorer formulas or public GET',()=>{
 const helper=readFileSync('scripts/pc-writer/inflation-r2-trend-date-refresh.mjs','utf8');
 assert.match(helper,/inflationR2AsOfTrendCompatibility/);
 assert.match(helper,/label:payload\.asOfDate,value:payload\.score/);
 assert.doesNotMatch(helper,/\bfetch\s*\(|\.prepare\s*\(|\.run\s*\(/);
 const writer=readFileSync('scripts/pc-writer/run-local.mjs','utf8');
 assert.match(writer,/await projectionWriter\(core\)\.write\(id,payload,Date\.now\(\),checkpoint\)/);
});
