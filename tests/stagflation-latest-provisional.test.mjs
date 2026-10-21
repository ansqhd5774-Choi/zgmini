import test from 'node:test';import assert from 'node:assert/strict';
import {calculateStagflationS21,STAGFLATION_S21_SERIES as ids} from '../lib/diagnostic-layer/stagflation-s21.mjs';
import {calculateLatestStagflation as latest} from '../lib/diagnostic-layer/stagflation-latest-provisional.mjs';
const date=i=>new Date(Date.UTC(2009,0+i,1)).toISOString().slice(0,10);
function fixture(){return Object.fromEntries(ids.map((id,j)=>[id,Array.from({length:213},(_,i)=>({observationDate:date(i),value:id==='EXPINF5YR'?2.5+Math.sin(i/5)*.3:100*Math.exp(i*.002)*(1+.01*Math.sin(i/(3+j)))}))]));}
test('aligned inputs exactly reproduce the approved S2.1 calculation',()=>{
 const series=fixture(),confirmed=calculateStagflationS21({series}),out=latest({series,asOfDate:'2026-09-21'});
 assert.equal(confirmed.status,'READY');assert.equal(out.status,'READY');assert.ok(Math.abs(confirmed.score-out.score)<1e-10);
});
test('newer observations remain explicitly dated without changing source data or inventing history',()=>{
 const series=fixture();series.INDPRO.push({observationDate:'2026-10-01',value:155});
 const original=structuredClone(series);const out=latest({series,asOfDate:'2026-10-21'});
 assert.equal(out.status,'READY');assert.equal(out.phase,'PROVISIONAL');assert.equal(out.inputMonths.INDPRO,'2026-10-01');assert.equal(out.inputMonths.PCEPI,'2026-09-01');assert.deepEqual(series,original);assert.equal('history' in out,false);
});
test('missing, duplicate, future, stale or insufficient reference inputs never create a score',()=>{
 const cases=[s=>delete s.PCEPI,s=>s.PAYEMS.push({...s.PAYEMS.at(-1)}),s=>s.PCEPI.push({observationDate:'2026-11-01',value:200}),s=>s.INDPRO.splice(-5),s=>s.DSPIC96.splice(0,150),s=>s.PCEPILFE.at(-1).value=null];
 for(const mutate of cases){const series=fixture();mutate(series);const out=latest({series,asOfDate:'2026-10-21'});assert.equal(out.status,'PARTIAL');assert.equal(out.score,null);}
});
