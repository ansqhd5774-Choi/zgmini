import {buildCmR1DomainResults} from '../lib/market-score/domain-adapter-r1.mjs';
import {buildCompositeMarketScore} from '../lib/market-score/composite-model-r1.mjs';
import {selectStoredEarningsProjection} from '../worker/projection-source-r52.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const module={exports:{}};
new Function('exports',ts.transpileModule(fs.readFileSync('worker/projection-builders/earningsRecession.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(module.exports);
const build=module.exports.buildProjection;
const basis='CURRENT_VINTAGE_SOURCE_PERIOD_END';
const base={status:'READY',methodologyVersion:'E1-R5',score:73.5,asOfDate:'2026-10-17',missing:[],indicators:Array.from({length:13},(_,i)=>({id:'S'+(i+1),status:'READY',score:50,value:i+1,unit:'%'}))};
const snapshot={body:{asOfDate:'2026-10-17',diagnostics8:{earningsRecessionDefense:{status:'READY',score:84.7}}}};
const run=e1=>build({snapshot,e1,nowIso:'2026-10-19T00:00:00Z'}).storedE1.indicators;
test('only S6/S11 verified current-vintage source-period metadata passes; no raw private files exposed',()=>{
 const history=[{date:'2025-12-31',value:4},{date:'2026-03-31',value:5},{date:'2026-06-30',value:6}];
 const indicators=base.indicators.map(x=>x.id==='S6'?{...x,historyKind:basis,sourcePeriodEnd:'2026-06-30',previousValue:5,previousPeriodEnd:'2026-03-31',sourceHistory1Y:history,privateFiling:'SECRET'}:x);
 const projected=run({...base,indicators});
 assert.equal(projected[5].previousValue,5);
 assert.deepEqual(projected[5].sourceHistory1Y,history);
 assert.equal(projected[5].privateFiling,undefined);
 assert.equal(projected[4].previousValue,undefined);
});
test('arbitrary evaluation-anchor series, inconsistent current, and synthetic next release are suppressed',()=>{
 const wrong=[{date:'2026-03-05',value:4},{date:'2026-10-17',value:6}];
 const e1={...base,indicators:base.indicators.map(x=>x.id==='S6'?{...x,historyKind:basis,sourcePeriodEnd:'2026-10-17',previousValue:4,previousPeriodEnd:'2026-03-05',sourceHistory1Y:wrong,nextReleaseDate:'2026-11-25'}:x)};
 const rows=run(e1);
 assert.equal(rows[5].sourceHistory1Y,undefined);
 assert.equal(rows[5].nextReleaseDate,undefined);
});

test('source-specific official S6/S11 dates appear only before scheduled release, without assigning the PPI date to S10',()=>{
 const e1={...base,indicators:base.indicators.map(x=>({
  ...x,source:x.id==='S6'?'BEA NIPA A051RC':x.id==='S11'?'BLS PRS85006111':'BLS Satellite Input + PPI Net Output',
 }))};
 const early=build({snapshot,e1,nowIso:'2026-10-19T00:00:00Z'}).storedE1.indicators;
 assert.equal(early[5].nextReleaseDate,'2026-11-25');
 assert.equal(early[10].nextReleaseDate,'2026-11-05');
 assert.equal(early[9].nextReleaseDate,undefined);
 assert.equal(early[5].releaseBasis,'OFFICIAL_SOURCE_SPECIFIC_SCHEDULE');
 const expired=build({snapshot,e1,nowIso:'2026-11-26T00:00:00Z'}).storedE1.indicators;
 assert.equal(expired[5].nextReleaseDate,undefined);
 assert.equal(expired[10].nextReleaseDate,undefined);
 const wrongSource=build({snapshot,e1:{...base,indicators:base.indicators.map(x=>({...x,source:'UNVERIFIED'}))},nowIso:'2026-10-19T00:00:00Z'}).storedE1.indicators;
 assert.equal(wrongSource[5].nextReleaseDate,undefined);
});

test('real CM-R1 storage projection retains S6 quarterly provenance despite domain asOfDate omission',()=>{
 const quarterly=[{date:'2025-12-31',value:4},{date:'2026-03-31',value:5},{date:'2026-06-30',value:6}];
 const producer={...base,quality:{universeCount:500},indicators:base.indicators.map(x=>x.id==='S6'
   ? {...x,value:6,asOfDate:'2026-10-17',source:'BEA NIPA A051RC',historyKind:basis,sourcePeriodEnd:'2026-06-30',previousValue:5,previousPeriodEnd:'2026-03-31',sourceHistory1Y:quarterly}
   : {...x,asOfDate:'2026-10-17'})};
 const domains=buildCompositeMarketScore(buildCmR1DomainResults({publicDomains:{earnings:producer}})).domains;
 const earn=domains.find(x=>x.id==='earnings');
 assert.equal(earn.asOfDate,undefined,'real CM-R1 earnings domain does not expose parent evaluation anchor');
 const stored=selectStoredEarningsProjection({body:{domains}});
 assert.ok(stored);
 const display=build({snapshot,e1:stored,nowIso:'2026-10-19T00:00:00Z'}).storedE1.indicators;
 assert.equal(display[5].previousValue,5);
 assert.equal(display[5].sourceHistory1Y.length,3);
 assert.equal(display[5].sourcePeriodEnd,'2026-06-30');
 assert.equal(display[5].nextReleaseDate,'2026-11-25');
 assert.equal(display[4].sourceHistory1Y,undefined);
});
