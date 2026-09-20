import test from 'node:test';
import assert from 'node:assert/strict';
import {assembleDiagnosticSnapshot} from '../lib/diagnostic-layer/diagnostic-assembly.mjs';

const readyInputs=()=>({
  baseOverall:60,
  inflation:{corePce:60,coreCpi:60,cpi:60,inflationExpectations:60},
  recession:{nfp:60,realGdp:60,industrialProduction:60,realPce:60,unemployment:60,retailSales:60,disposableIncome:60},
  liquidity:{fundingStress:60,bankReserves:60,tga:60,onRrp:60,m2:60,bondVolatility:60},
  credit:{hyCmdi:60,igCmdi:60,totalCmdi:60,bondVolatility:60},
  earnings:{epsGrowth:60,margin:60,revenueGrowth:60,earningsGrowthBreadth:60},
  assetBubble:{valuationPressure:60,priceAcceleration:60,riskAssetShare:60,speculativeFlows:60,breadthDivergence:60,excessLiquidity:60},
  debt:{dsr:60,debtGdp:60,rateBurden:60,creditStress:60,debtServiceCapacity:60},
  supply:{gscpi:60,oilShock:60,gasolineShock:60,copperShock:60,industrialProduction:60,headlineCoreGap:60},
});

test('assembly uses locked weights and returns READY when all diagnostics are complete',()=>{
  const out=assembleDiagnosticSnapshot(readyInputs());
  assert.equal(out.status,'READY_CURRENT_VINTAGE');
  for(const item of Object.values(out.diagnostics)){
    assert.equal(item.status,'READY');
    assert.ok(Math.abs(item.score-60)<1e-12);
  }
  assert.equal(out.overlay.status,'READY');
  assert.equal(out.overlay.penalty,0);
  assert.equal(out.overlay.finalOverall,60);
});

test('missing component remains PARTIAL and is never reweighted',()=>{
  const input=readyInputs();input.assetBubble.breadthDivergence=null;
  const out=assembleDiagnosticSnapshot(input);
  assert.equal(out.diagnostics.assetBubbleSafety.status,'PARTIAL');
  assert.equal(out.diagnostics.assetBubbleSafety.score,null);
  assert.ok(out.diagnostics.assetBubbleSafety.missing.includes('breadthDivergence'));
});

test('missing overlay diagnostic preserves Base Overall and produces no fabricated penalty',()=>{
  const input=readyInputs();input.assetBubble.breadthDivergence=null;
  const out=assembleDiagnosticSnapshot(input);
  assert.equal(out.overlay.status,'PARTIAL');
  assert.equal(out.overlay.finalOverall,60);
  assert.equal(out.overlay.penalty,null);
  assert.ok(out.overlay.missing.includes('assetBubbleSafety'));
});

test('overlay applies only downside penalty and respects the 7-point cap',()=>{
  const input=readyInputs();
  for(const key of Object.keys(input.liquidity))input.liquidity[key]=0;
  for(const key of Object.keys(input.assetBubble))input.assetBubble[key]=0;
  for(const key of Object.keys(input.debt))input.debt[key]=0;
  for(const key of Object.keys(input.supply))input.supply[key]=0;
  const out=assembleDiagnosticSnapshot(input);
  assert.equal(out.overlay.status,'READY');
  assert.equal(out.overlay.penalty,7);
  assert.equal(out.overlay.finalOverall,53);
});

test('positive overlay diagnostics never add to Base Overall',()=>{
  const input=readyInputs();
  for(const key of Object.keys(input.liquidity))input.liquidity[key]=100;
  for(const key of Object.keys(input.assetBubble))input.assetBubble[key]=100;
  for(const key of Object.keys(input.debt))input.debt[key]=100;
  for(const key of Object.keys(input.supply))input.supply[key]=100;
  const out=assembleDiagnosticSnapshot(input);
  assert.equal(out.overlay.penalty,0);
  assert.equal(out.overlay.finalOverall,60);
});

test('invalid Base Overall is an overlay ERROR without fabricated output',()=>{
  const input=readyInputs();input.baseOverall=null;
  const out=assembleDiagnosticSnapshot(input);
  assert.equal(out.overlay.status,'ERROR');
  assert.equal(out.overlay.finalOverall,null);
});
