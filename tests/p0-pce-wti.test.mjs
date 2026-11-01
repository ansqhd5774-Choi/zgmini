import {marketDataFeedFixtureSource} from './market-data-feed-fixture.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import {fetchMarketFred} from '../lib/market-data/fred-market-provider.mjs';
import {FRED_PROFILES, observationsUrl, parseObservations} from '../lib/market-data/fred-api-transport.mjs';
import {payrollChanges} from '../lib/market-data/semantics.mjs';
const now=()=>Date.parse('2026-09-13T00:00:00Z'), key='fixture-private-key';
const monthly=()=>Array.from({length:18},(_,i)=>({date:new Date(Date.UTC(2025,2+i,1)).toISOString().slice(0,10),value:String(100+i)}));
const daily=()=>[{date:'2026-09-09',value:'70'},{date:'2026-09-10',value:'.'},{date:'2026-09-11',value:'71'},{date:'2026-09-12',value:'.'}];
const run=(id,observations,extra={})=>fetchMarketFred(id,{key,now,fetchImpl:async()=>Response.json({observations}),...extra});
const route=marketDataFeedFixtureSource();
const funcs=new Function('env','fetchBls','fetchFred','payrollChanges',ts.transpile(route.replace(/^import .*;\r?\n/gm,'').replace('export async function collectMarketDataFeed','async function collectMarketDataFeed'),{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None})+';return {makeYoyIndicator,makeDirectIndicator};')({},null,null,payrollChanges);

for(const id of ['PCEPILFE','DCOILWTICO'])test(id+' official native raw URL; one observations request',async()=>{
 let calls=0;const r=await run(id,id==='PCEPILFE'?monthly():daily(),{fetchImpl:async(url,init)=>{
  calls++;assert.equal(url.hostname,'api.stlouisfed.org');assert.equal(url.pathname,'/fred/series/observations');
  const q=url.searchParams;assert.equal(q.get('series_id'),id);assert.equal(q.get('units'),'lin');assert.equal(q.get('file_type'),'json');
  assert.equal(q.get('sort_order'),'asc');assert.equal(q.get('frequency'),null);assert.equal(q.get('aggregation_method'),null);
  assert.equal(q.get('observation_start'),'2025-03-01');assert.equal(q.get('observation_end'),'2026-09-13');
  assert.equal(q.get('limit'),id==='PCEPILFE'?'100':'1000');assert.equal(init.headers.accept,'application/json');assert.equal(init.redirect,'manual');
  return Response.json({observations:id==='PCEPILFE'?monthly():daily()});
 }});assert.equal(r.status,'SUCCESS');assert.equal(calls,1);
});
test('PCE raw levels preserved; existing calendar YoY exactly once',async()=>{
 const p=monthly(),r=await run('PCEPILFE',p);assert.equal(r.status,'SUCCESS');
 assert.deepEqual(r.data,p.map(p=>({date:p.date,value:Number(p.value)})));
 const out=funcs.makeYoyIndicator(r.data,{});assert.equal(out.currentValue,(117/105-1)*100);assert.equal(out.previousValue,(116/104-1)*100);
 assert.equal(out.currentDate,'2026-08-01');assert.equal(out.previousDate,'2026-07-01');
});
test('PCE unrelated and trailing missing tolerated',async()=>{
 const p=monthly();p[0].value='.';p.push({date:'2026-09-01',value:'.'});
 const r=await run('PCEPILFE',p);assert.equal(r.status,'SUCCESS');assert.equal(r.data.at(-1).date,'2026-08-01');
});
for(const index of [16,5,4])test('PCE required month '+index+' missing rejects rather than stale YoY',async()=>{
 const p=monthly();p[index].value='.';assert.equal((await run('PCEPILFE',p)).status,'MISSING_OBSERVATION');
});
test('PCE zero level valid; zero denominator fails explicitly',async()=>{
 const p=monthly();p.at(-1).value='0';const r=await run('PCEPILFE',p);assert.equal(r.status,'SUCCESS');assert.equal(r.data.at(-1).value,0);
 assert.equal(funcs.makeYoyIndicator(r.data,{}).currentValue,-100);p[5].value='0';assert.equal((await run('PCEPILFE',p)).status,'ZERO_YOY_DENOMINATOR');
});
test('WTI daily latest valid date, weekend/dot skips, no monthly coercion',async()=>{
 const r=await run('DCOILWTICO',daily());assert.equal(r.status,'SUCCESS');
 assert.deepEqual(r.data,[{date:'2026-09-09',value:70},{date:'2026-09-11',value:71}]);
 const out=funcs.makeDirectIndicator(r.data,{suffix:''});assert.equal(out.currentValue,71);assert.equal(out.currentDate,'2026-09-11');assert.equal(out.previousDate,'2026-09-09');
});
test('WTI zero remains numeric',async()=>{const p=daily();p[2].value='0';const r=await run('DCOILWTICO',p);assert.equal(r.status,'SUCCESS');assert.equal(r.data.at(-1).value,0);});
for(const value of ['NaN','Infinity','abc','',null])test('WTI invalid value '+value,async()=>{const p=daily();p[2].value=value;assert.equal((await run('DCOILWTICO',p)).status,'INVALID_NUMERIC');});
test('invalid calendar date rejected for daily too',async()=>{assert.equal((await run('DCOILWTICO',[{date:'2026-02-30',value:'1'},{date:'2026-03-02',value:'2'}])).status,'INVALID_DATE');});
for(const id of ['CPIAUCNS','PPIFIS','UNRATE','PAYEMS','PCEPILFE'])test(id+' monthly policy remains strict',()=>{
 assert.equal(FRED_PROFILES[id].datePolicy,'MONTH_START');assert.throws(()=>parseObservations({observations:daily()},id),/INVALID_DATE/);
});
test('allowlist rejects unknown/prototype names',()=>{
 for(const id of ['OTHER','toString','__proto__'])assert.throws(()=>observationsUrl(id,key),/INVALID_SERIES/);
});
test('daily duplicate conflict and pagination rejected',()=>{
 const p=daily();p.push({date:'2026-09-11',value:'2'});assert.throws(()=>parseObservations({observations:p},'DCOILWTICO'),/DUPLICATE_CONFLICT/);
 assert.throws(()=>parseObservations({observations:daily(),count:1001},'DCOILWTICO'),/INCOMPLETE_RESPONSE/);
});
test('WTI 18-month daily history fits single response, not monthly limit 100',async()=>{
 const p=Array.from({length:540},(_,i)=>({date:new Date(Date.UTC(2025,2,1+i)).toISOString().slice(0,10),value:'70'}));
 const r=await run('DCOILWTICO',p);assert.equal(r.status,'SUCCESS');assert.equal(r.data.length,540);
});
for(const [label,fetchImpl,status] of [
 ['HTTP',async()=>new Response(key,{status:403}),'HTTP_ERROR'],
 ['JSON',async()=>new Response(key),'INVALID_JSON'],
 ['API envelope',async()=>Response.json({error_code:400,error_message:key}),'INVALID_RESPONSE'],
 ['timeout',async()=>new Promise(()=>{}),'TIMEOUT'],
 ['network',async()=>{throw Error(key);},'REQUEST_FAILED'],
])test(label+' safe failure, no CSV retry',async()=>{
 let n=0;const r=await fetchMarketFred('DCOILWTICO',{key,now,timeoutMs:10,fetchImpl:async(...args)=>{n++;return fetchImpl(...args);}});
 assert.equal(r.status,status);assert.equal(n,1);assert.equal(r.data.length,0);assert.ok(!JSON.stringify(r).includes(key));
});
test('missing key blocks before transport',async()=>{const r=await fetchMarketFred('PCEPILFE',{fetchImpl:()=>assert.fail('no request')});assert.equal(r.status,'KEY_MISSING');});
test('DGS10 official API activation replaces prior CSV routing',async()=>{
 let n=0;const r=await fetchMarketFred('DGS10',{key,fetchImpl:async(url,init)=>{n++;assert.equal(url.hostname,'api.stlouisfed.org');assert.equal(url.pathname,'/fred/series/observations');assert.equal(url.searchParams.get('series_id'),'DGS10');assert.equal(url.searchParams.get('api_key'),key);assert.equal(init.headers.accept,'application/json');return Response.json({observations:[{date:'2026-09-09',value:'4.6'},{date:'2026-09-10',value:'4.7'}]});}});
 assert.equal(n,1);assert.equal(r.status,'SUCCESS');assert.equal(r.data.at(-1).value,4.7);
});
test('route passes key to official provider; all-seven gate untouched',()=>{
 assert.ok(route.includes('fetchMarketFred as fetchFred'));assert.ok(route.includes('fetchFred(id, { key: bindings.FRED_API_KEY?.trim() })'));
 assert.ok(route.includes('liveCount === required.length ? buildSummary(indicators) : []'));
});
