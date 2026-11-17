import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildDollarFxR54,DOLLAR_FX_R54_WEIGHTS} from '../lib/diagnostic-layer/open-resolution-r53-components.mjs';
import {buildCmR1DomainResults} from '../lib/market-score/domain-adapter-r1.mjs';
import {buildCompositeMarketScore,DOMAIN_WEIGHTS} from '../lib/market-score/composite-model-r1.mjs';
import {
 economicDollarFxSourceDate,verifiedEconomicDollarFxScore,
 verifiedEconomicDollarFxChart,isEconomicDollarFxChartCurrent
} from '../lib/economic-dollar-fx-stored-display-r4.mjs';

const asOf='2026-11-17';
const excluded=new Set(['2025-07-04','2025-11-27','2026-01-01','2026-07-03','2026-09-07']);
const sources=[];
for(let d=new Date('2025-03-03T00:00:00Z');sources.length<420;d=new Date(d.valueOf()+86400000)){
 const day=d.toISOString().slice(0,10),week=d.getUTCDay();
 if(week===0||week===6||excluded.has(day))continue;
 const i=sources.length;
 sources.push({observationDate:day,value:105+0.017*i+1.3*Math.sin(i/8)+0.34*Math.cos(i/3)});
}
const nextBusiness=(last)=>{
 const d=new Date(last+'T00:00:00Z');
 do{d.setUTCDate(d.getUTCDate()+1)}while([0,6].includes(d.getUTCDay())||excluded.has(d.toISOString().slice(0,10)));
 return d.toISOString().slice(0,10);
};
const extra={observationDate:nextBusiness(sources.at(-1).observationDate),value:sources.at(-1).value*1.35};
function fixture(rows=sources,snapshot=asOf){
 const calc=buildDollarFxR54(rows,{asOfDate:snapshot});
 const domain=buildCompositeMarketScore(
  buildCmR1DomainResults({dollarFx:calc}),
  {updatedAt:snapshot+'T11:30:00Z'},
 ).domains.find(x=>x.id==='dollarFx');
 return {calc,domain};
}
const check=(domain,day=asOf)=>verifiedEconomicDollarFxScore(domain,day);
const chart=(domain,day=asOf)=>verifiedEconomicDollarFxChart(domain,day,domain.score);

test('official R54 four weights 30/30/20/20 stay fixed and CM-R1 domain allocation is unchanged',()=>{
 assert.deepEqual(DOLLAR_FX_R54_WEIGHTS,{level:0.30,shortMomentum:0.30,mediumMomentum:0.20,volatility:0.20});
 const f=fixture();
 assert.equal(f.calc.status,'READY');
 assert.equal(f.domain.weight,DOMAIN_WEIGHTS.find(x=>x.id==='dollarFx').weight);
 assert.equal(f.domain.methodologyVersion,'DOLLAR_FX_R54_1');
 assert.equal(f.domain.score,f.calc.score);
 assert.equal(check(f.domain),f.calc.score);
});

test('minimum 252 historical percentile observations and 20/60 lag are still calculated server-side',()=>{
 const tooShort=fixture(sources.slice(0,100));
 assert.equal(tooShort.calc.status,'PARTIAL');
 assert.equal(tooShort.calc.score,null);
 const f=fixture();
 const last=f.calc.rows.find(row=>row.observationDate===f.calc.observationDate);
 assert.ok(last);
 const index=sources.findIndex(row=>row.observationDate===last.observationDate);
 assert.ok(index>312);
 assert.ok(Math.abs(last.shortMomentum-(sources[index].value/sources[index-20].value-1)*100)<1e-9);
 assert.ok(Math.abs(last.mediumMomentum-(sources[index].value/sources[index-60].value-1)*100)<1e-9);
 assert.ok(Number.isFinite(last.volatility20));
});

test('last published source business date survives R54 to adapter, composite and hero header',()=>{
 const f=fixture(),latest=sources.at(-1).observationDate;
 assert.equal(f.calc.observationDate,latest);
 assert.equal(f.domain.observationDate,latest);
 assert.equal(f.domain.updatedAt,latest);
 assert.equal(economicDollarFxSourceDate(f.domain,asOf),latest);
 assert.notEqual(latest,asOf);
 assert.deepEqual(f.domain.indicators.map(x=>x.observationDate),Array(4).fill(latest));
});

test('a genuinely new stored business observation triggers R54 recomputation and advances the stored last point',()=>{
 const old=fixture(),updated=fixture([...sources,extra]);
 assert.equal(updated.calc.status,'READY');
 assert.equal(updated.domain.observationDate,extra.observationDate);
 assert.notEqual(updated.domain.score,old.domain.score);
 assert.equal(check(updated.domain),updated.domain.score);
 const points=chart(updated.domain);
 assert.equal(points.at(-1).date,extra.observationDate);
 assert.equal(points.at(-1).score,updated.domain.score);
 assert.equal(isEconomicDollarFxChartCurrent(points,updated.domain,asOf,updated.domain.score),true);
});

test('new API retrieval timestamp or later asOf without extra source data cannot create a new business-day score point',()=>{
 const old=fixture(sources,'2026-10-26');
 const latest=fixture(sources,asOf);
 assert.equal(latest.domain.score,old.domain.score);
 assert.equal(latest.domain.observationDate,old.domain.observationDate);
 assert.deepEqual(latest.domain.trend,old.domain.trend);
 assert.equal(chart(latest.domain).at(-1).date,sources.at(-1).observationDate);
 assert.equal(chart(latest.domain).some(x=>x.date===asOf),false);
});

test('the approved four-factor weighted sum is not renormalized or recomputed from raw source figures',()=>{
 const f=fixture(),rows=f.domain.indicators;
 const w=[0.3,0.3,0.2,0.2];
 const sum=rows.reduce((a,x,i)=>a+w[i]*x.score,0);
 assert.ok(Math.abs(sum-f.domain.score)<1e-6);
 assert.equal(check({...f.domain,score:f.domain.score+1}),null);
 const wrong={...f.domain,indicators:rows.map(x=>({...x}))};
 wrong.indicators[0].score+=1;
 assert.equal(check(wrong),null);
});

test('4 official factor IDs, labels, source and observation date are mandatory with distinct raw/score semantics',()=>{
 const f=fixture(),expected=['dollar-fx-54-1','dollar-fx-54-2','dollar-fx-54-3','dollar-fx-54-4'];
 assert.deepEqual(f.domain.indicators.map(row=>row.id),expected);
 assert.deepEqual(f.domain.indicators.map(row=>row.name),['달러 수준 부담','단기 달러 모멘텀','중기 달러 모멘텀','달러 변동성']);
 assert.ok(f.domain.indicators.every(row=>row.source==='Federal Reserve Broad Dollar Index / DTWEXBGS'));
 for(const length of [0,1,2,3])assert.equal(check({...f.domain,indicators:f.domain.indicators.slice(0,length)}),null);
 assert.equal(check({...f.domain,indicators:[...f.domain.indicators,{id:'old',score:50}]}),null);
});

test('no legacy methodology, partial/missing score, or absent factor becomes a confirmed new R54 point',()=>{
 const f=fixture();
 for(const patch of [{methodologyVersion:'DOLLAR_FX_R53'},{methodologyVersion:null},
  {status:'PARTIAL'},{status:'UNAVAILABLE'},{score:null},{score:'50'}, {missingFactors:['dollar-fx-54-3']}])
  assert.equal(check({...f.domain,...patch}),null);
});

test('missing raw dollar index/momentum and missing factor score are not a numeric zero',()=>{
 const f=fixture();
 for(const bad of [null,undefined,NaN,Infinity,'0']){
  const invalid={...f.domain,indicators:f.domain.indicators.map(x=>({...x}))};
  invalid.indicators[1].value=bad;
  assert.equal(check(invalid),null);
  invalid.indicators[1].value=f.domain.indicators[1].value;
  invalid.indicators[1].score=bad;
  assert.equal(check(invalid),null);
 }
});

test('zero is an eligible score and negative momentum stays a signed raw percentage',()=>{
 const f=fixture(),input=f.domain.indicators.map(x=>({...x,score:0}));
 const zero={...f.domain,score:0,indicators:input,trend:[...f.domain.trend.filter(x=>x.label!==f.domain.observationDate),{label:f.domain.observationDate,value:0}]};
 assert.equal(check(zero),0);
 assert.equal(chart(zero).at(-1).score,0);
 const m=f.domain.indicators[1];
 assert.ok(typeof m.value==='number'&&Number.isFinite(m.value));
});

test('incorrect names, forged source and different factor period are rejected without hidden substitution',()=>{
 const f=fixture(),cases=[
  rows=>rows[0].name='old USDX',
  rows=>rows[1].source='DXY not DTWEXBGS',
  rows=>rows[2].observationDate='2026-10-01',
  rows=>rows[3].status='STALE',
  rows=>rows[1].id=rows[0].id,
 ];
 for(const modify of cases){
  const rows=f.domain.indicators.map(x=>({...x}));modify(rows);
  assert.equal(check({...f.domain,indicators:rows}),null);
 }
});

test('future source-day, weekend source-day, invalid calendar date and inconsistent top-level date fail',()=>{
 const f=fixture();
 for(const dt of ['2026-12-01','2026-10-03','2026-02-30','2026-09-32']){
  assert.equal(check({...f.domain,observationDate:dt,updatedAt:dt}),null);
 }
 assert.equal(check({...f.domain,observationDate:'2026-10-01'}),null);
 assert.equal(check({...f.domain,updatedAt:'2026-11-17'}),null);
});

test('pre-provenance composite keeps last actual source day as the only legacy fallback',()=>{
 const f=fixture(),old={...f.domain,observationDate:null};
 assert.equal(economicDollarFxSourceDate(old,asOf),f.domain.updatedAt);
 assert.equal(check(old),f.domain.score);
 assert.equal(check({...old,updatedAt:asOf}),null);
});

test('stored R54 current-vintage series is shown on actual source dates, not falsely labeled historical PIT',()=>{
 const f=fixture(),points=chart(f.domain),latest=f.domain.observationDate;
 assert.equal(f.calc.historyMode,'CURRENT_VINTAGE_ONLY');
 assert.equal(f.calc.lookAheadSafe,false);
 assert.ok(points.length>50);
 assert.equal(points.at(-1).date,latest);
 assert.equal(points.at(-1).score,f.domain.score);
 assert.equal(isEconomicDollarFxChartCurrent(points,f.domain,asOf,f.domain.score),true);
 assert.equal(points.some(x=>x.date===asOf),false);
});

test('missing current saved score or a conflicting final score fails closed, no synthetic last point',()=>{
 const f=fixture(),day=f.domain.observationDate;
 const absent={...f.domain,trend:f.domain.trend.filter(p=>p.label!==day)};
 assert.equal(check(absent),null);
 assert.deepEqual(chart(absent),[]);
 const mismatch={...f.domain,trend:f.domain.trend.map(p=>p.label===day?{...p,value:p.value+2}:p)};
 assert.equal(check(mismatch),null);
 assert.deepEqual(chart(mismatch),[]);
});

test('contradictory same-day duplicate never silently overwrites the genuine score',()=>{
 const f=fixture(),conflict={...f.domain,trend:[...f.domain.trend,{label:f.domain.observationDate,value:f.domain.score+1}]};
 assert.equal(check(conflict),null);
 assert.deepEqual(chart(conflict),[]);
});

test('future, nonbusiness weekend, impossible date and out-of-year items never invent chart points',()=>{
 const f=fixture(),unchanged=structuredClone(f.domain.trend),earliest='2025-01-02';
 const modified={...f.domain,trend:[...f.domain.trend,
  {label:asOf,value:98},{label:'2026-10-03',value:45},
  {label:'2026-02-30',value:35},{label:earliest,value:62}]};
 assert.equal(check(modified),f.domain.score);
 const points=chart(modified);
 assert.equal(points.at(-1).date,f.domain.observationDate);
 for(const d of [asOf,'2026-10-03','2026-02-30',earliest])assert.equal(points.some(p=>p.date===d),false);
 assert.deepEqual(f.domain.trend,unchanged);
});

test('official missing release dates are never filled by new retrieval or holiday placeholder',()=>{
 const f=fixture();
 assert.equal(f.domain.trend.some(p=>p.label==='2026-07-03'),false);
 const checked=chart(f.domain);
 assert.equal(checked.some(p=>p.date==='2026-07-03'),false);
 assert.equal(checked.at(-1).date,f.domain.observationDate);
});

test('gapped source series keeps only actual stored points, missing date stays null not zero',()=>{
 const f=fixture(),dt=f.domain.trend.find(p=>p.label>'2026-01-01'&&p.label<f.domain.observationDate)?.label;
 assert.ok(dt);
 const gap={...f.domain,trend:f.domain.trend.filter(p=>p.label!==dt).concat({label:dt,value:null,status:'PARTIAL'})};
 const checked=chart(gap);
 assert.equal(checked.find(p=>p.date===dt).score,null);
 assert.equal(checked.at(-1).score,f.domain.score);
});

test('W06 D24 economics detail uses authenticated source date, saved score, chart and comparison gate',()=>{
 const ui=readFileSync(new URL('../app/economic-indicators/economic-detail-panel.tsx',import.meta.url),'utf8');
 for(const term of [
  'id==="dollarFx"?verifiedEconomicDollarFxScore(domain,payload?.asOfDate)',
  'verifiedEconomicDollarFxChart(domain,payload?.asOfDate,score)',
  'isEconomicDollarFxChartCurrent(dollarFxChart,domain,payload?.asOfDate,score)',
  'id==="dollarFx"?dollarFxChart',
  'id!=="dollarFx"||(score!==null&&dollarFxChartCurrent)',
  'id==="dollarFx"&&(score===null||!dollarFxChartCurrent)',
  'economicDollarFxSourceDate(domain,payload?.asOfDate)',
  '||id==="breadth"||id==="dollarFx")&&score===null',
 ])assert.ok(ui.includes(term),term);
 const adapter=readFileSync(new URL('../lib/market-score/domain-adapter-r1.mjs',import.meta.url),'utf8');
 const cm=readFileSync(new URL('../lib/market-score/composite-model-r1.mjs',import.meta.url),'utf8');
 assert.ok(adapter.includes('observationDate:dollarFx?.observationDate??null'));
 assert.ok(cm.includes('spec.id==="dollarFx"?{'));
});
