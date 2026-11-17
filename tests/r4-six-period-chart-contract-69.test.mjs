import test from 'node:test';
import assert from 'node:assert/strict';
import {mergeCompositeObservedDisplay} from '../lib/market-score/composite-observed-display-r1.mjs';
import {appendPublishedDomainCurrent} from '../lib/market-score/published-domain-trend-r4.mjs';

const daily=[{label:'2026-11-01',value:40},{label:'2026-11-15',value:50}];
const observed=[{label:'2026-11-15T12:00:00.000Z',value:50},{label:'2026-11-15T12:05:00.000Z',value:53}];
const current={label:'2026-11-15T12:10:00.000Z',value:56,boundToPublishedCard:true};
for(const [period,days] of [['1D',1],['1W',7],['1M',30],['3M',90],['6M',180],['1Y',365]]){
 test(`#69 ${period} composite chart period and source contract`,()=>{
  const out=mergeCompositeObservedDisplay(daily,observed,days,current);
  assert.ok(out.every((p,i)=>i===0||Date.parse(out[i-1].label)<=Date.parse(p.label)));
  if(days<180){assert.equal(out.at(-1)?.value,56);assert.equal(out.at(-1)?.label,current.label);}
  else assert.deepEqual(out,daily);
 });
 test(`#69 ${period} economic domain published overlay contract`,()=>{
  const out=appendPublishedDomainCurrent(daily,current,days);
  if(days<180)assert.equal(out.at(-1)?.value,56);
  else assert.deepEqual(out,daily);
 });
}
test('#69 null is not zero; verified zero remains valid',()=>{
 const rows=[{label:'2026-11-15',value:40}];
 const zero={label:'2026-11-15T12:10:00Z',value:0};
 assert.equal(appendPublishedDomainCurrent(rows,zero,7).at(-1)?.value,0);
 assert.deepEqual(appendPublishedDomainCurrent(rows,{...zero,value:null},7),rows);
});
test('#69 composite does not mutate source arrays',()=>{
 const d=structuredClone(daily),o=structuredClone(observed);
 mergeCompositeObservedDisplay(daily,observed,7,current);
 assert.deepEqual(daily,d);assert.deepEqual(observed,o);
});
