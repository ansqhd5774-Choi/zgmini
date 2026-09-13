import test from 'node:test';
import assert from 'node:assert/strict';
import {BLS_SERIES, parseBls} from '../lib/market-data/providers.mjs';
import {fetchApiShadowSeries} from '../lib/market-data/fred-api-shadow.mjs';
import {collectProviderCandidates, integrateProviderResults, FALLBACK_PRODUCTION_ENABLED} from '../lib/market-data/fallback-integration.mjs';
const fetchedAt='2026-09-12T00:00:00.000Z', now=()=>Date.parse(fetchedAt);
const rows=()=>Array.from({length:18},(_,i)=>({date:new Date(Date.UTC(2025,2+i,1)).toISOString().slice(0,10),value:String(100+i)}));
const payload=()=>({status:'REQUEST_SUCCEEDED',message:[],Results:{series:Object.values(BLS_SERIES).map(seriesID=>({seriesID,data:rows().map(p=>({year:p.date.slice(0,4),period:'M'+p.date.slice(5,7),value:p.value})).concat({year:'2026',period:'M13',value:'999999'})})).reverse()}});
const secondary=metric=>fetchApiShadowSeries(metric,'fixture-key',{now,fetchImpl:async()=>Response.json({observations:rows()})});
function transport(missing=[], bad={}) {
  return async (url,init)=>{
    if(String(url).startsWith('https://api.bls.gov/')) {
      assert.equal(init.method,'POST');const body=JSON.parse(init.body);
      assert.deepEqual(body.seriesid,Object.values(BLS_SERIES));assert.equal(body.registrationkey,'fixture-key');
      const p=payload();p.Results.series=p.Results.series.filter(s=>!missing.includes(s.seriesID));
      for(const s of p.Results.series)if(bad[s.seriesID])s.data=bad[s.seriesID];
      return Response.json(p);
    }
    const parsed=new URL(url);assert.equal(parsed.hostname,'api.stlouisfed.org');
    assert.equal(init.redirect,'manual');assert.equal(parsed.searchParams.get('units'),'lin');
    return Response.json({observations:rows()});
  };
}
test('OFF: four real parser successes preserved exactly and one batch, zero FRED',async()=>{
  const r=await collectProviderCandidates({fetchImpl:transport(),now,blsKey:'fixture-key'});
  const expected=parseBls(payload());assert.deepEqual(r.appliedBlsResult.data,expected.data);assert.deepEqual(r.appliedBlsResult.statuses,expected.statuses);
  assert.deepEqual(r.requestCounts,{bls:1,fred:0});assert.equal(r.fallbackProductionEnabled,true);assert.equal(FALLBACK_PRODUCTION_ENABLED,true);
  assert.ok(Object.values(r.metrics).every(m=>m.candidate.decision==='USE_PRIMARY'));
});
test('UNRATE TIMEOUT candidate uses actual adapter values but OFF keeps original failure',async()=>{
  const batch=parseBls(payload());batch.statuses[BLS_SERIES.unemployment]='TIMEOUT';batch.data.delete(BLS_SERIES.unemployment);
  const result=await secondary('unemployment');
  const r=integrateProviderResults({batch,secondaryResults:{unemployment:result},fetchedAt});
  assert.equal(r.appliedBlsResult,batch);assert.equal(r.appliedBlsResult.statuses[BLS_SERIES.unemployment],'TIMEOUT');
  const m=r.metrics.unemployment;assert.equal(m.candidate.decision,'USE_SECONDARY');
  assert.equal(m.secondary.provider,'FRED');assert.equal(m.secondary.sourceSeries,'LNS14000000');
  assert.equal(m.secondary.observedAt,'2026-08-01');assert.equal(m.secondary.previousObservedAt,'2026-07-01');
  assert.equal(m.secondary.currentValue,117);assert.equal(m.secondary.previousValue,116);
});
for(const missing of [[],[BLS_SERIES.unemployment],[BLS_SERIES.ppi,BLS_SERIES.unemployment]])test(`candidate request design: ${missing.length} missing`,async()=>{
  const r=await collectProviderCandidates({fetchImpl:transport(missing),now,blsKey:'fixture-key',fredKey:'fixture-key',inspectSecondary:true});
  assert.deepEqual(r.requestCounts,{bls:1,fred:missing.length});
  for(const [metric,m] of Object.entries(r.metrics)){
    const id=metric==='payroll'?BLS_SERIES.payrolls:BLS_SERIES[metric];
    assert.equal(m.candidate.decision,missing.includes(id)?'USE_SECONDARY':'USE_PRIMARY');
    assert.equal(r.appliedBlsResult.statuses[id],missing.includes(id)?'MISSING_SERIES':'SUCCESS');
  }
});
test('OFF default never fetches secondary even with primary missing',async()=>{
  const r=await collectProviderCandidates({fetchImpl:transport([BLS_SERIES.unemployment]),now,blsKey:'fixture-key'});
  assert.deepEqual(r.requestCounts,{bls:1,fred:0});assert.equal(r.appliedBlsResult.data.has(BLS_SERIES.unemployment),false);
});
test('CPI primary success ignores supplied secondary fixture',()=>{
  const r=integrateProviderResults({batch:parseBls(payload()),fetchedAt,secondaryResults:{get cpi(){throw Error('unused');}}});
  assert.equal(r.metrics.cpi.candidate.decision,'USE_PRIMARY');assert.equal(r.metrics.cpi.secondary,null);
});
test('BLS invalid numeric / semantic history failure never causes secondary',async()=>{
  for(const data of [[{year:'2026',period:'M08',value:'NaN'}],[{year:'2026',period:'M08',value:'4.1'}]]){
    const r=await collectProviderCandidates({fetchImpl:transport([],{[BLS_SERIES.unemployment]:data}),now,blsKey:'fixture-key',inspectSecondary:true});
    assert.equal(r.metrics.unemployment.candidate.decision,'BLOCKED');assert.equal(r.requestCounts.fred,0);
  }
});
test('primary unknown/parser defect cannot be hidden as REQUEST_FAILED',async()=>{
  const r=await collectProviderCandidates({fetchImpl:async()=>{throw Error('fixture-private-url?key=private');},now,inspectSecondary:true});
  assert.equal(r.requestCounts.fred,0);assert.ok(Object.values(r.metrics).every(m=>m.candidate.decision==='BLOCKED'));
  assert.ok(!JSON.stringify(r.metrics).includes('private'));
});
for(const patch of [{semantic:'FAIL'},{status:'MISSING_OBSERVATION'},{unit:'wrong'},{frequency:'Daily'},{seasonalAdjustment:'NSA'}])test('secondary invalid blocks '+JSON.stringify(patch),async()=>{
  const batch=parseBls(payload());batch.statuses[BLS_SERIES.unemployment]='TIMEOUT';
  const r=integrateProviderResults({batch,fetchedAt,secondaryResults:{unemployment:{...await secondary('unemployment'),...patch}}});
  assert.equal(r.metrics.unemployment.candidate.decision,'BLOCKED');assert.equal(r.appliedBlsResult,batch);
});
test('zero BLS rate survives standardization',()=>{
  const p=payload();p.Results.series.find(s=>s.seriesID===BLS_SERIES.unemployment).data.find(p=>p.year==='2026'&&p.period==='M08').value='0';
  const r=integrateProviderResults({batch:parseBls(p),fetchedAt});assert.equal(r.metrics.unemployment.candidate.decision,'USE_PRIMARY');assert.equal(r.metrics.unemployment.primary.currentValue,0);
});
test('all four official adapters map to exact metric and source IDs; redacted metadata',async()=>{
  const missing=Object.values(BLS_SERIES);
  const r=await collectProviderCandidates({fetchImpl:transport(missing),now,blsKey:'fixture-key',fredKey:'fixture-key',inspectSecondary:true});
  const ids={cpi:'CPIAUCNS',ppi:'PPIFIS',unemployment:'UNRATE',payroll:'PAYEMS'};
  for(const [metric,id] of Object.entries(ids)){
    assert.equal(r.metrics[metric].candidate.selected.transportSeries,id);assert.equal(r.metrics[metric].secondary.metricId,metric);
  }
  assert.deepEqual(r.requestCounts,{bls:1,fred:4});
  const json=JSON.stringify(r.metrics);for(const secret of ['fixture-key','api_key','https://','registrationkey','rawBody'])assert.ok(!json.includes(secret));
});
test('no implicit live transport',async()=>{await assert.rejects(()=>collectProviderCandidates(),/EXPLICIT_TRANSPORT_REQUIRED/);});
test('optional failure evidence leaves parser result byte-equivalent',()=>{
  const p=payload();p.Results.series=p.Results.series.filter(s=>s.seriesID!==BLS_SERIES.ppi);
  const evidence={};assert.deepEqual(parseBls(p,evidence),parseBls(p));assert.deepEqual(evidence[BLS_SERIES.ppi],{status:'MISSING_SERIES',origin:'PROVIDER'});
});
