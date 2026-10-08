import {marketDataFeedFixtureSource} from './market-data-feed-fixture.mjs';
import {payrollChanges} from '../lib/market-data/semantics.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import ts from 'typescript';import {createHash} from 'node:crypto';
import {fetchBls,fetchFred,parseBls,parseFred,numberValue,BLS_SERIES} from '../lib/market-data/providers.mjs';
const ids=Object.values(BLS_SERIES);const data=()=>({status:'REQUEST_SUCCEEDED',message:[],Results:{series:ids.map(seriesID=>({seriesID,data:[{year:'2025',period:'M01',value:'100'},{year:'2025',period:'M02',value:'101'},{year:'2025',period:'M12',value:'102'},{year:'2026',period:'M01',value:'103'},{year:'2026',period:'M02',value:'104'}]}))}});
test('single registered batch, series ID mapping and reversed response order',async()=>{let count=0;const result=await fetchBls({key:'fixture-key',now:new Date('2026-09-12'),fetchImpl:async(u,o)=>{count++;const b=JSON.parse(o.body);assert.deepEqual(b.seriesid,ids);assert.equal(b.registrationkey,'fixture-key');assert.equal(b.startyear,'2025');const p=data();p.Results.series.reverse();return Response.json(p);}});assert.equal(count,1);assert.equal(result.status,'SUCCESS');assert.equal(result.data.get(ids[0]).at(-1).value,104);});
for(const [name,response,status] of [['quota',()=>Response.json({status:'REQUEST_NOT_PROCESSED',message:['daily threshold reached']}),'QUOTA_EXCEEDED'],['http',()=>new Response('',{status:502}),'HTTP_ERROR'],['json',()=>new Response('{'),'INVALID_RESPONSE'],['failed',()=>Response.json({status:'REQUEST_NOT_PROCESSED'}),'REQUEST_FAILED'],['missing',()=>Response.json({status:'REQUEST_SUCCEEDED',Results:{series:[]}}),'MISSING_SERIES'],['bad key',()=>Response.json({status:'REQUEST_SUCCEEDED',message:['registration key invalid']}),'REQUEST_FAILED']])test(name,async()=>assert.equal((await fetchBls({fetchImpl:async()=>response()})).status,status));
test('timeout covers stalled response body',async()=>{const s=Date.now();const r=await fetchBls({timeoutMs:20,fetchImpl:async()=>new Response(new ReadableStream({start(){}}))});assert.equal(r.status,'TIMEOUT');assert.ok(Date.now()-s<500);});
test('network failure',async()=>assert.equal((await fetchBls({fetchImpl:async()=>{throw Error('secret upstream text');}})).status,'REQUEST_FAILED'));
test('M13 excluded; dates parsed; zero valid; invalid values not live',()=>{const p=data();p.Results.series[0].data.push({year:'2026',period:'M13',value:'999'});p.Results.series[0].data[4].value='0';assert.deepEqual(parseBls(p).data.get(ids[0]).at(-1),{date:'2026-02-01',value:0});for(const v of [null,'', ' ', 'NaN','Infinity','1x'])assert.equal(numberValue(v),null);assert.equal(numberValue('0'),0);p.Results.series[0].data[0].value='';assert.equal(parseBls(p).data.has(ids[0]),false);});
test('FRED skips missing holidays, retains 0; invalid dates and numbers rejected',()=>{assert.deepEqual(parseFred('observation_date,DGS10\n2026-09-01,0\n2026-09-02,.\n2026-09-03,4'),[{date:'2026-09-01',value:0},{date:'2026-09-03',value:4}]);assert.throws(()=>parseFred('DATE,x\n2026-02-30,1\n2026-03-01,2'));});
const route=marketDataFeedFixtureSource();
const compile=(source,bls,fred)=>new Function('env','fetchBls','fetchFred','payrollChanges',ts.transpile(source.replace(/^import .*;\r?\n/gm,'').replace('export async function collectMarketDataFeed','async function collectMarketDataFeed'),{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None})+';return {GET,makeYoyIndicator,makeDirectIndicator,buildSummary};')({},bls,fred,payrollChanges);
const funcs=compile(route);const points=[{date:'2025-01-01',value:100},{date:'2025-02-01',value:100},{date:'2026-01-01',value:103},{date:'2026-02-01',value:104}];
for(const label of ['Core PCE','CPI','PPI'])test(label+' raw price index becomes YoY input',()=>{const i=funcs.makeYoyIndicator(points,{});assert.ok(Math.abs(i.currentValue-4)<1e-10);assert.ok(Math.abs(i.previousValue-3)<1e-10);assert.equal(i.currentDate,'2026-02-01');});
for(const [label,v] of [['Unemployment',4.3],['10Y',4.95],['WTI',97.26]])test(label+' direct level remains formula input',()=>{const i=funcs.makeDirectIndicator([{date:'2026-01-01',value:v-1},{date:'2026-02-01',value:v}],{suffix:''});assert.equal(i.currentValue,v);assert.equal(i.previousValue,v-1);});
test('Payroll uses two consecutive monthly changes and preserves formula',()=>{const changes=payrollChanges([{date:'2026-01-01',value:159000},{date:'2026-02-01',value:159150},{date:'2026-03-01',value:159120}]);const i=funcs.makeDirectIndicator(changes,{suffix:'천 명'});assert.equal(i.currentValue,-30);assert.equal(i.previousValue,150);assert.equal(i.currentDate,'2026-03-01');assert.ok(route.includes('(payrolls.currentValue - 150) * 0.08'));});
// Canonical hash derived from 68a1ff352b02b1c1d96e604bd9bbcac09fb21eab.
// Only checkout CRLF is normalized; every other protected character is retained.
const protectedSummary = s => s.slice(s.indexOf('function buildSummary('), s.indexOf('export async function collectMarketDataFeed'));
const summaryHash = text => createHash('sha256').update(text.replaceAll('\r\n', '\n')).digest('hex');
const expectedSummaryHash = 'ac75496c6bed1cc531c1720b3ab995dac3272e0183f2c1aa76eb73e5f24bed0e';
test('buildSummary byte-exact apart from EOL and all-seven gate unchanged', () => {
  assert.equal(summaryHash(protectedSummary(route)), expectedSummaryHash);
  assert.ok(route.includes('liveCount === required.length ? buildSummary(indicators) : []'));
});
test('buildSummary hash accepts LF and Windows CRLF fixtures', () => {
  const lf = protectedSummary(route).replaceAll('\r\n', '\n');
  assert.equal(summaryHash(lf), expectedSummaryHash);
  assert.equal(summaryHash(lf.replaceAll('\n', '\r\n')), expectedSummaryHash);
});
test('buildSummary hash rejects meaningful character changes', () => {
  const text = protectedSummary(route);
  assert.ok(text.includes('function buildSummary('));
  assert.notEqual(summaryHash(text.replace('function buildSummary(', 'function buildSummarz(')), expectedSummaryHash);
});
test('buildSummary hash preserves whitespace, BOM, blank lines and lone CR', () => {
  const text = protectedSummary(route);
  for (const prefix of [' ', '\t', '\n', '\uFEFF', '\r']) {
    assert.notEqual(summaryHash(prefix + text), expectedSummaryHash);
  }
});
test('liveCount and public contract regressions with all seven and missing BLS',async()=>{const b=async()=>({...parseBls(data()),durationMs:1,requestCount:1,registered:false});const f=async()=>({data:points,status:'SUCCESS',durationMs:1});const full=await (await compile(route,b,f).GET()).json();assert.equal(full.status,'live');assert.equal(full.summary.length,5);assert.deepEqual(full.summary.map(i=>i.score),[15,37,0,0,28]);const partial=await (await compile(route,async()=>({data:new Map(),statuses:{},status:'TIMEOUT',durationMs:1,requestCount:1}),f).GET()).json();assert.equal(partial.status,'partial');assert.equal(partial.summary.length,0);assert.equal(Object.keys(partial.indicators).length,3);assert.deepEqual(Object.keys(full),['status','updatedAt','indicators','summary','sources','warnings']);});

test("fetch uses runtime global receiver",async()=>{await fetchBls({fetchImpl:async function(){assert.equal(this,globalThis);return Response.json(data());}});});
