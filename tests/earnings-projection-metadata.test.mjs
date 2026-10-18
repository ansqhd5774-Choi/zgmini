import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import {buildCmR1DomainResults} from '../lib/market-score/domain-adapter-r1.mjs';
import {selectStoredEarningsProjection} from '../worker/projection-source-r52.mjs';
const module={exports:{}};
new Function('exports',ts.transpileModule(fs.readFileSync('worker/projection-builders/earningsRecession.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(module.exports);
const project=module.exports.buildProjection;
const fixture={status:'READY',score:73.51207667731629,methodologyVersion:'E1-R5',asOfDate:'2026-10-17',quality:{universeCount:500,privateRaw:'DO_NOT_PUBLISH'},missing:[],indicators:Array.from({length:13},(_,i)=>({id:'S'+(i+1),status:'READY',score:50})),trend:[{label:'2026-10-16',value:73.51207667731629},{label:'2026-10-17',value:73.51207667731629}]};
function run(input){const domain=buildCmR1DomainResults({publicDomains:{earnings:input}}).find(x=>x.id==='earnings'),snapshot={body:{asOfDate:'2026-10-18',domains:[domain],diagnostics8:{earningsRecessionDefense:{status:'READY',score:84.6875}}}};return {domain,result:project({snapshot,e1:selectStoredEarningsProjection(snapshot),nowIso:'2026-10-19T00:00:00Z'})};}
test('metadata survives public domain to detail without conflating universe and issuer counts',()=>{
 const {domain,result}=run(fixture);
 assert.equal(domain.universeCount,500);assert.equal(domain.issuerCount,null);assert.equal(domain.quality,undefined);
 assert.equal(result.storedE1.universeCount,500);assert.equal(result.storedE1.issuerCount,null);assert.equal(result.storedE1.financialPeriodEnd,null);
 assert.equal(result.score,84.6875);assert.equal(result.storedE1.score,fixture.score);assert.deepEqual(result.storedE1.trend,fixture.trend);assert.equal(result.storedE1.indicators.length,13);
});
test('explicit financial period and zero issuer count are preserved',()=>{
 const {result}=run({...fixture,financialPeriodEnd:'2026-06-30',quality:{universeCount:500,issuerCount:0}});
 assert.equal(result.storedE1.financialPeriodEnd,'2026-06-30');assert.equal(result.storedE1.issuerCount,0);
});
