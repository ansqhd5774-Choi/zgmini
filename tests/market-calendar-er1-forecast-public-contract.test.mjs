import test from 'node:test';
import assert from 'node:assert/strict';
import {scoreER1ForecastIssuers,FORECAST_METHOD} from '../lib/market-calendar-er1-forecast-score.mjs';
import {makeER1PublicDisplay,validateER1PublicDisplay} from '../lib/market-calendar-er1-public-display.mjs';
import {ER1_METHOD,ER1_STAR3_THRESHOLD} from '../lib/market-calendar-er1-earnings-score.mjs';

const asOf='2026-11-06';
const forecast=()=>scoreER1ForecastIssuers([
  {issuerId:'GOOD',tickers:['GOOD'],earningsSymbol:'GOOD',
   releases:[{symbol:'GOOD',date:'2026-11-20',epsEstimate:1,revenueEstimate:100}]},
  {issuerId:'MISSING',tickers:['MISSING'],earningsSymbol:'MISSING',
   releases:[{symbol:'MISSING',date:'2026-11-21',epsEstimate:null,revenueEstimate:null}]}
],{asOf});

test('forecast derived public contract has no raw predicted or actual earnings',()=>{
  const out=makeER1PublicDisplay(forecast());
  assert.equal(out.method,FORECAST_METHOD);
  assert.equal(out.recordCount,1);
  assert.equal(out.coverage.observedIssuers,2);
  assert.equal(validateER1PublicDisplay(out)?.index.get('GOOD'),out.scores[0].score);
  assert.equal(validateER1PublicDisplay(out)?.index.has('MISSING'),false);
  assert.equal(JSON.stringify(out).includes('epsEstimate'),false);
  assert.equal(JSON.stringify(out).includes('revenueEstimate'),false);
  assert.equal(JSON.stringify(out).includes('"releases"'),false);
});

test('actual-only snapshot contract still works',()=>{
  const old={status:'READY_ER1_PUBLIC',method:ER1_METHOD,asOf,
   threshold:ER1_STAR3_THRESHOLD,
   coverage:{inputSymbols:1,observedIssuers:1,scoreableIssuers:1,unscoreableReasons:{}},
   recordCount:1,star3Count:0,scores:[{issuerId:'LEGACY',tickers:['LEGACY'],score:65}]};
  assert.equal(validateER1PublicDisplay(old)?.index.get('LEGACY'),65);
  assert.equal(validateER1PublicDisplay({...old,method:'NOT_VALID'}),null);
});
