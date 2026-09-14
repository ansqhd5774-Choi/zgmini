import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import {fetchBlsWithFallback} from '../lib/market-data/live-fallback.mjs';
import {parseBls,BLS_SERIES} from '../lib/market-data/providers.mjs';
import {payrollChanges} from '../lib/market-data/semantics.mjs';
const now=()=>Date.parse('2026-09-12T00:00:00Z');
const mapping={CUUR0000SA0:'CPIAUCNS',WPSFD4:'PPIFIS',LNS14000000:'UNRATE',CES0000000001:'PAYEMS'};
const rows=()=>Array.from({length:18},(_,i)=>({date:new Date(Date.UTC(2025,2+i,1)).toISOString().slice(0,10),value:100+i}));
const payload=()=>({status:'REQUEST_SUCCEEDED',Results:{series:Object.keys(mapping).map(seriesID=>({seriesID,data:rows().map(p=>({year:p.date.slice(0,4),period:'M'+p.date.slice(5,7),value:String(p.value)}))}))}});
async function run(missing=[],options={}){
 const calls=[];const p=payload();p.Results.series=p.Results.series.filter(s=>!missing.includes(s.seriesID));
 if(options.mutate)options.mutate(p);
 const result=await fetchBlsWithFallback({key:'fixture-key',fredKey:options.noKey?'':'fixture-key',now,fetchImpl:async(url,init)=>{
  if(String(url).includes('api.bls.gov')) {calls.push('BLS');assert.equal(init.method,'POST');assert.deepEqual(JSON.parse(init.body).seriesid,Object.keys(mapping));return Response.json(p);}
  const u=new URL(url);calls.push(u.searchParams.get('series_id'));
  return options.failSecondary?new Response('',{status:520}):Response.json({observations:rows().map(p=>({...p,value:String(p.value)}))});
 }});
 return {result,calls,p};
}
test('four BLS successes remain identical, zero secondary',async()=>{
 const {result,calls,p}=await run();assert.deepEqual(calls,['BLS']);const original=parseBls(p);
 assert.deepEqual(result.data,original.data);assert.deepEqual(result.statuses,original.statuses);assert.equal(result.status,'SUCCESS');
});
for(const id of Object.keys(mapping))test(id+' lazy secondary only',async()=>{
 const {result,calls}=await run([id]);assert.deepEqual(calls,['BLS',mapping[id]]);
 assert.equal(result.statuses[id],'SUCCESS');assert.deepEqual(result.data.get(id),rows());
});
test('two failures cause exactly two secondary requests',async()=>{
 const {calls}=await run(['CUUR0000SA0','CES0000000001']);assert.deepEqual(calls,['BLS','CPIAUCNS','PAYEMS']);
});
test('semantic history gap blocks adoption and secondary request',async()=>{
 const {calls,result}=await run([],{mutate:p=>{p.Results.series[0].data.splice(15,1);}});
 assert.deepEqual(calls,['BLS']);assert.equal(result.data.has('CUUR0000SA0'),false);
});
test('secondary HTTP failure leaves metric unavailable',async()=>{
 const {result,calls}=await run(['LNS14000000'],{failSecondary:true});assert.deepEqual(calls,['BLS','UNRATE']);assert.equal(result.data.has('LNS14000000'),false);
});
test('zero primary preserved',async()=>{
 const {result,calls}=await run([],{mutate:p=>{p.Results.series.find(s=>s.seriesID==='LNS14000000').data.at(-1).value='0';}});
 assert.deepEqual(calls,['BLS']);assert.equal(result.data.get('LNS14000000').at(-1).value,0);
});
test('missing key does not attempt unauthenticated secondary',async()=>{
 const {calls}=await run(['CUUR0000SA0'],{noKey:true});assert.deepEqual(calls,['BLS']);
});
const route=fs.readFileSync(new URL('../app/api/market-data/route.ts',import.meta.url),'utf8');
const compile=bls=>new Function('env','fetchBls','fetchFred','payrollChanges',ts.transpile(route.replace(/^import .*;\r?\n/gm,'').replace('export async function GET','async function GET'),{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None})+';return GET;')({},async()=>bls,async()=>({data:rows(),status:'SUCCESS',durationMs:0}),payrollChanges);
test('live entry wired; unchanged public shape and seven-input summary with secondary',async()=>{
 assert.ok(route.includes('fetchBlsWithFallback as fetchBls'));assert.ok(route.includes('fredKey: bindings.FRED_API_KEY?.trim()'));
 const {result}=await run(Object.keys(mapping));const output=await(await compile(result)()).json();
 assert.equal(output.status,'live');assert.equal(Object.keys(output.indicators).length,7);assert.equal(output.summary.length,5);
 assert.deepEqual(Object.keys(output),['status','updatedAt','indicators','summary','sources','warnings']);
 for(const i of Object.values(output.indicators))for(const key of ['fallbackUsed','fallbackReason','provider','sourceSeries'])assert.equal(Object.hasOwn(i,key),false);
 assert.ok(route.includes('liveCount === required.length ? buildSummary(indicators) : []'));
});
