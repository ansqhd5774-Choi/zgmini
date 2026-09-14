import test from 'node:test';
import assert from 'node:assert/strict';
import {BLS_SERIES, parseBls, fetchBls} from '../lib/market-data/providers.mjs';
import {integrateProviderResults, collectProviderCandidates} from '../lib/market-data/fallback-integration.mjs';
import {fetchBlsWithFallback} from '../lib/market-data/live-fallback.mjs';

const ids=Object.values(BLS_SERIES), fetchedAt='2026-09-12T00:00:00.000Z', now=()=>Date.parse(fetchedAt);
const payload=()=>({status:'REQUEST_SUCCEEDED',message:[],Results:{series:ids.map(seriesID=>({seriesID,
  data:Array.from({length:18},(_,i)=>{const d=new Date(Date.UTC(2025,2+i,1)).toISOString();return {year:d.slice(0,4),period:'M'+d.slice(5,7),value:String(100+i)};})}))}});
const cases=[
  ['invalid year',s=>{s.data[0].year='private-year';},'INVALID_RESPONSE','SEMANTIC','BLS_ROW_INVALID_YEAR'],
  ['invalid period',s=>{s.data[0].period='private-period';},'INVALID_RESPONSE','SEMANTIC','BLS_ROW_INVALID_PERIOD'],
  ['invalid numeric',s=>{s.data[0].value='private-value';},'INVALID_RESPONSE','SEMANTIC','BLS_ROW_INVALID_VALUE'],
  ['duplicate conflict',s=>{s.data.push({...s.data[0],value:'999'});},'INVALID_RESPONSE','SEMANTIC','BLS_DUPLICATE_MONTH_CONFLICT'],
  ['data not array',s=>{s.data={private:'private-row'};},'INVALID_RESPONSE','PROVIDER','BLS_DATA_NOT_ARRAY'],
  ['empty data',s=>{s.data=[];},'MISSING_SERIES','SEMANTIC','BLS_DATA_EMPTY'],
  ['one point',s=>{s.data=s.data.slice(0,1);},'MISSING_SERIES','SEMANTIC','BLS_VALID_POINTS_INSUFFICIENT'],
];
for(const [name,mutate,status,origin,code] of cases)test(name+' preserves result/origin/decision and records detail',()=>{
  const p=payload();mutate(p.Results.series[0]);
  const oldEvidence={}, evidence={}, details={};
  const before=parseBls(p,oldEvidence),after=parseBls(p,evidence,details);
  assert.deepEqual(after,before);assert.deepEqual(evidence,oldEvidence);
  assert.equal(after.statuses[ids[0]],status);assert.equal(evidence[ids[0]].origin,origin);
  assert.equal(details[ids[0]].failureDetailCode,code);
  const old=integrateProviderResults({batch:before,fetchedAt,failureEvidence:oldEvidence});
  const current=integrateProviderResults({batch:after,fetchedAt,failureEvidence:evidence,failureDetails:details});
  for(const metric of Object.keys(old.metrics))assert.deepEqual(current.metrics[metric].candidate,old.metrics[metric].candidate);
  assert.equal(current.metrics.cpi.candidate.reason,origin==='SEMANTIC'?'PRIMARY_SEMANTIC_OR_CODE_FAILURE':'SECONDARY_NOT_VALID');
  assert.deepEqual(after.data.get(ids[1]),parseBls(payload()).data.get(ids[1]));
  assert.deepEqual(after.data.get(ids[3]),parseBls(payload()).data.get(ids[3]));
  assert.ok(!JSON.stringify(details).includes('private'));
});
test('safe row context records index/month only when parseable',()=>{
  const p=payload(),d={};p.Results.series[0].data[0].value='private';parseBls(p,{},d);
  assert.deepEqual(d[ids[0]],{failureDetailCode:'BLS_ROW_INVALID_VALUE',rowIndex:0,observationKey:'2025-03'});
  p.Results.series[0].data[0].year='private';const bad={};parseBls(p,{},bad);
  assert.equal(bad[ids[0]].observationKey,undefined);
});
test('first failure detail is deterministic',()=>{
  const p=payload(),d={};p.Results.series[0].data[0].year='invalid';p.Results.series[0].data[1].value='invalid';parseBls(p,{},d);
  assert.equal(d[ids[0]].failureDetailCode,'BLS_ROW_INVALID_YEAR');assert.equal(d[ids[0]].rowIndex,0);
});
for(const [name,mutate,code,status] of [
  ['missing',p=>p.Results.series.shift(),'BLS_SERIES_MISSING','MISSING_SERIES'],
  ['duplicate',p=>p.Results.series.push(p.Results.series[0]),'BLS_SERIES_DUPLICATE','INVALID_RESPONSE'],
])test(name+' series retains provider evidence',()=>{
  const p=payload(),d={},e={};mutate(p);const result=parseBls(p,e,d);
  assert.equal(result.statuses[ids[0]],status);assert.deepEqual(e[ids[0]],{status,origin:'PROVIDER'});assert.equal(d[ids[0]].failureDetailCode,code);
});
test('success, zero, M13 and equal duplicates have no failure details',()=>{
  const p=payload(),d={};p.Results.series[0].data[0].value='0';p.Results.series[0].data.push({...p.Results.series[0].data[0]},{year:'2026',period:'M13',value:'private'});
  assert.equal(parseBls(p,{},d).status,'SUCCESS');assert.deepEqual(d,{});
});
for(const [name,p,code,status] of [
  ['envelope',{},'BLS_ENVELOPE_INVALID','REQUEST_FAILED'],
  ['results',{status:'REQUEST_SUCCEEDED'},'BLS_RESULTS_SERIES_INVALID','INVALID_RESPONSE'],
  ['quota',{status:'REQUEST_SUCCEEDED',message:['quota private']},'BLS_MESSAGE_QUOTA','QUOTA_EXCEEDED'],
  ['key',{status:'REQUEST_SUCCEEDED',message:['registration key private']},'BLS_MESSAGE_REGISTRATION','REQUEST_FAILED'],
  ['series',{status:'REQUEST_SUCCEEDED',message:['invalid series private']},'BLS_MESSAGE_INVALID_SERIES','REQUEST_FAILED'],
  ['temporary',{status:'REQUEST_SUCCEEDED',message:['temporary failure private']},'BLS_MESSAGE_TEMPORARY_FAILURE','REQUEST_FAILED'],
])test(name+' batch safe code, original status/origin',()=>{
  const d={},e={};assert.throws(()=>parseBls(p,e,d),err=>err.status===status);
  for(const id of ids){assert.equal(d[id].failureDetailCode,code);assert.deepEqual(e[id],{status,origin:'PROVIDER'});}
  assert.ok(!JSON.stringify(d).includes('private'));
});
test('unrecognized message remains ignored and is never copied',()=>{
  const p=payload(),d={};p.message=['https://private.invalid/?api_key=private'];
  assert.equal(parseBls(p,{},d).status,'SUCCESS');assert.deepEqual(d,{});
});
test('parser exception remains unknown origin; safe code without error/body',async()=>{
  const p=payload();p.Results.series[0].data=[null];const d={},e={};
  const result=await fetchBls({now:new Date(fetchedAt),failureDetails:d,failureEvidence:e,fetchImpl:async()=>Response.json(p)});
  assert.equal(result.status,'INVALID_RESPONSE');assert.deepEqual(e,{});
  for(const id of ids)assert.equal(d[id].failureDetailCode,'BLS_PARSER_EXCEPTION');
  assert.ok(!JSON.stringify(d).includes('TypeError'));assert.ok(!JSON.stringify(result).includes('failureDetailCode'));
});
test('invalid JSON is distinguished without changing unknown-origin policy',async()=>{
  const d={},e={};const r=await fetchBls({failureDetails:d,failureEvidence:e,fetchImpl:async()=>new Response('private secret broken JSON')});
  assert.equal(r.status,'INVALID_RESPONSE');assert.deepEqual(e,{});assert.equal(d[ids[0]].failureDetailCode,'BLS_JSON_PARSE_ERROR');
  assert.ok(!JSON.stringify(d).includes('private'));
});
test('unexpected thrown parser error content never enters diagnostics',()=>{
  const d={};const p={get message(){throw Error('https://private.invalid/?api_key=private');}};
  assert.throws(()=>parseBls(p,{},d));assert.ok(!JSON.stringify(d).includes('private'));
  assert.equal(d[ids[0]].failureDetailCode,'BLS_PARSER_EXCEPTION');
});
test('live log has safe detail/reason; no secondary or public provider shape change',async()=>{
  const p=payload();p.Results.series[0].data[0].value='https://private.invalid/?api_key=private';p.Results.series[2].data[0].period='private';
  const logs=[],original=console.info;let calls=0;
  console.info=(tag,json)=>logs.push({tag,payload:JSON.parse(json)});
  try{
    const result=await fetchBlsWithFallback({key:'private-key',fredKey:'private-key',now,fetchImpl:async()=>{calls++;return Response.json(p);}});
    assert.equal(calls,1);assert.deepEqual(result.data,parseBls(p).data);assert.deepEqual(result.statuses,parseBls(p).statuses);
    assert.deepEqual(Object.keys(result).sort(),['data','statuses','status','durationMs','requestCount','registered'].sort());
  }finally{console.info=original;}
  const log=logs[0].payload;assert.equal(log.fallbackFredRequests,0);
  for(const metric of ['cpi','unemployment']){const m=log.metrics.find(x=>x.metric===metric);assert.equal(m.failureOrigin,'SEMANTIC');assert.equal(m.fallbackEligibilityReason,'PRIMARY_SEMANTIC_OR_CODE_FAILURE');assert.equal(m.fallbackAttempted,false);assert.equal(m.selectedProvider,null);}
  for(const metric of ['ppi','payroll']){const m=log.metrics.find(x=>x.metric===metric);assert.equal(m.failureDetailCode,null);assert.equal(m.selectedProvider,'BLS');}
  for(const forbidden of ['private','https://','api_key','registrationkey','headers','stack','raw'])assert.ok(!JSON.stringify(log).includes(forbidden));
});
test('JSON exception still reaches same blocked eligibility, no fallback',async()=>{
  let calls=0;const result=await collectProviderCandidates({now,fredKey:'fixture-key',inspectSecondary:true,fetchImpl:async()=>{calls++;return new Response('broken');}});
  assert.equal(calls,1);for(const m of Object.values(result.metrics)){assert.equal(m.candidate.reason,'PRIMARY_FAILURE_NOT_ELIGIBLE');assert.equal(m.observability.failureOrigin,'UNKNOWN');assert.equal(m.observability.failureDetailCode,'BLS_JSON_PARSE_ERROR');}
});
