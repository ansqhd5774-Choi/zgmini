import test from 'node:test';import assert from 'node:assert/strict';
import {runTenR88Lanes,verifyTenR88Public} from '../scripts/pc-writer/theme-ten-r88-auto.mjs';
import {fixture} from './theme-nine-r88-provisional.test.mjs';
test('one optional lane failure does not prevent other themes from publishing',async()=>{
 const seen=[];
 const results=await runTenR88Lanes({steps:[['DC',async()=>{seen.push('DC');throw Object.assign(new Error('SOURCE_WAIT'),{code:'SOURCE_WAIT'});}],
  ['CORE',async()=>{seen.push('CORE');return {status:'WRITTEN',d1Writes:1};}],
  ['SPACE',async()=>{seen.push('SPACE');return {status:'UNCHANGED',d1Writes:0};}]]});
 assert.deepEqual(seen,['DC','CORE','SPACE']);assert.equal(results[0].status,'BLOCKED');assert.equal(results[1].d1Writes,1);assert.equal(results[2].status,'UNCHANGED');
});
test('ten-theme completion requires every actual confirmed date and provisional point',()=>{
 const {base}=fixture();base.r32ProvisionalStatus='READY';
 const dates={confirmedDate:'2026-10-28',provisionalDate:'2026-10-29'};
 assert.equal(verifyTenR88Public(base,dates),true);
 const lagged=structuredClone(base);lagged.themes[9].history.at(-1).date='2026-10-23';assert.equal(verifyTenR88Public(lagged,dates),false);
 const absent=structuredClone(base);delete absent.provisional.points[0].scores['데이터센터·전력'];assert.equal(verifyTenR88Public(absent,dates),false);
 const legacy=structuredClone(base);legacy.r32ProvisionalStatus='PENDING';assert.equal(verifyTenR88Public(legacy,dates),false);
});
