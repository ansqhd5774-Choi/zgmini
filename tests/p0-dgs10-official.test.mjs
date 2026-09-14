import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import {fetchMarketFred} from '../lib/market-data/fred-market-provider.mjs';
import {FRED_PROFILES} from '../lib/market-data/fred-api-transport.mjs';
const key='fixture-key', now=()=>Date.parse('2026-09-13');
const rows=()=>[{date:'2026-09-08',value:'4.9'},{date:'2026-09-09',value:'.'},{date:'2026-09-10',value:'4.95'},{date:'2026-09-11',value:'.'}];
const run=observations=>fetchMarketFred('DGS10',{key,now,fetchImpl:async()=>Response.json({observations})});
test('DGS10 daily profile preserves percent and direct semantics',()=>{
 const p=FRED_PROFILES.DGS10;assert.equal(p.nativeFrequency,'DAILY');assert.equal(p.datePolicy,'ISO_CALENDAR_DATE');assert.equal(p.valueMeaning,'RAW_RATE_LEVEL');assert.equal(p.units,'Percent');assert.equal(p.seasonalAdjustment,'Not Seasonally Adjusted');assert.equal(p.consumerTransform,'DIRECT_LATEST_VALID');
});
test('latest valid actual date retained across gaps and trailing missing',async()=>{
 const r=await run(rows());assert.equal(r.status,'SUCCESS');assert.deepEqual(r.data,[{date:'2026-09-08',value:4.9},{date:'2026-09-10',value:4.95}]);
});
test('0 is valid rate',async()=>{const p=rows();p[2].value='0';const r=await run(p);assert.equal(r.status,'SUCCESS');assert.equal(r.data.at(-1).value,0);});
for(const value of ['NaN','Infinity','abc',null,''])test('invalid numeric '+value,async()=>{const p=rows();p[2].value=value;assert.equal((await run(p)).status,'INVALID_NUMERIC');});
test('actual daily calendar validity required',async()=>{const p=rows();p[0].date='2026-02-30';assert.equal((await run(p)).status,'INVALID_DATE');});
test('single official native observations call, no CSV or metadata',async()=>{
 let n=0;const r=await fetchMarketFred('DGS10',{key,now,fetchImpl:async(url,init)=>{
  n++;assert.equal(url.hostname,'api.stlouisfed.org');assert.equal(url.pathname,'/fred/series/observations');assert.equal(url.searchParams.get('series_id'),'DGS10');assert.equal(url.searchParams.get('units'),'lin');assert.equal(url.searchParams.get('file_type'),'json');assert.equal(url.searchParams.has('frequency'),false);assert.equal(url.searchParams.has('aggregation_method'),false);assert.equal(init.redirect,'manual');return Response.json({observations:rows()});
 }});assert.equal(r.status,'SUCCESS');assert.equal(n,1);
});
test('HTTP failure returns safely without CSV retry',async()=>{
 let n=0;const r=await fetchMarketFred('DGS10',{key,now,fetchImpl:async()=>{n++;return new Response(key,{status:503});}});assert.equal(n,1);assert.equal(r.status,'HTTP_ERROR');assert.deepEqual(r.data,[]);assert.ok(!JSON.stringify(r).includes(key));
});
test('existing 10Y consumer receives raw percent, no transformation',async()=>{
 const route=fs.readFileSync(new URL('../app/api/market-data/route.ts',import.meta.url),'utf8');
 const direct=new Function(ts.transpile(route.replace(/^import .*;\r?\n/gm,'').replace('export async function GET','async function GET'),{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None})+';return makeDirectIndicator;')();
 const r=await run(rows()), out=direct(r.data,{suffix:'%'});assert.equal(out.currentValue,4.95);assert.equal(out.previousValue,4.9);assert.equal(out.currentDate,'2026-09-10');assert.equal(out.previousDate,'2026-09-08');
});
