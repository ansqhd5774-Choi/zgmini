import test from 'node:test';
import assert from 'node:assert/strict';
import {forecastRowsFromSaved} from '../lib/market-calendar-er1-forecast-saved-adapter.mjs';
import {scoreER1ForecastIssuers} from
  '../lib/market-calendar-er1-forecast-score.mjs';

const asOf='2026-11-06';
const data=(date,group,rows,storedAt='2026-11-06T11:00:00.000Z')=>({
  day:date,storedAt,body:{date,
  pre:group==='pre'?rows:[],after:group==='after'?rows:[],
  notSupplied:group==='notSupplied'?rows:[]}});
const row=(symbol,extra={})=>({symbol,name:symbol+' Inc',
  eps:null,revenue:null,epsEstimate:1.2,revenueEstimate:100,...extra});

test('saved forecast-only future symbols score without history or provider GET',()=>{
  const input=forecastRowsFromSaved({asOf,savedDays:[
    data('2026-11-20','pre',[row('AAA'),row('BBB',{
      epsEstimate:-0.5,revenueEstimate:50})])
  ]});
  const result=scoreER1ForecastIssuers(input.issuerRows,{asOf});
  assert.equal(input.coverage.futureSymbols,2);
  assert.equal(result.coverage.scoreableIssuers,2);
  assert.equal(result.coverage.estimateOnly,2);
  assert.deepEqual(result.rankings.map(x=>x.basis),['ESTIMATE','ESTIMATE']);
  assert.equal(result.previewOnly,true);
});

test('calendar day date is attached and first upcoming report is selected',()=>{
  const input=forecastRowsFromSaved({asOf,savedDays:[
    data('2026-11-08','pre',[row('AAA',{epsEstimate:0.2,revenueEstimate:10})]),
    data('2026-12-15','after',[row('AAA',{epsEstimate:9,revenueEstimate:900})])
  ]});
  const output=scoreER1ForecastIssuers(input.issuerRows,{asOf});
  assert.equal(input.issuerRows[0].releases.length,2);
  assert.equal(output.rankings[0].referenceDate,'2026-11-08');
});

test('share classes collapse to one issuer and select available estimates',()=>{
  const input=forecastRowsFromSaved({asOf,savedDays:[
    data('2026-11-12','after',[row('GOOG',{
      epsEstimate:null,revenueEstimate:null}),row('GOOGL',{
      epsEstimate:2.1,revenueEstimate:300})])
  ]});
  assert.equal(input.coverage.futureSymbols,2);
  assert.equal(input.coverage.futureIssuers,1);
  assert.equal(input.issuerRows[0].issuerId,'ALPHABET');
  assert.equal(input.issuerRows[0].earningsSymbol,'GOOGL');
  assert.deepEqual(input.issuerRows[0].tickers,['GOOG','GOOGL']);
  assert.equal(scoreER1ForecastIssuers(input.issuerRows,{asOf})
    .coverage.scoreableIssuers,1);
});

test('EPS alone remains scoreable even when revenue is missing; actuals ignored',()=>{
  const input=forecastRowsFromSaved({asOf,savedDays:[
    data('2026-11-13','pre',[row('ABC',{
      revenueEstimate:null})]),
    data('2026-11-14','pre',[row('EMPTY',{
      epsEstimate:null,revenueEstimate:null})]),
  ],historyBySymbol:{ABC:{storedAt:'2026-11-05T10:00:00Z',
    body:[{symbol:'ABC',date:'2026-09-01',
    eps:0.4,revenue:123}]}}});
  const result=scoreER1ForecastIssuers(input.issuerRows,{asOf});
  assert.equal(result.coverage.scoreableIssuers,1);
  assert.equal(result.coverage.mixed,0);
  assert.equal(result.coverage.unscoreableReasons.ER1_FORECAST_EPS_MISSING,1);
  assert.equal(result.rankings[0].issuerId,'ABC');
  assert.equal(input.issuerRows[0].releases.length,1);
});

test('share-class source choice prefers available EPS over revenue-only sibling',()=>{
  const input=forecastRowsFromSaved({asOf,savedDays:[
    data('2026-11-12','after',[row('GOOG',{
      epsEstimate:2,revenueEstimate:null}),row('GOOGL',{
      epsEstimate:null,revenueEstimate:999999})])
  ]});
  assert.equal(input.issuerRows[0].earningsSymbol,'GOOG');
  const score=scoreER1ForecastIssuers(input.issuerRows,{asOf});
  assert.equal(score.coverage.scoreableIssuers,1);
  assert.equal(score.rankings[0].issuerId,'ALPHABET');
});

test('calendar item on as-of day is included with expected EPS',()=>{
  const input=forecastRowsFromSaved({asOf,savedDays:[
    data(asOf,'pre',[row('DAY',{eps:456,revenue:456,
      epsEstimate:-0.3,revenueEstimate:80})])
  ]});
  const result=scoreER1ForecastIssuers(input.issuerRows,{asOf});
  assert.equal(input.coverage.futureSymbols,1);
  assert.equal(result.rankings[0].referenceDate,asOf);
  assert.equal(result.rankings[0].basis,'ESTIMATE');
});

test('future actual values cannot alter forecast-only score',()=>{
  const make=(eps,revenue)=>forecastRowsFromSaved({asOf,savedDays:[
    data('2026-11-12','pre',[row('NOLOOK',{eps,revenue})])
  ]}).issuerRows;
  const a=scoreER1ForecastIssuers(make(999,999),{asOf});
  const b=scoreER1ForecastIssuers(make(-999,1),{asOf});
  assert.equal(a.rankings[0].score,b.rankings[0].score);
  assert.equal(a.rankings[0].basis,'ESTIMATE');
});

test('late snapshots cannot leak into as-of cutoff; latest valid observation wins',()=>{
  const early=data('2026-11-20','pre',[row('A',{epsEstimate:1})],
    '2026-11-02T00:00:00Z');
  const newer=data('2026-11-20','pre',[row('A',{epsEstimate:2})],
    '2026-11-06T13:00:00Z');
  const late=data('2026-11-20','pre',[row('A',{epsEstimate:1000})],
    '2026-11-07T00:00:00Z');
  const input=forecastRowsFromSaved({asOf,savedDays:[early,newer,late]});
  assert.equal(input.coverage.ignoredLateSnapshots,1);
  assert.equal(input.issuerRows[0].releases[0].epsEstimate,2);
  assert.equal(input.coverage.latestSourceStoredAt,'2026-11-06T13:00:00.000Z');
});

test('conflicting simultaneous observations mark metric missing, not a new GET',()=>{
  const snapshot={day:'2026-11-20',storedAt:'2026-11-06T00:00:00Z',
    body:{date:'2026-11-20',
    pre:[row('A')],after:[row('A',{epsEstimate:99})],notSupplied:[]}};
  const input=forecastRowsFromSaved({asOf,savedDays:[snapshot]});
  assert.equal(input.coverage.sameTimeConflicts,1);
  assert.equal(input.issuerRows[0].releases[0].epsEstimate,null);
  assert.equal(input.issuerRows[0].releases[0].revenueEstimate,100);
});

test('a third same-instant duplicate cannot restore a conflicted estimate',()=>{
  const snapshot={day:'2026-11-20',storedAt:'2026-11-06T00:00:00Z',
    body:{date:'2026-11-20',pre:[row('A',{epsEstimate:1})],
      after:[row('A',{epsEstimate:2})],
      notSupplied:[row('A',{epsEstimate:1})]}};
  const input=forecastRowsFromSaved({asOf,savedDays:[snapshot]});
  assert.equal(input.coverage.sameTimeConflicts,1);
  assert.equal(input.issuerRows[0].releases[0].epsEstimate,null);
});

test('lossless decimal text and explicit missing markers preserve EPS ranking and missing-not-zero',()=>{
 const input=forecastRowsFromSaved({asOf,savedDays:[
  data('2026-11-20','pre',[
   row('NEG',{epsEstimate:' -1.25 ',revenueEstimate:'1e3',eps:'0',revenue:'100.00'}),
   row('MISS',{epsEstimate:'N/A',revenueEstimate:''}),
   row('ZERO',{epsEstimate:'0',revenueEstimate:'-'})
  ])
 ]});
 const rows=Object.fromEntries(input.issuerRows.map(x=>[x.issuerId,x.releases[0]]));
 assert.equal(rows.NEG.epsEstimate,-1.25);
 assert.equal(rows.NEG.revenueEstimate,1000);
 assert.equal(rows.NEG.eps,0);
 assert.equal(rows.NEG.revenue,100);
 assert.equal(rows.MISS.epsEstimate,null);
 assert.equal(rows.MISS.revenueEstimate,null);
 assert.equal(rows.ZERO.epsEstimate,0);
 assert.equal(rows.ZERO.revenueEstimate,null);
 const scored=scoreER1ForecastIssuers(input.issuerRows,{asOf});
 assert.equal(scored.coverage.scoreableIssuers,2);
 assert.equal(scored.coverage.unscoreableReasons.ER1_FORECAST_EPS_MISSING,1);
});

test('unknown metrics, ambiguous strings and negative revenue fail closed with value-free field codes',()=>{
 const cases=[
  ['epsEstimate','1,234','ER1_FORECAST_SAVED_METRIC_EPS_ESTIMATE_STRING'],
  ['epsEstimate','Infinity','ER1_FORECAST_SAVED_METRIC_EPS_ESTIMATE_STRING'],
  ['epsEstimate',true,'ER1_FORECAST_SAVED_METRIC_EPS_ESTIMATE_BOOLEAN'],
  ['epsEstimate',{raw:'1'},'ER1_FORECAST_SAVED_METRIC_EPS_ESTIMATE_OBJECT'],
  ['revenueEstimate',-2,'ER1_FORECAST_SAVED_METRIC_REVENUE_ESTIMATE_NEGATIVE'],
  ['revenueEstimate','1e999','ER1_FORECAST_SAVED_METRIC_REVENUE_ESTIMATE_NONFIN']
 ];
 for(const [key,value,expected] of cases){
  const body=row('INVALID',{[key]:value});
  assert.throws(()=>forecastRowsFromSaved({asOf,savedDays:[
   data('2026-11-20','pre',[body])
  ]}),error=>error?.message===expected);
  assert.ok(('MONTH_SOURCE_INVALID_ADAPTER_'+expected).length<=80);
 }
});
