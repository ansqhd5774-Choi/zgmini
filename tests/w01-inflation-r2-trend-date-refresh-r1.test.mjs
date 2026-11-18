import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {requiresInflationR2TrendDateRefresh as refresh}
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
