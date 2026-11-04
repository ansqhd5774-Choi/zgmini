import test from 'node:test';
import assert from 'node:assert/strict';
import {scoreER1Issuers} from '../lib/market-calendar-er1-earnings-score.mjs';
import {makeER1PublicDisplay} from '../lib/market-calendar-er1-public-display.mjs';
import {earningsDisplaySnapshot,earningsDisplayHtml} from '../lib/earnings-api-display.mjs';
import {NOV2026_ER1_PUBLIC_KEY} from '../lib/market-calendar-nov2026-display.mjs';

const dates=Array.from({length:14},(_,i)=>new Date(Date.parse('2026-10-28T00:00:00Z')+i*86400000).toISOString().slice(0,10));
const event=(date)=>({date,ticker:'X0',company:'Example X0',marketSession:'after_market',time:null,
  verification:'VENDOR_UNVERIFIED',source:'earnings-api'});
const snap=earningsDisplaySnapshot({status:'READY_PRIVATE',scope:'PC_PRIVATE',publicDisplay:false,
  redistribution:false,publicationStatus:'HELD_UNCONFIRMED',checkedAt:'2026-10-28T10:00:00Z',
  coveredDays:dates,events:[event('2026-10-30'),event('2026-11-02')],recordCount:2,priorityCount:0});
const rows=reverse=>Array.from({length:20},(_,i)=>({issuerId:`X${i}`,tickers:[`X${i}`],
  earningsSymbol:`X${i}`,releases:[{date:'2026-10-15',symbol:`X${i}`,eps:1,revenue:reverse?20-i:i+1}]}));

test('November derived cohort selects only November while October retains prior cohort',()=>{
  const prior=makeER1PublicDisplay(scoreER1Issuers(rows(false),{asOf:'2026-11-01'}));
  const november=makeER1PublicDisplay(scoreER1Issuers(rows(true),{asOf:'2026-11-01'}));
  const priorScore=prior.scores.find(x=>x.issuerId==='X0').score;
  const novScore=november.scores.find(x=>x.issuerId==='X0').score;
  assert.notEqual(priorScore,novScore,'test cohorts must distinguish scores');
  assert.equal(NOV2026_ER1_PUBLIC_KEY,'market-calendar:earnings-nov2026-er1-score-public');
  const oct=earningsDisplayHtml(snap,{start:'2026-10-30',end:'2026-10-30'},prior,null,november);
  const nov=earningsDisplayHtml(snap,{start:'2026-11-02',end:'2026-11-02'},prior,null,november);
  assert.match(oct.html,new RegExp(`기업 실적 점수 ${priorScore.toFixed(2)}점`));
  assert.match(nov.html,new RegExp(`기업 실적 점수 ${novScore.toFixed(2)}점`));
  assert.doesNotMatch(oct.html,new RegExp(`기업 실적 점수 ${novScore.toFixed(2)}점`));
  assert.doesNotMatch(nov.html,new RegExp(`기업 실적 점수 ${priorScore.toFixed(2)}점`));
  const missing=earningsDisplayHtml(snap,{start:'2026-11-02',end:'2026-11-02'},prior,null,null);
  assert.match(missing.html,/aria-label="기업 실적 점수 없음">-<\/div>/,
    'explicit missing November cohort must not silently reuse the October grade');
  const notYetEnabled=earningsDisplayHtml(snap,{start:'2026-11-02',end:'2026-11-02'},prior);
  assert.match(notYetEnabled.html,new RegExp(`기업 실적 점수 ${priorScore.toFixed(2)}점`),
    'existing reader behavior is preserved until November cohort rollout');
  const malformed=earningsDisplayHtml(snap,{start:'2026-11-02',end:'2026-11-02'},prior,null,
    {...november,asOf:'2030-01-01'});
  assert.match(malformed.html,/aria-label="기업 실적 점수 없음">-<\/div>/,
    'rejected future snapshot must not leak an older October score');
  const afterFirstRelease=earningsDisplayHtml(snap,{start:'2026-11-02',end:'2026-11-02'},prior,null,
    {...november,asOf:'2026-11-04'});
  assert.match(afterFirstRelease.html,/aria-label="기업 실적 점수 없음">-<\/div>/,
    'post-event November cohort must not rewrite pre-event ratings');
});

test('December score selection is unchanged by November cohort',()=>{
  const day=Array.from({length:14},(_,i)=>new Date(Date.parse('2026-11-27T00:00:00Z')+i*86400000).toISOString().slice(0,10));
  const future=earningsDisplaySnapshot({status:'READY_PRIVATE',scope:'PC_PRIVATE',publicDisplay:false,
    redistribution:false,publicationStatus:'HELD_UNCONFIRMED',checkedAt:'2026-11-27T10:00:00Z',
    coveredDays:day,events:[event('2026-11-30'),event('2026-12-03')],recordCount:2,priorityCount:0});
  const prior=makeER1PublicDisplay(scoreER1Issuers(rows(false),{asOf:'2026-11-01'}));
  const december=makeER1PublicDisplay(scoreER1Issuers(rows(true),{asOf:'2026-11-01'}));
  const novemberScore=prior.scores.find(x=>x.issuerId==='X0').score;
  const decemberScore=december.scores.find(x=>x.issuerId==='X0').score;
  const nov=earningsDisplayHtml(future,{start:'2026-11-30',end:'2026-11-30'},prior,december,prior);
  const dec=earningsDisplayHtml(future,{start:'2026-12-03',end:'2026-12-03'},prior,december,prior);
  assert.match(nov.html,new RegExp(`기업 실적 점수 ${novemberScore.toFixed(2)}점`));
  assert.match(dec.html,new RegExp(`기업 실적 점수 ${decemberScore.toFixed(2)}점`));
});
