import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildCommoditiesK1R2,K1_R2_METHOD,K1_R2_MAX_LAG_MONTHS,K1_R2_WEIGHTS} from '../lib/market-score/public-domain-producers-r2.mjs';
import {buildCommoditiesR3Shadow} from '../lib/market-score/commodities-r3-shadow.mjs';
import {buildCmR1DomainResults} from '../lib/market-score/domain-adapter-r1.mjs';
import {buildCompositeMarketScore,DOMAIN_WEIGHTS} from '../lib/market-score/composite-model-r1.mjs';
import {economicCommoditySourceDate,verifiedEconomicCommodityScore,verifiedEconomicCommodityChart,isEconomicCommodityChartCurrent} from '../lib/economic-commodity-stored-display-r4.mjs';

const asOf='2026-10-01';
const months=(n,start=100)=>Array.from({length:n},(_,i)=>({
 observationDate:`${2019+Math.floor(i/12)}-${String(i%12+1).padStart(2,'0')}-01`,
 value:start+i+Math.sin(i/4),
}));
const sources=()=>({wtiRows:months(92,70),brentRows:months(92,75),
 copperRows:months(92,7000),gasolineRows:months(93,2.5)});
function fixture(input=sources(),date=asOf){
 const calc=buildCommoditiesK1R2({...input,asOfDate:date});
 const domain=buildCompositeMarketScore(
  buildCmR1DomainResults({publicDomains:{commodities:calc}}),
  {updatedAt:date+'T15:00:00Z'},
 ).domains.find(x=>x.id==='commodities');
 return {calc,domain};
}
const score=(domain,date=asOf)=>verifiedEconomicCommodityScore(domain,date);
const chart=(domain,date=asOf)=>verifiedEconomicCommodityChart(domain,date,domain.score);
const match=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`expected ${a} close to ${b}`);

test('active commodity is K1-R2, not legacy 50/25/25 K1 or R3 shadow',()=>{
 const f=fixture();
 assert.equal(f.calc.status,'READY');
 assert.equal(f.calc.methodologyVersion,K1_R2_METHOD);
 assert.equal(f.domain.methodologyVersion,K1_R2_METHOD);
 assert.equal(f.domain.weight,DOMAIN_WEIGHTS.find(x=>x.id==='commodities').weight);
 const shadow=buildCommoditiesR3Shadow({...sources(),asOfDate:asOf});
 assert.notEqual(shadow.methodologyVersion,K1_R2_METHOD);
 assert.equal(shadow.mode,'SHADOW_ONLY');
 for(const version of ['COMMODITIES_K1','COMMODITIES_R3_SHADOW_R1',null]){
  assert.equal(score({...f.domain,methodologyVersion:version}),null);
 }
});

test('approved WTI 30 / Brent 25 / copper 25 / gasoline 20, no reweight',()=>{
 assert.deepEqual(K1_R2_WEIGHTS,{wti:0.30,brent:0.25,copper:0.25,gasoline:0.20});
 const f=fixture(),weights=[.3,.25,.25,.2];
 assert.deepEqual(f.domain.indicators.map(x=>x.name),['WTI','Brent','구리','휘발유']);
 const expected=f.domain.indicators.reduce((a,row,i)=>a+weights[i]*row.score,0);
 match(expected,f.calc.score);
 match(expected,f.domain.score);
 match(score(f.domain),expected);
});

test('actual independent component months survive K1-R2 through adapter and composite',()=>{
 const f=fixture();
 assert.deepEqual(f.domain.indicators.map(x=>x.observationDate),
  ['2026-08-01','2026-08-01','2026-08-01','2026-09-01']);
 assert.deepEqual(f.domain.indicators.map(x=>x.asOfDate),
  ['2026-08-01','2026-08-01','2026-08-01','2026-09-01']);
 assert.deepEqual(f.domain.indicators.map(x=>x.lagMonths),[2,2,2,1]);
 assert.equal(f.domain.updatedAt,'2026-09-01');
 assert.equal(f.domain.observationDate,'2026-09-01');
 assert.equal(economicCommoditySourceDate(f.domain,asOf),'2026-09-01');
 assert.notEqual(economicCommoditySourceDate(f.domain,asOf),asOf);
});

test('each official original source and exact K1-R2 4 indicator identities are preserved',()=>{
 const f=fixture();
 assert.deepEqual(f.domain.indicators.map(x=>x.source),[
  'FRED/EIA MCOILWTICO','FRED/EIA MCOILBRENTEU','World Bank Pink Sheet','FRED/EIA GASREGCOVM']);
 assert.deepEqual(f.domain.indicators.map(x=>x.freshness),
  ['LAG_2_MONTHS','LAG_2_MONTHS','LAG_2_MONTHS','LAG_1_MONTHS']);
 assert.equal(f.domain.freshness,'INDEPENDENT_LATEST_MAX_2_MONTHS');
 assert.equal(score(f.domain),f.calc.score);
});

test('new eligible WTI observed month changes K1-R2, carries other three without inventing same-month prices',()=>{
 const input=sources();
 // K1 monthly shock requires both previous month and three-month reference.
 // August -> October alone is NOT a scored October observation.
 input.wtiRows.push({observationDate:'2026-09-01',value:167});
 const old=fixture(input);
 const newerInput={...input,wtiRows:[...input.wtiRows,{observationDate:'2026-10-01',value:900}]};
 const newer=fixture(newerInput);
 assert.equal(newer.calc.status,'READY');
 assert.equal(newer.domain.observationDate,'2026-10-01');
 assert.deepEqual(newer.domain.indicators.map(x=>x.observationDate),
  ['2026-10-01','2026-08-01','2026-08-01','2026-09-01']);
 assert.equal(newer.domain.indicators[0].lagMonths,0);
 assert.notEqual(newer.domain.score,old.domain.score);
 match(score(newer.domain),newer.domain.score);
 assert.equal(chart(newer.domain).at(-1).date,'2026-10-01');
 assert.equal(chart(newer.domain).at(-1).score,newer.domain.score);
});

test('same-month API re-query does not fabricate an October observed price or chart point',()=>{
 const before=fixture(sources(),'2026-10-01');
 const after=fixture(sources(),'2026-10-31');
 assert.equal(before.domain.score,after.domain.score);
 assert.equal(after.domain.observationDate,'2026-09-01');
 assert.deepEqual(chart(after.domain,'2026-10-31'),chart(before.domain,'2026-10-01'));
 assert.equal(chart(after.domain,'2026-10-31').some(x=>x.date==='2026-10-01'),false);
});

test('valid carry for 2 calendar months and expiry on month 3 is approved',()=>{
 const data=sources();
 for(const [i,key] of Object.keys(data).entries()){
  const newRow={observationDate:'2026-09-01',value:900+i*200};
  // An existing monthly observation must be corrected in place; the
  // official normalizer rejects conflicting duplicate observations.
  const existing=data[key].findIndex(r=>r.observationDate===newRow.observationDate);
  if(existing>=0)data[key][existing]=newRow;
  else data[key].push(newRow);
 }
 const october=fixture(data,'2026-10-01');
 const november=fixture(data,'2026-11-01');
 const december=fixture(data,'2026-12-01');
 assert.equal(october.calc.status,'READY');
 assert.equal(november.calc.status,'READY');
 assert.equal(october.domain.score,november.domain.score);
 assert.equal(november.domain.observationDate,'2026-09-01');
 assert.equal(score(november.domain,'2026-11-01'),november.domain.score);
 assert.equal(december.calc.status,'PARTIAL');
 assert.equal(december.domain.score,null);
 assert.equal(score(december.domain,'2026-12-01'),null);
});

test('actual original component older than allowed two months results PARTIAL, with no fallback score',()=>{
 const data=sources();data.wtiRows=months(90,70);
 const f=fixture(data);
 assert.equal(K1_R2_MAX_LAG_MONTHS,2);
 assert.equal(f.calc.status,'PARTIAL');
 assert.equal(f.domain.status,'PARTIAL');
 assert.equal(f.domain.score,null);
 assert.ok(f.domain.missingFactors.includes('WTI_SCORE_STALE'));
 assert.equal(score(f.domain),null);
 assert.deepEqual(chart(f.domain),[]);
});

test('missing source cannot become another source or a fabricated carried zero',()=>{
 const d=sources();d.brentRows=[];
 const f=fixture(d);
 assert.equal(f.calc.status,'PARTIAL');
 assert.equal(f.domain.score,null);
 assert.ok(f.domain.missingFactors.includes('BRENT_SCORE_MISSING'));
 assert.equal(score(f.domain),null);
});

test('wrong method, stale producer, PARTIAL, missing or malformed score never displays as confirmed',()=>{
 const f=fixture();
 for(const patch of [
  {methodologyVersion:null},{methodologyVersion:'COMMODITIES_K1'},
  {status:'PARTIAL'},{status:'UNAVAILABLE'},{freshness:'OUT_OF_DATE'},
  {score:null},{score:'50'},{missingFactors:['WTI_SCORE_STALE']},
 ]){
  assert.equal(score({...f.domain,...patch}),null);
 }
});

test('a valid zero score and zero factors remain distinct from raw missing/null',()=>{
 const f=fixture(),rows=f.domain.indicators.map(x=>({...x,score:0}));
 const zero={...f.domain,score:0,indicators:rows,trend:[
  ...f.domain.trend.filter(x=>x.label!==f.domain.observationDate),
  {label:f.domain.observationDate,value:0}]};
 assert.equal(score(zero),0);
 assert.equal(chart(zero).at(-1).score,0);
 for(const invalid of [null,undefined,NaN,Infinity,-1,101,'0']){
  const fields=rows.map(x=>({...x}));fields[0].score=invalid;
  assert.equal(score({...zero,indicators:fields}),null);
 }
});

test('component metadata missing, duplicate or forged source cannot pass the published guard',()=>{
 const f=fixture();
 for(const count of [0,1,2,3]){
  assert.equal(score({...f.domain,indicators:f.domain.indicators.slice(0,count)}),null);
 }
 assert.equal(score({...f.domain,indicators:[...f.domain.indicators,{name:'extra',score:50}]}),null);
 for(const modify of [
  rows=>rows[0].name='old crude',
  rows=>rows[1].source='unverified other Brent',
  rows=>rows[2].status='PARTIAL',
  rows=>rows[3].observationDate='2026-08-01',
  rows=>rows[3].asOfDate='2026-08-01',
 ]){
  const rows=f.domain.indicators.map(x=>({...x}));modify(rows);
  assert.equal(score({...f.domain,indicators:rows}),null);
 }
});

test('lagMonths, per-factor freshness and maximum-month contract cannot be forged',()=>{
 const f=fixture();
 assert.equal(score({...f.domain,freshness:'INDEPENDENT_LATEST_MAX_3_MONTHS'}),null);
 for(const modify of [
  rows=>rows[0].lagMonths=3,
  rows=>rows[1].freshness='CURRENT_MONTH',
  rows=>rows[2].lagMonths=0,
  rows=>rows[3].freshness='LAG_0_MONTHS',
 ]){
  const rows=f.domain.indicators.map(x=>({...x}));modify(rows);
  assert.equal(score({...f.domain,indicators:rows}),null);
 }
});

test('top source date must match maximum genuine source month, never evaluation/snapshot date',()=>{
 const f=fixture();
 for(const date of ['2026-10-01','2026-09-02','2026-02-30','2026-13-01','2026-01-01']){
  assert.equal(score({...f.domain,observationDate:date}),null);
 }
 assert.equal(score({...f.domain,updatedAt:'2026-10-01'}),null);
});

test('metadata-lacking old correctly published CM-R1 still uses actual scored updatedAt',()=>{
 const f=fixture(),old={...f.domain,observationDate:null};
 assert.equal(economicCommoditySourceDate(old,asOf),f.domain.updatedAt);
 assert.equal(score(old),f.domain.score);
 const broken={...old,updatedAt:asOf};
 assert.equal(score(broken),null);
});

test('current saved monthly chart ends at last valid input month, not API query month',()=>{
 const f=fixture(),points=chart(f.domain);
 assert.ok(points.length>=10);
 assert.equal(points.at(-1).date,'2026-09-01');
 match(points.at(-1).score,f.domain.score);
 assert.equal(isEconomicCommodityChartCurrent(points,f.domain,asOf,f.domain.score),true);
 assert.equal(points.some(x=>x.date==='2026-10-01'),false);
});

test('no last source month in published chart rejects ready headline and never creates a point',()=>{
 const f=fixture(),gap={...f.domain,trend:f.domain.trend.filter(x=>x.label!=='2026-09-01')};
 assert.equal(score(gap),null);
 assert.deepEqual(chart(gap),[]);
 assert.equal(isEconomicCommodityChartCurrent(chart(gap),gap,asOf,gap.score),false);
});

test('contradictory latest month and duplicate conflicting historical score cannot be silently overwritten',()=>{
 const f=fixture(),wrong={...f.domain,trend:f.domain.trend.map(x=>x.label==='2026-09-01'?{...x,value:x.value+1}:x)};
 assert.equal(score(wrong),null);
 assert.deepEqual(chart(wrong),[]);
 const dup={...f.domain,trend:[...f.domain.trend,{label:'2026-09-01',value:f.domain.score+1}]};
 assert.equal(score(dup),null);
 assert.deepEqual(chart(dup),[]);
});

test('a same-month official correction updates stored score without inventing a different month',()=>{
 const old=fixture(),data=sources();
 data.gasolineRows[data.gasolineRows.length-1]={observationDate:'2026-09-01',value:9000};
 const updated=fixture(data);
 assert.equal(updated.calc.status,'READY');
 assert.equal(updated.domain.observationDate,old.domain.observationDate);
 assert.notEqual(updated.domain.score,old.domain.score);
 match(score(updated.domain),updated.domain.score);
 assert.equal(chart(updated.domain).at(-1).date,'2026-09-01');
});

test('future, non-month, impossible and conflicting period points never produce a fake chart update',()=>{
 const f=fixture(),original=structuredClone(f.domain.trend);
 const noise={...f.domain,trend:[...f.domain.trend,
  {label:'2026-10-01',value:100},{label:'2026-02-30',value:80},
  {label:'2026-09-20',value:10}]};
 assert.equal(score(noise),f.domain.score);
 assert.equal(chart(noise).at(-1).date,'2026-09-01');
 assert.equal(chart(noise).some(x=>x.date==='2026-10-01'||x.date==='2026-02-30'||x.date==='2026-09-20'),false);
 assert.deepEqual(f.domain.trend,original);
});

test('partial published historical point displays as null, never as zero or fabricated history',()=>{
 const f=fixture(),day=f.domain.trend.find(x=>x.label==='2026-06-01')?.label;
 assert.equal(day,'2026-06-01');
 const changed={...f.domain,trend:f.domain.trend.filter(x=>x.label!==day).concat({label:day,value:null,status:'PARTIAL'})};
 assert.equal(score(changed),f.domain.score);
 assert.equal(chart(changed).find(x=>x.date===day)?.score,null);
});

test('producer interrupted by missing intermediate 4 months resets the historical plot before resuming',()=>{
 const data=sources();
 data.wtiRows=data.wtiRows.filter(x=>!['2026-01-01','2026-02-01','2026-03-01','2026-04-01'].includes(x.observationDate));
 const out=fixture(data);
 assert.equal(out.calc.status,'READY');
 assert.equal(score(out.domain),out.domain.score);
 const points=chart(out.domain);
 assert.equal(points.at(-1).date,'2026-09-01');
 assert.equal(points.some(x=>x.date==='2026-05-01'),false);
});

test('D25 UI and CM-R1 show only verified K1-R2 source-month, factor and stored comparison',()=>{
 const panel=readFileSync(new URL('../app/economic-indicators/economic-detail-panel.tsx',import.meta.url),'utf8');
 for(const term of [
  'id==="commodities"?verifiedEconomicCommodityScore(domain,payload?.asOfDate)',
  'verifiedEconomicCommodityChart(domain,payload?.asOfDate,score)',
  'isEconomicCommodityChartCurrent(commodityChart,domain,payload?.asOfDate,score)',
  'id==="commodities"?commodityChart',
  'id!=="commodities"||(score!==null&&commodityChartCurrent)',
  'id==="commodities"&&(score===null||!commodityChartCurrent)',
  'economicCommoditySourceDate(domain,payload?.asOfDate)',
  '||id==="dollarFx"||id==="commodities")&&score===null',
 ])assert.ok(panel.includes(term),term);
 const cm=readFileSync(new URL('../lib/market-score/composite-model-r1.mjs',import.meta.url),'utf8');
 assert.ok(cm.includes('spec.id==="commodities"?{'));
 assert.ok(cm.includes('observationDate:src?.observationDate??src?.updatedAt??null'));
});
