import test from 'node:test';
import assert from 'node:assert/strict';
import {parseBls,BLS_SERIES} from '../lib/market-data/providers.mjs';
import {integrateProviderResults} from '../lib/market-data/fallback-integration.mjs';
const payload=(endMonth=9)=>({status:'REQUEST_SUCCEEDED',Results:{series:Object.values(BLS_SERIES).map(seriesID=>({seriesID,data:Array.from({length:12+endMonth},(_,i)=>({year:String(2025+Math.floor(i/12)),period:'M'+String(i%12+1).padStart(2,'0'),value:String(100+i),footnotes:[]})).map(r=>['CUUR0000SA0','LNS14000000'].includes(seriesID)&&r.year==='2025'&&r.period==='M10'?{...r,value:'-',footnotes:[{code:'X',text:'Data unavailable due to the 2025 lapse in appropriations'}]}:r)}))}});
test('official unpublished month is retained as a gap, while valid current observations remain usable',()=>{
 const batch=parseBls(payload());assert.equal(batch.status,'SUCCESS');assert.equal(batch.missingObservations.length,2);
 assert.equal(batch.data.get('CUUR0000SA0').some(r=>r.date==='2025-10-01'),false);
 const result=integrateProviderResults({batch,fetchedAt:'2026-10-26T00:00:00Z'});
 for(const metric of ['cpi','ppi','unemployment','payroll'])assert.equal(result.metrics[metric].candidate.decision,'USE_PRIMARY',metric);
});
test('missing required year-ago observation still blocks the calculation and cannot trigger substitution',()=>{
 const result=integrateProviderResults({batch:parseBls(payload(10)),fetchedAt:'2026-11-26T00:00:00Z'});
 assert.equal(result.metrics.cpi.candidate.decision,'BLOCKED');assert.equal(result.metrics.cpi.candidate.reason,'PRIMARY_SEMANTIC_OR_CODE_FAILURE');
});
test('unexplained placeholder or invalid numeric remains a series error',()=>{
 const p=payload();p.Results.series[0].data.find(r=>r.period==='M10').footnotes=[];
 assert.equal(parseBls(p).statuses.CUUR0000SA0,'INVALID_RESPONSE');
 const q=payload();q.Results.series[0].data.at(-1).value='broken';assert.equal(parseBls(q).statuses.CUUR0000SA0,'INVALID_RESPONSE');
});
