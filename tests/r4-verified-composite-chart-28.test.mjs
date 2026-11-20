import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {splitVerifiedCompositeChart} from '../lib/market-score/verified-composite-chart-r4.mjs';
const old={label:'2026-11-20T10:00:00.000Z',value:40};
const now={label:'2026-11-20T10:10:00.000Z',value:50};
const current={updatedAt:now.label,displayScore:50,modelVersion:'CM-R2'};
test('W06 #28 unversioned archive never shares a connected series with verified current',()=>{
 const result=splitVerifiedCompositeChart([old,now],current);
 assert.deepEqual(result.map(x=>x.legacyCalculatedValue),[40,null]);
 assert.deepEqual(result.map(x=>x.verifiedCalculatedValue),[null,50]);
 assert.deepEqual(result.map(x=>x.verifiedModelVersion),[null,'CM-R2']);
});
test('W06 #28 unknown history and current without a valid version stay unidentified',()=>{
 for(const modelVersion of [null,'', 'CM-R1-CANDIDATE']){
  const result=splitVerifiedCompositeChart([old,now],{...current,modelVersion});
  assert.deepEqual(result.map(x=>x.verifiedCalculatedValue),[null,null]);
 }
});
test('W06 #28 daily reconstruction, zero, and original input remain intact',()=>{
 const input=[{label:'2026-11-19',value:47},{label:now.label,value:0}];
 const original=structuredClone(input);
 const result=splitVerifiedCompositeChart(input,{...current,displayScore:0});
 assert.deepEqual(result.map(x=>x.reconstructedValue),[47,null]);
 assert.deepEqual(result.map(x=>x.verifiedCalculatedValue),[null,0]);
 assert.deepEqual(input,original);
});
test('W06 #28 source rendering never draws an unidentified calculation stroke',()=>{
 const chart=readFileSync(new URL('../components/dashboard-summary-chart.tsx',import.meta.url),'utf8');
 const page=readFileSync(new URL('../app/dashboard-ui.tsx',import.meta.url),'utf8');
 assert.match(chart,/dataKey="legacyCalculatedValue"[^>]*stroke="none"/);
 assert.match(chart,/dataKey="verifiedCalculatedValue"[^>]*stroke="none"/);
 assert.doesNotMatch(chart,/dataKey="value" stroke=/);
 assert.match(page,/currentPublished=\{overallScore!==null/);
});
