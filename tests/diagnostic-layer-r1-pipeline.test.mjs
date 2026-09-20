import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DiagnosticPipelineError,
  buildR1DiagnosticSnapshot,
  buildR1WiredInputs,
  scoreCmdiComponentsR1,
} from '../lib/diagnostic-layer/r1-diagnostic-pipeline.mjs';

function dailyRows(count, fn, start='2000-01-01') {
  const base = new Date(`${start}T00:00:00Z`);
  return Array.from({length:count}, (_,i) => {
    const d = new Date(base);
    d.setUTCDate(d.getUTCDate()+i);
    return {observationDate:d.toISOString().slice(0,10), value:fn(i)};
  });
}

function weeklyRows(count, fn, start='2000-01-01') {
  const base = new Date(`${start}T00:00:00Z`);
  return Array.from({length:count}, (_,i) => {
    const d = new Date(base);
    d.setUTCDate(d.getUTCDate()+7*i);
    return {observationDate:d.toISOString().slice(0,10), value:fn(i)};
  });
}

function monthlyRows(count, fn, startYear=2000) {
  return Array.from({length:count}, (_,i) => {
    const year=startYear+Math.floor(i/12);
    const month=i%12+1;
    return {observationDate:`${year}-${String(month).padStart(2,'0')}-01`, value:fn(i)};
  });
}

function readyOtherDomains() {
  return {
    inflation:{corePce:60,coreCpi:60,cpi:60,inflationExpectations:60},
    recession:{nfp:60,realGdp:60,industrialProduction:60,realPce:60,unemployment:60,retailSales:60,disposableIncome:60},
    earnings:{epsGrowth:60,margin:60,revenueGrowth:60,earningsGrowthBreadth:60},
    assetBubble:{valuationPressure:60,priceAcceleration:60,riskAssetShare:60,speculativeFlows:60,breadthDivergence:60,excessLiquidity:60},
    debt:{dsr:60,debtGdp:60,rateBurden:60,debtServiceCapacity:60},
    supply:{gscpi:60,oilShock:60,gasolineShock:60,copperShock:60,industrialProduction:60,headlineCoreGap:60},
  };
}

function r1Fixture() {
  return {
    asOfDate:'2010-12-31',
    series:{
      WRESBAL:weeklyRows(80,i=>100+i),
      WTREGEN:weeklyRows(90,i=>500+i*i),
      RRPONTSYD:dailyRows(320,i=>1000+i*i),
      M2SL:monthlyRows(90,i=>100+i+i*i/100),
    },
    fundingStressRows:[
      {observationDate:'2009-12-31',score:55},
      {observationDate:'2010-12-30',score:80},
    ],
    bondVolatilityRows:[
      {observationDate:'2009-12-31',score:50},
      {observationDate:'2010-12-29',score:70},
    ],
    cmdiRows:[
      {observationDate:'2010-12-24',hy:0.40,ig:0.30,market:0.20},
    ],
  };
}

test('pipeline requires explicit asOfDate and never invents current time', () => {
  assert.throws(
    () => buildR1WiredInputs({}),
    error => error instanceof DiagnosticPipelineError && error.status==='AS_OF_DATE_REQUIRED',
  );
});

test('CMDI R1 maps NY Fed Market CMDI to totalCmdi explicitly', () => {
  const rows=scoreCmdiComponentsR1([
    {observationDate:'2026-01-01',hy:0.4,ig:0.3,market:0.2},
  ]);
  assert.equal(rows[0].hyCmdi,60);
  assert.equal(rows[0].igCmdi,70);
  assert.equal(rows[0].totalCmdi,80);
  assert.equal(rows[0].totalCmdiSourceField,'Market CMDI');
});

test('R1 wiring uses latest observations at or before asOf and excludes future rows', () => {
  const fx=r1Fixture();
  fx.fundingStressRows.push({observationDate:'2011-01-01',score:1});
  fx.bondVolatilityRows.push({observationDate:'2011-01-01',score:2});
  fx.cmdiRows.push({observationDate:'2011-01-01',hy:0.99,ig:0.99,market:0.99});
  const out=buildR1WiredInputs(fx);
  assert.equal(out.liquidity.fundingStress,80);
  assert.equal(out.liquidity.bondVolatility,70);
  assert.equal(out.credit.hyCmdi,60);
  assert.equal(out.credit.totalCmdi,80);
});

test('R1 wiring fills all six Liquidity inputs when approved histories are sufficient', () => {
  const out=buildR1WiredInputs(r1Fixture());
  for (const value of Object.values(out.liquidity)) assert.equal(Number.isFinite(value),true);
});

test('Credit R1 wires HY/IG/Market CMDI plus R6 bond volatility', () => {
  const out=buildR1WiredInputs(r1Fixture());
  assert.deepEqual(out.credit,{
    hyCmdi:60,
    igCmdi:70,
    totalCmdi:80,
    bondVolatility:70,
  });
});

test('Debt creditStress is the same R1 Market CMDI score used as totalCmdi', () => {
  const out=buildR1WiredInputs(r1Fixture());
  assert.equal(out.debtCreditStress,80);
  assert.equal(out.debtCreditStress,out.credit.totalCmdi);
});

test('full snapshot wires R1 into Liquidity, Credit and Debt without changing other domains', () => {
  const fx=r1Fixture();
  const other=readyOtherDomains();
  const out=buildR1DiagnosticSnapshot({
    ...fx,
    baseOverall:60,
    ...other,
  });
  assert.equal(out.diagnostics.liquidityCrisisDefense.status,'READY');
  assert.equal(out.diagnostics.creditRiskDefense.status,'READY');
  assert.equal(out.diagnostics.debtRiskSafety.status,'READY');
  const expectedCredit=60*.35+70*.35+80*.10+70*.20;
  assert.ok(Math.abs(out.diagnostics.creditRiskDefense.score-expectedCredit)<1e-12);
  const expectedDebt=60*.35+60*.25+60*.15+80*.15+60*.10;
  assert.ok(Math.abs(out.diagnostics.debtRiskSafety.score-expectedDebt)<1e-12);
});

test('missing Funding Stress remains PARTIAL and is never reweighted', () => {
  const fx=r1Fixture();
  fx.fundingStressRows=[];
  const other=readyOtherDomains();
  const out=buildR1DiagnosticSnapshot({...fx,baseOverall:60,...other});
  assert.equal(out.diagnostics.liquidityCrisisDefense.status,'PARTIAL');
  assert.equal(out.diagnostics.liquidityCrisisDefense.score,null);
  assert.ok(out.diagnostics.liquidityCrisisDefense.missing.includes('fundingStress'));
});

test('current-vintage honesty is preserved in the wired pipeline', () => {
  const out=buildR1WiredInputs(r1Fixture());
  assert.equal(out.activeRevision,'DIAGNOSTIC_SCORE_TRANSFORM_R1');
  assert.equal(out.historyMode,'CURRENT_VINTAGE_ONLY');
  assert.equal(out.lookAheadSafe,false);
  assert.equal(out.carryPolicy,'LATEST_OBSERVATION_AT_OR_BEFORE_AS_OF_NO_INTERPOLATION');
});

test('partial overlay still preserves Base Overall when an overlay domain is missing', () => {
  const fx=r1Fixture();
  const other=readyOtherDomains();
  other.assetBubble.breadthDivergence=null;
  const out=buildR1DiagnosticSnapshot({...fx,baseOverall:60,...other});
  assert.equal(out.overlay.status,'PARTIAL');
  assert.equal(out.overlay.finalOverall,60);
  assert.equal(out.overlay.penalty,null);
});
