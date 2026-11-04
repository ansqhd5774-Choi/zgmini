import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {scoreER1Issuers} from '../lib/market-calendar-er1-earnings-score.mjs';
import {makeER1PublicDisplay} from '../lib/market-calendar-er1-public-display.mjs';
import {earningsDisplaySnapshot,earningsDisplayHtml} from '../lib/earnings-api-display.mjs';
import {NOV2026_ER1_PUBLIC_KEY} from '../lib/market-calendar-nov2026-display.mjs';

const event=date=>({date,ticker:'X0',company:'Example X0',marketSession:'after_market',time:null,
 verification:'VENDOR_UNVERIFIED',source:'earnings-api'});
const rolling=(from,events)=>{
 const coveredDays=Array.from({length:14},(_,i)=>new Date(Date.parse(from+'T00:00:00Z')+i*86400000).toISOString().slice(0,10));
 return earningsDisplaySnapshot({status:'READY_PRIVATE',scope:'PC_PRIVATE',publicDisplay:false,
  redistribution:false,publicationStatus:'HELD_UNCONFIRMED',checkedAt:from+'T10:00:00Z',
  coveredDays,events:events.map(event),recordCount:events.length,priorityCount:0});
};
const rows=reverse=>Array.from({length:20},(_,i)=>({issuerId:`X${i}`,tickers:[`X${i}`],
 earningsSymbol:`X${i}`,releases:[{date:'2026-10-15',symbol:`X${i}`,eps:1,
  revenue:reverse?20-i:i+1}]}));
const make=reverse=>makeER1PublicDisplay(scoreER1Issuers(rows(reverse),{asOf:'2026-11-04'}));
const grade=(html,score)=>assert.match(html,new RegExp(`기업 실적 점수 ${score.toFixed(2)}점`));
const missing=html=>assert.match(html,/aria-label="기업 실적 점수 없음">-<\/div>/);

test('November PIT protects elapsed and same-day events while scoring upcoming ones',()=>{
 const snap=rolling('2026-10-28',['2026-10-30','2026-11-02','2026-11-04','2026-11-06']);
 const prior=make(false),november=make(true);
 const priorScore=prior.scores.find(x=>x.issuerId==='X0').score;
 const novScore=november.scores.find(x=>x.issuerId==='X0').score;
 assert.notEqual(priorScore,novScore,'cohorts must distinguish scores');
 assert.equal(NOV2026_ER1_PUBLIC_KEY,'market-calendar:earnings-nov2026-er1-score-public');
 grade(earningsDisplayHtml(snap,{start:'2026-10-30',end:'2026-10-30'},prior,null,november).html,priorScore);
 missing(earningsDisplayHtml(snap,{start:'2026-11-02',end:'2026-11-02'},prior,null,november).html);
 missing(earningsDisplayHtml(snap,{start:'2026-11-04',end:'2026-11-04'},prior,null,november).html);
 const upcoming=earningsDisplayHtml(snap,{start:'2026-11-06',end:'2026-11-06'},prior,null,november).html;
 grade(upcoming,novScore);
 assert.doesNotMatch(upcoming,new RegExp(`기업 실적 점수 ${priorScore.toFixed(2)}점`));
 const filtered=earningsDisplayHtml(snap,{start:'2026-11-02',end:'2026-11-06',importance:3},prior,null,november);
 assert.equal(filtered.count,novScore>=97?1:0,'★★★ filter includes only eligible future ratings');
});

test('Missing or invalid November cohort never falls back to October score, including a legacy 3-arg call',()=>{
 const snap=rolling('2026-10-28',['2026-11-06']),prior=make(false),november=make(true);
 for(const candidate of [null,{...november,asOf:'2030-01-01'}]){
  missing(earningsDisplayHtml(snap,{start:'2026-11-06',end:'2026-11-06'},prior,null,candidate).html);
 }
 missing(earningsDisplayHtml(snap,{start:'2026-11-06',end:'2026-11-06'},prior).html);
});

test('December score selection remains separate from November',()=>{
 const snap=rolling('2026-11-27',['2026-11-30','2026-12-03']);
 const prior=make(false),december=make(true);
 const novScore=prior.scores.find(x=>x.issuerId==='X0').score;
 const decScore=december.scores.find(x=>x.issuerId==='X0').score;
 grade(earningsDisplayHtml(snap,{start:'2026-11-30',end:'2026-11-30'},prior,december,prior).html,novScore);
 grade(earningsDisplayHtml(snap,{start:'2026-12-03',end:'2026-12-03'},prior,december,prior).html,decScore);
});

test('actual API route reads the November key separately and sends it to the ER1 reader',()=>{
 const route=readFileSync(new URL('../app/api/earnings-calendar-display/route.ts',import.meta.url),'utf8');
 assert.match(route,/NOV2026_ER1_PUBLIC_KEY,withNov2026Display/);
 assert.match(route,/store\.readOutput\(NOV2026_ER1_PUBLIC_KEY\)/);
 assert.match(route,/request\.url,er1,decemberER1,novemberER1\)/);
 assert.match(route,/store\.readOutput\(ER1_EARNINGS_DISPLAY_PUBLIC_KEY\)/);
 assert.match(route,/store\.readOutput\(DEC2026_ER1_PUBLIC_KEY\)/);
});
