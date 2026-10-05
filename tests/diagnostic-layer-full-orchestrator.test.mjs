import test from 'node:test';
import assert from 'node:assert/strict';
import {buildFullDiagnosticOrchestrator} from '../lib/diagnostic-layer/full-diagnostic-orchestrator.mjs';

function dailyRows(count, fn, start='2000-01-01') {
  const base = new Date(`${start}T00:00:00Z`);
  return Array.from({length:count}, (_,i) => {
    const d = new Date(base);
    d.setUTCDate(d.getUTCDate()+i);
    return {observationDate:d.toISOString().slice(0,10),value:fn(i)};
  });
}

function weeklyRows(count, fn, start='2000-01-01') {
  const base = new Date(`${start}T00:00:00Z`);
  return Array.from({length:count}, (_,i) => {
    const d = new Date(base);
    d.setUTCDate(d.getUTCDate()+7*i);
    return {observationDate:d.toISOString().slice(0,10),value:fn(i)};
  });
}

function monthlyRows(count, fn, startYear=2000) {
  return Array.from({length:count}, (_,i) => {
    const year=startYear+Math.floor(i/12);
    const month=i%12+1;
    return {observationDate:`${year}-${String(month).padStart(2,'0')}-01`,value:fn(i)};
  });
}

function quarterlyRows(count, fn, startYear=1995) {
  return Array.from({length:count}, (_,i) => {
    const year=startYear+Math.floor(i/4);
    const q=i%4;
    const month=q*3+1;
    return {observationDate:`${year}-${String(month).padStart(2,'0')}-01`,value:fn(i)};
  });
}

function baseSeries() {
  const monthly=monthlyRows(150,i=>100+i+i*i/500);
  const core=monthlyRows(150,i=>100+i*0.8+i*i/600);
  const daily=dailyRows(380,i=>5+i/10000);
  const weekly=weeklyRows(100,i=>100+i);
  return {
    PCEPILFE:core,
    PCEPI:monthly,
    CPILFESL:core,
    CPIAUCSL:monthly,
    EXPINF5YR:monthlyRows(150,i=>2+0.001*i),
    PAYEMS:monthlyRows(150,i=>10000+i*25+i*i/20),
    GDPC1:quarterlyRows(80,i=>10000+i*80+i*i),
    INDPRO:monthlyRows(150,i=>100+i/3+i*i/1000),
    DPCERA3M086SBEA:monthlyRows(150,i=>100+i/2+i*i/900),
    UNRATE:monthlyRows(150,i=>4+0.001*i),
    RRSFS:monthlyRows(150,i=>100+i/2+i*i/800),
    DSPIC96:monthlyRows(150,i=>100+i/2+i*i/700),
    SOFR:daily,
    IORB:dailyRows(380,i=>4.99+i/10000),
    OBFR:dailyRows(380,i=>5.005+i/10000),
    WRESBAL:weeklyRows(100,i=>1000+i),
    WTREGEN:weeklyRows(100,i=>500+i*i),
    RRPONTSYD:dailyRows(380,i=>1000+i*i),
    M2SL:monthlyRows(150,i=>1000+i*4+i*i/20),
    WLCFLPCL:weeklyRows(100,i=>10+i/100),
    WLCFLSCL:weeklyRows(100,i=>1+i/1000),
    H41RESPPALDKNWW:weeklyRows(100,i=>0),
    WLCFOCEL:weeklyRows(100,i=>0),
    TLAACBM027NBOG:weeklyRows(100,i=>20000+i*10),
    DGS2:dailyRows(380,i=>2+i/1000+Math.sin(i/10)/100),
    DGS5:dailyRows(380,i=>2.2+i/1000+Math.sin(i/11)/100),
    DGS10:dailyRows(380,i=>2.5+i/1000+Math.sin(i/12)/100),
    DGS30:dailyRows(380,i=>2.8+i/1000+Math.sin(i/13)/100),
    BOGZ1LM793164115Q:quarterlyRows(80,i=>500+i*10),
    BOGZ1LM103164115Q:quarterlyRows(80,i=>1000+i*20),
    GDP:quarterlyRows(80,i=>5000+i*50),
    SPASTT01USM661N:monthlyRows(150,i=>80+i*0.8+i*i/700),
    BOGZ1FL153064486Q:quarterlyRows(80,i=>30+i/10),
    B471RC1Q027SBEA:quarterlyRows(80,i=>100+i),
    A455RC1Q027SBEA:quarterlyRows(80,i=>1000+i*4),
    A464RC1Q027SBEA:quarterlyRows(80,i=>500+i*3),
    MCOILWTICO:monthlyRows(150,i=>50+i/10+i*i/5000),
    GASREGCOVM:monthlyRows(150,i=>2+i/100+i*i/100000),
  };
}

function externalInputs() {
  return {
    inflationExpectationsRows:monthlyRows(150,i=>2+0.001*i),
    dvpRepoRows:dailyRows(380,i=>5+i/1000),
    triPartyRepoRows:dailyRows(380,i=>4.9+i/1100),
    cmdiRows:dailyRows(380,i=>0.2+0.0001*i).map(row=>({
      observationDate:row.observationDate,
      market:Math.min(0.9,row.value),
      ig:Math.min(0.9,row.value+0.05),
      hy:Math.min(0.9,row.value+0.10),
    })),
    gscpiRows:monthlyRows(150,i=>Math.sin(i/10)),
    copperRows:monthlyRows(150,i=>5000+i*10+i*i/10),
    assetPriceRows:monthlyRows(150,i=>1000+i*10+i*i/3),
    speculativeFlowMagnitude4QRows:quarterlyRows(50,i=>Math.abs(10+i/5)).map(row=>({
      observationDate:row.observationDate,
      value:row.value,
    })),
  };
}

test('orchestrator requires explicit asOfDate', () => {
  assert.throws(
    () => buildFullDiagnosticOrchestrator({baseOverall:60}),
    /AS_OF_DATE_REQUIRED/,
  );
});

test('orchestrator preserves current-vintage honesty', () => {
  const out=buildFullDiagnosticOrchestrator({
    asOfDate:'2030-12-31',
    baseOverall:60,
    series:baseSeries(),
    external:externalInputs(),
  });
  assert.equal(out.historyMode,'CURRENT_VINTAGE_ONLY');
  assert.equal(out.lookAheadSafe,false);
  assert.equal(out.limitations.releaseDateAvailableAt,'CURRENT_VINTAGE_ONLY_NOT_PROVEN');
});

test('orchestrator builds Recession, Funding Stress and Bond Volatility artifacts', () => {
  const out=buildFullDiagnosticOrchestrator({
    asOfDate:'2030-12-31',
    baseOverall:60,
    series:baseSeries(),
    external:externalInputs(),
  });
  assert.equal(out.artifacts.recession.status,'READY_CURRENT_VINTAGE');
  assert.equal(out.artifacts.fundingStress.status,'READY_CURRENT_VINTAGE');
  assert.equal(out.artifacts.bondVolatility.status,'READY_CURRENT_VINTAGE');
});

test('R1 wiring is used for Liquidity and Credit rather than a parallel score path', () => {
  const out=buildFullDiagnosticOrchestrator({
    asOfDate:'2030-12-31',
    baseOverall:60,
    series:baseSeries(),
    external:externalInputs(),
  });
  assert.equal(out.snapshot.activeRevision,'DIAGNOSTIC_SCORE_TRANSFORM_R1');
  assert.equal(out.snapshot.diagnostics.liquidityCrisisDefense.status,'READY');
  assert.equal(out.snapshot.diagnostics.creditRiskDefense.status,'READY');
});

test('missing BIS parsed inputs keep Debt PARTIAL without fabrication', () => {
  const out=buildFullDiagnosticOrchestrator({
    asOfDate:'2030-12-31',
    baseOverall:60,
    series:baseSeries(),
    external:externalInputs(),
  });
  assert.equal(out.artifacts.bisDebt.status,'PARTIAL');
  assert.equal(out.snapshot.diagnostics.debtRiskSafety.status,'PARTIAL');
  assert.equal(out.snapshot.diagnostics.debtRiskSafety.score,null);
  assert.ok(out.snapshot.diagnostics.debtRiskSafety.missing.includes('dsr'));
  assert.ok(out.snapshot.diagnostics.debtRiskSafety.missing.includes('debtGdp'));
});

test('missing PIT breadth keeps Asset Bubble PARTIAL and no reweight occurs', () => {
  const out=buildFullDiagnosticOrchestrator({
    asOfDate:'2030-12-31',
    baseOverall:60,
    series:baseSeries(),
    external:externalInputs(),
  });
  assert.equal(out.limitations.assetBreadthPointInTime,'PARTIAL');
  assert.equal(out.snapshot.diagnostics.assetBubbleSafety.status,'PARTIAL');
  assert.equal(out.snapshot.diagnostics.assetBubbleSafety.score,null);
  assert.ok(out.snapshot.diagnostics.assetBubbleSafety.missing.includes('breadthDivergence'));
});

test('missing Earnings inputs remain PARTIAL instead of receiving macro substitutes', () => {
  const out=buildFullDiagnosticOrchestrator({
    asOfDate:'2030-12-31',
    baseOverall:60,
    series:baseSeries(),
    external:externalInputs(),
  });
  assert.equal(out.limitations.earningsHistoricalPointInTime,'PARTIAL');
  assert.equal(out.snapshot.diagnostics.earningsRecessionDefense.status,'PARTIAL');
  assert.equal(out.snapshot.diagnostics.earningsRecessionDefense.score,null);
});

test('GSCPI scoring can use supplied rows while Production fetch remains explicitly deferred', () => {
  const out=buildFullDiagnosticOrchestrator({
    asOfDate:'2030-12-31',
    baseOverall:60,
    series:baseSeries(),
    external:externalInputs(),
  });
  assert.equal(out.artifacts.supply.status,'READY_CURRENT_VINTAGE');
  assert.equal(out.snapshot.diagnostics.supplyShockSafety.status,'READY');
  assert.equal(out.limitations.gscpiProductionFetch,'DEFERRED_EXACT_CURRENT_URL_UNRESOLVED');
});

test('overlay preserves Base Overall when Asset or Debt is still PARTIAL', () => {
  const out=buildFullDiagnosticOrchestrator({
    asOfDate:'2030-12-31',
    baseOverall:60,
    series:baseSeries(),
    external:externalInputs(),
  });
  assert.equal(out.snapshot.overlay.status,'PARTIAL');
  assert.equal(out.snapshot.overlay.finalOverall,60);
  assert.equal(out.snapshot.overlay.penalty,null);
});

test('partial map reports unresolved diagnostic domains', () => {
  const out=buildFullDiagnosticOrchestrator({
    asOfDate:'2030-12-31',
    baseOverall:60,
    series:baseSeries(),
    external:externalInputs(),
  });
  assert.ok(Object.hasOwn(out.partials,'earningsRecessionDefense'));
  assert.ok(Object.hasOwn(out.partials,'assetBubbleSafety'));
  assert.ok(Object.hasOwn(out.partials,'debtRiskSafety'));
});


test('R48_STAGGERED_RECESSION_RELEASE_REGRESSION: recession snapshot carries each component independently to asOf', () => {
  const series=baseSeries();

  // Keep later NFP / IP / retail rows while intentionally staggering the
  // four components that were missing in the R47 Production canary.
  series.GDPC1=series.GDPC1.filter(row=>row.observationDate<='2012-01-01');
  series.DPCERA3M086SBEA=series.DPCERA3M086SBEA.slice(0,-2);
  series.UNRATE=series.UNRATE.slice(0,-1);
  series.DSPIC96=series.DSPIC96.slice(0,-2);

  const out=buildFullDiagnosticOrchestrator({
    asOfDate:'2030-12-31',
    baseOverall:60,
    series,
    external:externalInputs(),
  });

  const latestArtifactRow=out.artifacts.recession.rows.at(-1);
  assert.equal(latestArtifactRow.status,'PARTIAL');
  assert.ok(latestArtifactRow.missing.includes('realGdp'));
  assert.ok(latestArtifactRow.missing.includes('realPce'));
  assert.ok(latestArtifactRow.missing.includes('unemployment'));
  assert.ok(latestArtifactRow.missing.includes('disposableIncome'));

  assert.equal(out.snapshot.diagnostics.recessionDefense.status,'READY');
  assert.equal(out.snapshot.diagnostics.recessionDefense.score!==null,true);
  assert.deepEqual(out.snapshot.diagnostics.recessionDefense.missing,[]);
});


test('OECD/FRED asset price fallback supplies R9 price acceleration without external rows', () => {
  const external=externalInputs();
  delete external.assetPriceRows;
  const out=buildFullDiagnosticOrchestrator({
    asOfDate:'2030-12-31',
    baseOverall:60,
    series:baseSeries(),
    external,
  });
  assert.equal(out.artifacts.priceAcceleration.status,'READY_CURRENT_VINTAGE');
  assert.ok(out.artifacts.priceAcceleration.monthly.filter(row=>row.score!==null).length>0);
});
