import test from 'node:test';
import assert from 'node:assert/strict';
import {buildRecessionDefenseR13,annualizedGrowth,sahmGapScore} from '../lib/diagnostic-layer/recession-r13-components.mjs';
import {buildTreasuryTenorVolatility,buildBondVolatilityR6,sampleStd} from '../lib/diagnostic-layer/bond-vol-r6-components.mjs';
import {buildBankEmergencyR7,buildFundingStressR7,qualifyOtherCreditExtensions} from '../lib/diagnostic-layer/liquidity-funding-r7-components.mjs';
import {buildSupplyShockR9} from '../lib/diagnostic-layer/supply-r9-components.mjs';

const monthly=(startYear,count,fn)=>Array.from({length:count},(_,i)=>{
  const y=startYear+Math.floor(i/12),m=i%12+1;
  return {observationDate:`${y}-${String(m).padStart(2,'0')}-01`,value:fn(i)};
});
const quarterly=(startYear,count,fn)=>Array.from({length:count},(_,i)=>{
  const y=startYear+Math.floor(i/4),m=(i%4)*3+1;
  return {observationDate:`${y}-${String(m).padStart(2,'0')}-01`,value:fn(i)};
});
const daily=(start,count,fn)=>Array.from({length:count},(_,i)=>{
  const d=new Date(Date.parse(start+'T00:00:00Z')+i*86400000).toISOString().slice(0,10);
  return {observationDate:d,value:fn(i)};
});
const weekly=(start,count,fn)=>Array.from({length:count},(_,i)=>{
  const d=new Date(Date.parse(start+'T00:00:00Z')+i*7*86400000).toISOString().slice(0,10);
  return {observationDate:d,value:fn(i)};
});

test('R13 annualized growth contract matches validation script',()=>{
  assert.ok(Math.abs(annualizedGrowth(103,100,12,3)-(100*((103/100)**4-1)))<1e-12);
  assert.ok(Math.abs(annualizedGrowth(104,100,4,2)-(100*((104/100)**2-1)))<1e-12);
});

test('R13 Sahm piecewise score is exact at boundaries',()=>{
  assert.equal(sahmGapScore(0.10),100);
  assert.equal(sahmGapScore(0.50),25);
  assert.equal(sahmGapScore(1.00),0);
  assert.equal(sahmGapScore(1.20),0);
  assert.ok(Math.abs(sahmGapScore(0.30)-62.5)<1e-12);
});

test('R13 recession uses six growth percentiles min60 and Sahm component',()=>{
  const pay=monthly(2000,90,i=>1000+i*2);
  const ip=monthly(2000,90,i=>100+i*.3);
  const pce=monthly(2000,90,i=>100+i*.4);
  const retail=monthly(2000,90,i=>100+i*.5);
  const income=monthly(2000,90,i=>100+i*.6);
  const unemp=monthly(2000,90,i=>4+Math.sin(i/10)*.1);
  const gdp=quarterly(2000,40,i=>1000+i*5);
  const out=buildRecessionDefenseR13({payems:pay,gdpc1:gdp,indpro:ip,realPce:pce,unemployment:unemp,retailSales:retail,disposableIncome:income});
  const ready=out.rows.filter(r=>r.status==='READY');
  assert.ok(ready.length>0);
  assert.ok(Number.isFinite(ready[0].nfpScore));
  assert.ok(Number.isFinite(ready[0].unemploymentScore));
  assert.equal(out.lookAheadSafe,false);
});

test('sample standard deviation uses N-1 denominator',()=>{
  const x=[1,2,3];
  assert.ok(Math.abs(sampleStd(x)-1)<1e-12);
});

test('R6 tenor volatility uses bp differences, 20-change sample std, and 252 valid RV warmup',()=>{
  const rows=daily('2020-01-01',300,i=>1+i*.001+(i%5)*.0001);
  const out=buildTreasuryTenorVolatility(rows);
  assert.ok(Math.abs(out[1].dyBp-(rows[1].value-rows[0].value)*100)<1e-12);
  assert.equal(out[19].rv20,null);
  assert.ok(Number.isFinite(out[20].rv20));
  const firstScored=out.find(r=>Number.isFinite(r.score));
  assert.ok(firstScored);
  const validRvBefore=out.filter(r=>r.observationDate<=firstScored.observationDate&&Number.isFinite(r.rv20)).length;
  assert.equal(validRvBefore,252);
});

test('R6 bond volatility requires all four tenor scores on exact same date',()=>{
  const mk=mult=>daily('2020-01-01',300,i=>1+mult*i*.001+(i%7)*.0001);
  const out=buildBondVolatilityR6({y2:mk(1),y5:mk(1.1),y10:mk(1.2),y30:mk(1.3)});
  const ready=out.rows.filter(r=>r.status==='READY');
  assert.ok(ready.length>0);
  const r=ready[0];
  assert.ok(Math.abs(r.score-(r.y2Score+r.y5Score+r.y10Score+r.y30Score)/4)<1e-12);
  assert.equal(out.stdConvention,'SAMPLE_N_MINUS_1');
});

test('R7 qualified Other Credit Extensions rule matches approved R6/R7 evidence',()=>{
  assert.equal(qualifyOtherCreditExtensions('2023-04-01',10),10);
  assert.equal(qualifyOtherCreditExtensions('2024-01-01',0),0);
  assert.equal(qualifyOtherCreditExtensions('2024-01-01',10),null);
});

test('R7 bank emergency ratio divides weekly emergency funding by bank assets times 1000 and scores after 52 valid weeks',()=>{
  const start='2023-03-15';
  const primary=weekly(start,70,i=>10+i);
  const secondary=weekly(start,70,()=>2);
  const btfp=weekly(start,70,i=>i<38?5:0);
  const other=weekly(start,70,i=>i<38?3:0);
  const assets=weekly(start,70,()=>20000);
  const out=buildBankEmergencyR7({primaryCredit:primary,secondaryCredit:secondary,btfp,otherCreditExtensions:other,totalCommercialBankAssets:assets});
  const first=out.rows[0];
  assert.ok(Math.abs(first.emergencyRatio-20/(20000*1000))<1e-18);
  const scored=out.rows.filter(r=>Number.isFinite(r.score));
  assert.ok(scored.length>0);
});

test('R7 market funding A/B are floored at zero and C is absolute repo gap',()=>{
  const sofr=daily('2020-01-01',300,i=>2+(i%3)*.001);
  const iorb=daily('2020-01-01',300,()=>2.002);
  const obfr=daily('2020-01-01',300,i=>2+(i%2)*.001);
  const dvp=daily('2020-01-01',300,i=>3+i*.0001);
  const tri=daily('2020-01-01',300,i=>2.9+i*.0001);
  const bank={rows:weekly('2020-01-01',80,i=>({value:i})).map((r,i)=>({observationDate:r.observationDate,score:50+i*.1}))};
  const out=buildFundingStressR7({sofr,iorb,obfr,dvpRepo:dvp,triPartyRepo:tri,bankEmergency:bank});
  assert.equal(out.components.aRows[0].value,0);
  assert.ok(Math.abs(out.components.cRows[0].value-.1)<1e-12);
  assert.equal(out.components.aScore.find(r=>Number.isFinite(r.score))!==undefined,true);
});

test('R7 Funding Stress uses 35/30/20/15 market weights then 70/30 bank, with as-of carry',()=>{
  const n=340;
  const sofr=daily('2020-01-01',n,i=>2+.002*Math.sin(i/7)+i*.00001);
  const iorb=daily('2020-01-01',n,()=>2);
  const obfr=daily('2020-01-01',n,i=>2+.001*Math.cos(i/9)+i*.000005);
  const dvp=daily('2020-01-01',n,i=>3+.002*Math.sin(i/11));
  const tri=daily('2020-01-01',n,i=>2.9+.001*Math.cos(i/13));
  const bank={rows:weekly('2020-01-01',70,i=>i).map((r,i)=>({observationDate:r.observationDate,score:40+(i%20)}))};
  const out=buildFundingStressR7({sofr,iorb,obfr,dvpRepo:dvp,triPartyRepo:tri,bankEmergency:bank});
  const ready=out.rows.find(r=>r.status==='READY');
  assert.ok(ready);
  const market=.35*ready.sofrIorbScore+.30*ready.obfrIorbScore+.20*ready.repoGapScore+.15*ready.sofrIorbRv20Score;
  assert.ok(Math.abs(ready.score-(.70*market+.30*ready.bankEmergencyScore))<1e-12);
  assert.ok(ready.bankEmergencyObservationDate<=ready.observationDate);
});

test('R9 Supply Shock uses 240-month trailing percentile with min60',()=>{
  const count=330;
  const mk=(base,growth,wiggle)=>monthly(1990,count,i=>base*Math.exp(growth*i)*(1+wiggle*Math.sin(i/5)));
  const gscpi=monthly(1990,count,i=>Math.sin(i/8));
  const out=buildSupplyShockR9({
    gscpi,
    wti:mk(50,.001,.04),
    gasoline:mk(2,.001,.03),
    copper:mk(3000,.001,.05),
    industrialProduction:mk(100,.001,.01),
    headlineCpi:mk(100,.002,.002),
    coreCpi:mk(100,.0018,.001),
  });
  const ready=out.rows.filter(r=>r.status==='READY');
  assert.ok(ready.length>0);
  assert.equal(out.percentileContract,'TRAILING_240_MONTHLY_EXPANDING_UNTIL_FULL_MIN60');
});

test('R9 commodity score is inverse percentile while IP score is positive percentile',()=>{
  const count=100;
  const gscpi=monthly(2000,count,()=>0);
  const commodity=monthly(2000,count,i=>i===count-1?400:100+i*.1);
  const ip=monthly(2000,count,i=>100+i*.1+i*i*.002);
  const headline=monthly(2000,count,i=>100+i*.2);
  const core=monthly(2000,count,i=>100+i*.18);
  const out=buildSupplyShockR9({
    gscpi,wti:commodity,gasoline:commodity,copper:commodity,
    industrialProduction:ip,headlineCpi:headline,coreCpi:core,
  });
  const r=out.rows.at(-1);
  assert.ok(Number.isFinite(r.oilScore));
  assert.ok(Number.isFinite(r.industrialProductionScore));
  assert.ok(r.oilScore<10);
  assert.ok(r.industrialProductionScore>50);
});

test('R9 supply composite keeps locked 40/20/10/10/10/10 weights and no reweight',()=>{
  const count=120;
  const gscpi=monthly(2000,count,i=>Math.sin(i/6));
  const p=monthly(2000,count,i=>100+i+5*Math.sin(i/4));
  const ip=monthly(2000,count,i=>100+i*.2+Math.sin(i/5));
  const cpi=monthly(2000,count,i=>100+i*.3);
  const core=monthly(2000,count,i=>100+i*.25);
  const out=buildSupplyShockR9({gscpi,wti:p,gasoline:p,copper:p,industrialProduction:ip,headlineCpi:cpi,coreCpi:core});
  const ready=out.rows.filter(r=>r.status==='READY').at(-1);
  assert.ok(ready);
  const expected=.40*ready.gscpiScore+.20*ready.oilScore+.10*ready.gasolineScore+.10*ready.copperScore+.10*ready.industrialProductionScore+.10*ready.headlineCoreGapScore;
  assert.ok(Math.abs(ready.score-expected)<1e-12);
});
