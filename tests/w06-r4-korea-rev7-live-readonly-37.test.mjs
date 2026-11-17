import test from 'node:test';
import assert from 'node:assert/strict';

// ONE-TIME W06 #37 evidence-only smoke for publicly published Rev7.
// This is deliberately a Draft-only diagnostic and must never be merged
// into the permanent network-independent CI. No DB access or writes.
const URL='https://zgmini.kr/api/indicators/korea-funds';
const isScore=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=100;
const isDate=x=>typeof x==='string'&&/^\d{8}$/.test(x)&&Number.isFinite(Date.parse(x.slice(0,4)+'-'+x.slice(4,6)+'-'+x.slice(6)+'T00:00:00Z'));
test('W06 #37 observe exact public Korea Rev7 status and 7-component last point (GET only)',async()=>{
 const response=await fetch(URL,{method:'GET',headers:{accept:'application/json','cache-control':'no-cache'},
  signal:AbortSignal.timeout(25000)});
 const contentType=response.headers.get('content-type');
 assert.match(contentType??'',/application\/json/);
 const body=await response.json();
 const composite=body?.composite;
 const history=Array.isArray(composite?.history)?composite.history:[];
 const indicators=Array.isArray(body?.indicators)?body.indicators:[];
 const last=history.at(-1)??null;
 const summary={
  httpStatus:response.status,
  bodyModelVersion:body?.methodologyVersion??null,
  compositeModelVersion:composite?.methodologyVersion??null,
  status:composite?.status??null,
  staleReason:composite?.staleReason??null,
  observationDate:composite?.observationDate??null,
  score:isScore(composite?.score)?composite.score:null,
  displayScore:isScore(composite?.displayScore)?composite.displayScore:null,
  historyCount:history.length,
  historyLastDate:last?.date??null,
  historyLastScore:isScore(last?.score)?last.score:null,
  indicatorCount:indicators.length,
  indicatorIds:indicators.map(x=>x?.id).filter(x=>typeof x==='string').slice(0,7),
  readyIndicatorCount:indicators.filter(x=>x?.status==='READY').length,
  researchOnly:body?.researchOnly??null,
  productionEligible:body?.productionEligible??null,
  pointInTimeVerified:composite?.pointInTimeVerified??null,
 };
 console.log('W06_37_ACTUAL_PUBLIC_GET',JSON.stringify(summary));
 // HTTP 200 with UNAVAILABLE is a valid fail-closed product response,
 // NOT evidence that the missing latest KRX data was installed/published.
 assert.equal(response.status,200);
 assert.equal(body?.profileId,'ZGMINI_KR_FG_REV7');
 assert.equal(body?.methodologyVersion,composite?.methodologyVersion);
 assert.ok(['READY','STALE','UNAVAILABLE','WARMUP'].includes(composite?.status));
 if(composite.status==='READY'||composite.status==='STALE'){
  assert.ok(isScore(composite.score),'ready/stale score must be numeric, not fabricated');
  assert.ok(isScore(composite.displayScore));
  assert.ok(isDate(composite.observationDate));
  assert.equal(indicators.length,7,'seven approved factors');
  assert.ok(history.length>1,'actual public history must contain prior data');
  assert.equal(last?.date,composite.observationDate);
  assert.equal(last?.score,composite.score);
  assert.ok(history.every(x=>isDate(x.date)&& (x.score===null||isScore(x.score))));
  assert.ok(history.every((x,i)=>i===0||history[i-1].date<x.date));
 }else{
  assert.equal(composite.score,null,'unavailable must not claim an actual computed score');
  assert.equal(summary.readyIndicatorCount,0);
 }
});
