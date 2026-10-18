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
