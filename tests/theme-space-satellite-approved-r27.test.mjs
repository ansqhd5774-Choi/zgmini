import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateApprovedSpaceBasket,auditApprovedSpaceR27} from
 '../scripts/pc-writer/theme-space-satellite-approved-r27.mjs';

const dates=['2026-10-21','2026-10-22','2026-10-23'];
const symbols=['UFO','NASA','WARP','ROKT'];
const latest={UFO:34.88492,NASA:48.90703,WARP:60.5265,ROKT:44.09211};
const aums={UFO:466592647.3,NASA:950551499,WARP:37400000,ROKT:148410000};
const evidence=symbols.map(symbol=>({symbol,aumUsd:aums[symbol],
 aumAsOf:symbol==='WARP'?'2026-10-23':'2026-10-22',
 issuerUrl:'https://issuer.example/'+symbol}));
function fixture(){
 return {dates,symbols,scoreAsOf:dates.at(-1),aumEvidence:evidence,
  timelines:Object.fromEntries(symbols.map(symbol=>[symbol,dates.map(date=>({
   date,score:latest[symbol],status:'R188_COMPATIBLE'}))])),
  observed:Object.fromEntries(symbols.map(symbol=>[symbol,new Set(dates)])),
  sessionCounts:Object.fromEntries(symbols.map(symbol=>[symbol,new Map(dates.map(date=>
   [date,700]))]))};
}
test('approved four-symbol AUM current score reproduces 44.65075 without any API',()=>{
 const out=calculateApprovedSpaceBasket(fixture());
 assert.equal(out.latest.score,44.65075);
 assert.deepEqual(out.latest.etfs,symbols);
 assert.equal(out.latest.status,'APPROVED_THREE_PLUS_AUM');
 assert.equal(out.windowDays,3);
 assert.equal(out.scoredDays,3);
 assert.equal(out.historicalWeightMode,
  'CURRENT_BASKET_FIXED_AUM_RETROSPECTIVE_NOT_HISTORICAL_AUM');
 assert.equal(out.providerCalls+out.d1Writes+out.publicWrites+out.schedulerWrites,0);
});
test('missing actual prices are not filled; two existing mature ETFs stay 50:50',()=>{
 const args=fixture();
 for(const symbol of ['NASA','WARP'])args.observed[symbol]=new Set([dates[2]]);
 const out=calculateApprovedSpaceBasket(args);
 assert.equal(out.history[0].status,'EXISTING_PAIR_50_50');
 assert.equal(out.history[0].score,Number(((latest.UFO+latest.ROKT)/2).toFixed(5)));
 assert.deepEqual(out.history[0].etfs,['UFO','ROKT']);
 assert.equal(out.latest.etfs.length,4);
});
test('one real ETF stays missing and no zero is synthesized',()=>{
 const args=fixture();
 for(const symbol of ['NASA','WARP','ROKT'])args.observed[symbol]=new Set([dates[2]]);
 const out=calculateApprovedSpaceBasket(args);
 assert.equal(out.history[0].score,null);
 assert.deepEqual(out.history[0].etfs,[]);
});
test('R32 1Y continuity uses only actual ETF observations and preserves current four-ETF score',()=>{
 const args=fixture();
 for(const symbol of ['NASA','WARP','ROKT'])args.observed[symbol]=new Set([dates[2]]);
 const old=calculateApprovedSpaceBasket(args);
 const next=calculateApprovedSpaceBasket({...args,historicalSingleContinuity:true});
 assert.equal(old.history[0].score,null);
 assert.equal(next.history[0].score,latest.UFO);
 assert.equal(next.history[0].status,'SINGLE_REAL_ETF_LONGEST_HISTORY_CONTINUITY');
 assert.deepEqual(next.history[0].etfs,['UFO']);
 assert.deepEqual(next.history[0].weightsPercent,{UFO:100});
 assert.equal(next.scoredDays,3);
 assert.equal(next.latest.score,44.65075);
 assert.deepEqual(next.latest.etfs,symbols);
 assert.equal(next.historyFallbackPolicy,'LONGEST_VERIFIED_SESSIONS_TIE_CURRENT_AUM');
});
test('R32 leaves unobserved dates null and selects longest verified ETF on unapproved pair',()=>{
 const args=fixture();
 args.observed.UFO=new Set([dates[0],dates[2]]);
 args.observed.NASA=new Set();args.observed.WARP=new Set();
 args.observed.ROKT=new Set([dates[1],dates[2]]);
 args.sessionCounts.UFO=new Map(dates.map((d,i)=>[d,650+i]));
 args.sessionCounts.ROKT=new Map(dates.map((d,i)=>[d,400+i]));
 args.timelines.ROKT=args.timelines.ROKT.map(v=>({...v,status:'ADAPTIVE_PROVISIONAL'}));
 const out=calculateApprovedSpaceBasket({...args,historicalSingleContinuity:true});
 assert.equal(out.history[0].score,latest.UFO);
 assert.equal(out.history[1].score,latest.ROKT);
 assert.deepEqual(out.history[1].etfs,['ROKT']);
 assert.equal(out.history[2].score,latest.UFO);
 assert.deepEqual(out.history[2].etfs,['UFO']);
});
test('R32 full 252-date mixed-maturity history never shrinks to youngest ETF',()=>{
 const year=Array.from({length:252},(_,i)=>new Date(
  Date.parse('2026-02-14T00:00:00Z')+i*86400000).toISOString().slice(0,10));
 const firstScoreDay={UFO:0,ROKT:119,NASA:147,WARP:173};
 const args={dates:year,symbols,scoreAsOf:year.at(-1),aumEvidence:evidence,
  timelines:Object.fromEntries(symbols.map(symbol=>[symbol,year.map(date=>({
   date,score:latest[symbol],status:symbol==='UFO'? 'R188_COMPATIBLE':
    'ADAPTIVE_PROVISIONAL'}))])),
  observed:Object.fromEntries(symbols.map(symbol=>[symbol,new Set(
   year.slice(firstScoreDay[symbol]))])),
  sessionCounts:Object.fromEntries(symbols.map(symbol=>[symbol,new Map(
   year.map((date,i)=>[date,i+405]))]))};
 const old=calculateApprovedSpaceBasket(args);
 const out=calculateApprovedSpaceBasket({...args,historicalSingleContinuity:true});
 assert.equal(old.scoredDays,105);
 assert.equal(out.windowDays,252);
 assert.equal(out.scoredDays,252);
 assert.deepEqual(out.history[0].etfs,['UFO']);
 assert.equal(out.history[0].score,latest.UFO);
 assert.equal(out.history[146].score,latest.UFO);
 assert.equal(out.latest.score,old.latest.score);
 assert.equal(out.latest.score,44.65075);
});
test('future AUM, duplicate ETF, and absent source metadata fail closed',()=>{
 const args=fixture();
 assert.throws(()=>calculateApprovedSpaceBasket({...args,
  aumEvidence:args.aumEvidence.map(row=>row.symbol==='WARP'?{
   ...row,aumAsOf:'2026-10-24'}:row)}),/SPACE_R27_SELECTED_INPUT_UNVERIFIED/);
 assert.throws(()=>calculateApprovedSpaceBasket({...args,
  symbols:['UFO','NASA','NASA','ROKT']}),/SPACE_R27_APPROVED_ROSTER_INVALID/);
 assert.throws(()=>calculateApprovedSpaceBasket({...args,
  aumEvidence:args.aumEvidence.slice(0,3)}),/SPACE_R27_AUM_EVIDENCE_MISSING/);
});
test('approved roster and existing PC provenance can be verified without reads of unrelated ETFs',()=>{
 const args=fixture();
 const sourceManifestSha256='1e046a0487548a00231da92da48c6d9fb690e8e95bba64e2071078b02e57f00b';
 const sharedSpyManifestSha256='76dfaca72fd0ded5e648ee15cceca5628288c11463214bd14ede01c2b5c4746e';
 const shadowHistorySha256='94011b38f4d31cf21b74eac36b988a0a2565c34bf2b2e5522dc27106ac4d1216';
 const out=auditApprovedSpaceR27({privateAudit:()=>({
  report:'SPACE_SATELLITE_R18_PC_PRIVATE_VARIABLE_BASKET_SHADOW',
  sourceManifestSha256,sharedSpyManifestSha256,shadowHistorySha256,
  benchmarkLastDate:dates.at(-1),
  privateTrace:{dates,timelines:args.timelines,sessionCounts:args.sessionCounts,
   history:dates.map(date=>({date,active:symbols}))}})});
 assert.equal(out.status,'APPROVED_BASKET_PRIVATE_SCORE_VERIFIED');
 assert.equal(out.latest.score,44.65075);
 assert.equal(out.publicationCompleted,false);
});
