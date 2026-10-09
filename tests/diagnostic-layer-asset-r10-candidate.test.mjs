import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ASSET_BUBBLE_R10_WEIGHTS,
  scoreAssetBubbleR10Candidate,
  buildR10SpeculativeFlowCandidate,
} from '../lib/diagnostic-layer/asset-bubble-r10-candidate.mjs';

test('R10 candidate weights total exactly 1 and do not modify R9', () => {
  assert.equal(Object.values(ASSET_BUBBLE_R10_WEIGHTS).reduce((s, w) => s + w, 0), 1);
  const result = scoreAssetBubbleR10Candidate(Object.fromEntries(
    Object.keys(ASSET_BUBBLE_R10_WEIGHTS).map(id => [id, 60]),
  ));
  assert.equal(result.status, 'READY');
  assert.ok(Math.abs(result.score - 60) < 1e-10);
});
test('missing breadth remains PARTIAL and is never reweighted', () => {
  const input = Object.fromEntries(Object.keys(ASSET_BUBBLE_R10_WEIGHTS).map(id => [id, 70]));
  input.breadthDivergence = null;
  const result = scoreAssetBubbleR10Candidate(input);
  assert.equal(result.status, 'PARTIAL');
  assert.equal(result.score, null);
  assert.deepEqual(result.missing, ['breadthDivergence']);
});
test('R10 uses signed annualized quarter flows divided by four, not absolute values', () => {
  const result = buildR10SpeculativeFlowCandidate({
    transactionRows: [
      {quarter:'2025-Q2',value:40},
      {quarter:'2025-Q3',value:-20},
      {quarter:'2025-Q4',value:40},
      {quarter:'2026-Q1',value:20},
    ],
    holdingsRows:[{quarter:'2025-Q1',value:400}],
    priceAccelerationQuarterRows:[{quarter:'2026-Q1',priceAccelRaw:0.2}],
  });
  assert.equal(result.status, 'READY_CURRENT_VINTAGE');
  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0].annualFlow, 20);
  assert.equal(result.rows[0].positiveInflowRatio, 0.05);
  assert.equal(result.rows[0].score, 50);
  assert.equal(result.lookAheadSafe, false);
});
test('nonpositive price acceleration gates speculative score to 100', () => {
  const result = buildR10SpeculativeFlowCandidate({
    transactionRows: ['2025-Q2','2025-Q3','2025-Q4','2026-Q1'].map(quarter=>({quarter,value:30})),
    holdingsRows:[{quarter:'2025-Q1',value:200}],
    priceAccelerationQuarterRows:[{quarter:'2026-Q1',priceAccelRaw:-0.01}],
  });
  assert.equal(result.rows[0].score, 100);
});
test('negative four-quarter net flow is not counted as positive speculative inflow', () => {
  const result = buildR10SpeculativeFlowCandidate({
    transactionRows: ['2025-Q2','2025-Q3','2025-Q4','2026-Q1'].map(quarter=>({quarter,value:-40})),
    holdingsRows:[{quarter:'2025-Q1',value:200}],
    priceAccelerationQuarterRows:[{quarter:'2026-Q1',priceAccelRaw:0.2}],
  });
  assert.equal(result.rows[0].annualFlow, -40);
  assert.equal(result.rows[0].positiveInflowRatio, 0);
});
test('missing transaction quarter, holdings or price acceleration prevents score', () => {
  const transactions = ['2025-Q2','2025-Q3','2025-Q4','2026-Q1'].map(quarter=>({quarter,value:30}));
  const holdingsRows = [{quarter:'2025-Q1',value:200}];
  assert.equal(buildR10SpeculativeFlowCandidate({transactionRows:transactions.slice(1),holdingsRows}).rows.length,0);
  assert.equal(buildR10SpeculativeFlowCandidate({transactionRows:transactions}).rows.length,0);
  const noPrice = buildR10SpeculativeFlowCandidate({transactionRows:transactions,holdingsRows});
  assert.equal(noPrice.status,'PARTIAL');
  assert.equal(noPrice.rows[0].score,null);
});
test('contradictory duplicate quarters fail rather than silently overwrite', () => {
  assert.throws(() => buildR10SpeculativeFlowCandidate({
    transactionRows:[{quarter:'2025-Q2',value:1},{quarter:'2025-Q2',value:2}],
  }), /DUPLICATE_QUARTER_CONFLICT/);
});
