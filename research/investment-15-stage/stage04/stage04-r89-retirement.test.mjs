import test from 'node:test';
import assert from 'node:assert/strict';
import {access,readFile} from 'node:fs/promises';

const retired=[
  './investment-bot-gate-readonly.mjs',
  './industry-quant-coverage-readonly.mjs',
  './industry-evidence-fairness-readonly.mjs',
  './sentiment-industry-contrast-readonly.mjs',
  './unified-industry-series-readonly.mjs',
  './common-source-gate-readonly.mjs',
  './stage04-r88-existing-results-bridge.mjs',
  '../stage04-r68/stage04-r68-matrix.mjs',
  '../stage04-r69/stage04-r69-reconcile-history.mjs',
  '../stage05/stage05-industry-series-research.mjs',
  '../stage05/stage05-existing-evidence-bridge.mjs',
];

test('R89 retired industry-actual collectors and calculations cannot run',async()=>{
  for(const relative of retired){
    await assert.rejects(access(new URL(relative,import.meta.url)),
      {code:'ENOENT'},relative);
  }
});

test('R89 final Stage04 numeric adapter does not require actual YoY/acceleration/M4',async()=>{
  const source=await readFile(new URL('./stage04-r86-numeric-bridge.mjs',import.meta.url),'utf8');
  assert.doesNotMatch(source,/industry_actual_growth_g:|industry_acceleration_g2:|attractiveness_m4:|COMPARABLE_REALIZED_INDUSTRY_SERIES_FOR_G1_G2|APPROVED_STAGE04_G_D_M4_FORMULA/);
  assert.match(source,/USER_FINAL_THEME_APPROVAL/);
  assert.match(source,/NO_TRADE/);
});

test('R67 retained publisher CAGR research does not synthesize a percentile-F gap',async()=>{
  const source=await readFile(new URL('../stage04-r67/forecast-sentiment-r67.mjs',import.meta.url),'utf8');
  assert.doesNotMatch(source,/growth_peer_percentile|growth_sentiment_gap|positive_gap|applyPeerPercentiles/);
  assert.match(source,/average_cagr_pct/);
});
