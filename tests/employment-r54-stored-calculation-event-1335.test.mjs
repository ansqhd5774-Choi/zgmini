import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fullMarket} from './helpers/validated-market-fixtures.mjs';
import {localDatabase} from '../scripts/pc-writer/local-db.mjs';
import {marketOperationalStore} from '../worker/market-operational-store.mjs';
import {
 EMPLOYMENT_R54_METHOD,EMPLOYMENT_R54_INDICATORS,EMPLOYMENT_R54_WEIGHTS,
} from '../lib/market-score/employment-r54-candidate.mjs';
import {EMPLOYMENT_R54_STORED_EVENT,recordStoredEmploymentR54Event} from '../lib/market-score/employment-r54-calculation-event.mjs';
import {verifiedEconomicEmploymentScore,verifiedEconomicEmploymentChart,isEconomicEmploymentChartCurrent} from '../lib/economic-employment-stored-display-r4.mjs';
import {buildCmR1DomainResults} from '../lib/market-score/domain-adapter-r1.mjs';
import {buildCompositeMarketScore} from '../lib/market-score/composite-model-r1.mjs';

const now=Date.parse('2026-11-18T14:37:12.536Z'),day='2026-11-18',stamp=new Date(now).toISOString();
const observationDates=['2026-10-01','2026-10-01','2026-10-31','2026-10-31'];
const values=[48.75,31.25,74.03846153846155,25.49019607843137];
const providers=['BLS / UNRATE','BLS / PAYEMS','DOL ETA 539 / stored state claims','DOL ETA 539 / stored state claims breadth'];
const explanation='Employment R54 candidate: 실업률 30% + 비농업고용 3M 평균 증감 30% + 신규 실업수당 4W 평균 20% + 주 실업수당 개선 비율 20%. 백분위 산식은 저장된 과거 데이터만 사용하며 결측 가중치 재배분은 하지 않습니다.';
const employment=()=>({
 id:'employment',status:'READY',score:values.reduce((s,v,i)=>s+v*Object.values(EMPLOYMENT_R54_WEIGHTS)[i],0),
 methodologyVersion:EMPLOYMENT_R54_METHOD,asOfDate:day,
 interpretation:explanation,missingFactors:[],
 indicators:EMPLOYMENT_R54_INDICATORS.map(({id},i)=>({
  id,status:'READY',score:values[i],observationDate:observationDates[i],source:providers[i],
 })),
 trend:[{label:'2026-09-01',value:41.2},{label:'2026-10-01',value:59.10180995475113}],
});
const snapshot=()=>{
 const body=fullMarket(50,day);
 body.updatedAt=stamp;
 body.domains=body.domains.map(d=>d.id==='employment'?{...employment(),weight:d.weight}:d);
 return body;
};
const current=b=>b.domains.find(x=>x.id==='employment');
const fixture=t=>{
 const root=mkdtempSync(join(tmpdir(),'zg-r54-calculation-'));
 const db=localDatabase(join(root,'market.sqlite'));
 t.after(()=>{db.close();rmSync(root,{recursive:true,force:true});});
 return {db,store:marketOperationalStore(db)};
};

test('existing R54 methodology and date survive CM-R1, never infer R6/29 source',()=>{
 const c=buildCmR1DomainResults({employment:employment()}).find(x=>x.id==='employment');
 assert.equal(c.methodologyVersion,EMPLOYMENT_R54_METHOD);
 assert.equal(c.asOfDate,day);
 const composite=buildCompositeMarketScore([c],{updatedAt:stamp});
 const domain=composite.domains.find(x=>x.id==='employment');
 assert.equal(domain.methodologyVersion,EMPLOYMENT_R54_METHOD);
 assert.equal(domain.asOfDate,day);
 assert.equal(domain.score,employment().score);
 assert.equal(domain.indicators.length,4);
 assert.notEqual(domain.methodologyVersion,'EMPLOYMENT_R6_29_FACTOR_R1');
});

test('actual R54 calculation event is recorded once at the exact score-commit date, not synthetic client dot',()=>{
 const body=snapshot(),e=current(body),before=e.trend.slice(),headline=e.score;
 assert.equal(verifiedEconomicEmploymentScore(e,day),headline);
 assert.equal(recordStoredEmploymentR54Event(body,now),body);
 assert.equal(current(body).score,headline);
 assert.deepEqual(e.trend.slice(0,-1),before);
 assert.deepEqual(e.trend.at(-1),{
  label:day,value:headline,pointKind:EMPLOYMENT_R54_STORED_EVENT,calculatedAt:stamp,
 });
 assert.deepEqual(e.lastCalculationEvent,{
  kind:EMPLOYMENT_R54_STORED_EVENT,methodologyVersion:EMPLOYMENT_R54_METHOD,calculatedAt:stamp,
  factorObservationDates:EMPLOYMENT_R54_INDICATORS.map(({id},i)=>({id,date:observationDates[i]})),
 });
 assert.deepEqual(verifiedEconomicEmploymentChart(e,day,headline).at(-1),{date:day,score:headline});
 assert.equal(isEconomicEmploymentChartCurrent(verifiedEconomicEmploymentChart(e,day,headline),day,headline),true);
 recordStoredEmploymentR54Event(body,now);
 assert.equal(e.trend.length,3,'repeated same timestamp never duplicates current event');
});

test('snapshot day/current are truly persisted with exact event and stored_at in existing SQLite table',async t=>{
 const {db,store}=fixture(t),body=snapshot();
 await store.writeScore(body,now);
 const actual=await store.readScore();
 assert.equal(actual.storedAt,now);
 const domain=current(actual.body),trend=verifiedEconomicEmploymentChart(domain,day,domain.score);
 assert.equal(domain.methodologyVersion,EMPLOYMENT_R54_METHOD);
 assert.equal(domain.lastCalculationEvent.calculatedAt,stamp);
 assert.equal(trend.at(-1).date,day);
 assert.equal(trend.at(-1).score,domain.score);
 const dated=await db.prepare("SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?").bind(day).first();
 assert.equal(dated.stored_at,now);
 assert.deepEqual(JSON.parse(dated.body).domains.find(x=>x.id==='employment').trend,domain.trend);
 const history=await store.readScoreHistory({sinceDate:day});
 assert.equal(history.length,1);
 assert.equal(history[0].date,day);
 assert.equal(history[0].body.domains.find(x=>x.id==='employment').trend.at(-1).calculatedAt,stamp);
 assert.equal(domain.indicators.length,4,'R6/29 not persisted as this score');
});

test('weekly DOL update changes only current score; genuine old monthly values stay untouched',()=>{
 const b=snapshot(),e=current(b),monthly=structuredClone(e.trend);
 e.indicators[2].score=100;
 e.score=values.reduce((sum,value,index)=>sum+(index===2?100:value)*Object.values(EMPLOYMENT_R54_WEIGHTS)[index],0);
 const first=recordStoredEmploymentR54Event(b,now).domains.find(d=>d.id==='employment');
 assert.equal(first.score,e.score);
 assert.deepEqual(first.trend.slice(0,-1),monthly);
 assert.equal(first.trend.at(-1).value,e.score);
 assert.equal(first.indicators[2].observationDate,'2026-10-31','do not forge a newer observation date');
});

test('same-day monthly backtest anchor is replaced only by exact committed verified R54 event',()=>{
 const b=snapshot(),e=current(b);
 e.trend.push({label:day,value:e.score-1});
 recordStoredEmploymentR54Event(b,now);
 assert.equal(e.trend.filter(row=>row.label===day).length,1);
 assert.equal(e.trend.at(-1).value,e.score);
 assert.equal(e.trend.at(-1).pointKind,EMPLOYMENT_R54_STORED_EVENT);
 const other=snapshot();other.domains.find(d=>d.id==='employment').trend.push({label:day,value:21});
 other.updatedAt='2026-11-17T14:37:12.536Z';
 recordStoredEmploymentR54Event(other,now);
 assert.equal(current(other).trend.at(-1).value,21,'stale body cannot be promoted to an event');
});

test('R6 lineage, missing 4 factors, wrong provider, tampered score, stale clock never become stored R54 events',()=>{
 const cases=[
  x=>{x.methodologyVersion='EMPLOYMENT_R6_29_FACTOR_R1';},
  x=>{x.indicators.push({id:'R6-state',score:50,status:'READY'});},
  x=>{x.indicators[1].source='UNAPPROVED_PROVIDER';},
  x=>{x.indicators[2].status='PARTIAL';},
  x=>{x.indicators[2].score=null;},
  x=>{x.score+=1;},
  x=>{x.asOfDate='2026-11-17';},
  x=>{x.indicators[3].observationDate='2026-11-19';},
  x=>{x.indicators[3].score=-1;},
 ];
 for(const change of cases){
  const body=snapshot(),e=current(body),prior=structuredClone(e.trend);
  change(e);
  recordStoredEmploymentR54Event(body,now);
  assert.deepEqual(e.trend,prior,'unverified source cannot create an actual stored event');
  assert.equal(e.lastCalculationEvent,undefined);
 }
 const stale=snapshot();stale.updatedAt='2026-11-17T23:59:59Z';
 recordStoredEmploymentR54Event(stale,now);
 assert.equal(current(stale).trend.length,2,'source-clock mismatch fail closed');
 const r6=snapshot();r6.domains=r6.domains.map(x=>x.id==='employment'?{
  ...x,methodologyVersion:'EMPLOYMENT_R6_29_FACTOR_R1',indicators:Array.from({length:29},(_,i)=>({id:'R6-'+i,score:40})),
 }:x);
 recordStoredEmploymentR54Event(r6,now);
 assert.equal(current(r6).trend.length,2);
});

test('valid zero or hundred R54 factors remain real numbers, no reweight and no synthetic dates',()=>{
 for(const v of [0,100]){
  const b=snapshot(),e=current(b);
  for(const row of e.indicators)row.score=v;
  e.score=v;
  recordStoredEmploymentR54Event(b,now);
  assert.equal(e.trend.at(-1).value,v);
  assert.equal(e.trend.at(-1).label,day);
  assert.deepEqual(e.lastCalculationEvent.factorObservationDates.map(row=>row.date),observationDates);
 }
});

test('writer records only inside store.writeScore; public GET and R6 API never append events',()=>{
 const store=readFileSync('worker/market-operational-store.mjs','utf8');
 const page=readFileSync('app/economic-indicators/economic-detail-panel.tsx','utf8');
 const api=readFileSync('worker/market-score-r1.mjs','utf8');
 const needle='recordStoredEmploymentR54Event(body,now)';
 const method=store.indexOf('async writeScore(body,now)');
 assert.ok(store.indexOf(needle)>method && store.indexOf(needle)<store.indexOf('await db.batch(statements)'));
 assert.ok(store.indexOf(needle)<store.indexOf('assertCompleteMarket(body);',method));
 assert.match(page,/\/api\/employment-r6\/observations/);
 assert.match(page,/verifiedEconomicEmploymentChart/);
 assert.match(api,/loadEmploymentR54CandidateFromStored/);
 assert.doesNotMatch(api,/buildEmploymentR538/);
});
