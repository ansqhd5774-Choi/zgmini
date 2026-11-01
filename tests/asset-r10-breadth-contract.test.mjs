import test from 'node:test';
import assert from 'node:assert/strict';
import { pairedBreadthScore } from '../lib/market-score/asset-r10-breadth-contract.mjs';
test('B does not score before 252 paired observations', () => {
  assert.equal(pairedBreadthScore(Array(251).fill(0), Array(251).fill(.5)), null);
});
test('B falls when index return rises while participation falls', () => {
  const returns = Array(251).fill(0).concat(1);
  const breadth = Array(251).fill(.5).concat(.1);
  assert.ok(pairedBreadthScore(returns, breadth).score < 1);
});
test('tied ranks are neutral and increasing participation does not invent risk', () => {
  assert.equal(pairedBreadthScore(Array(252).fill(0), Array(252).fill(.5)).score, 100);
  assert.equal(pairedBreadthScore(Array(251).fill(0).concat(-1), Array(251).fill(.5).concat(.8)).score, 100);
});
test('missing, out of range and unpaired input is rejected', () => {
  assert.throws(() => pairedBreadthScore([0], []), /UNPAIRED/);
  assert.throws(() => pairedBreadthScore([0], [null]), /INVALID/);
  assert.throws(() => pairedBreadthScore([0], [1.1]), /INVALID/);
});
