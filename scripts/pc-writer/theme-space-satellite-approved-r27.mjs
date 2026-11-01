// Approved new-theme basket: existing real ETF R2 scores + current dated AUM.
// Read-only PC audit. The 252-day preview describes today's basket against
// historical prices; it does NOT claim these AUM weights existed on past days.
// No new AUM API, provider request, D1 write, scheduler, or public publication.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {runSpaceVariableBasketShadow} from './theme-space-satellite-r18-variable-basket-shadow.mjs';
import {auditApprovedRoster} from './theme-space-satellite-r26-roster-audit.mjs';
import {adaptivePairWeights} from './theme-optional-pair-weight-r3.mjs';

const need=(ok,reason)=>{if(!ok)throw Object.assign(new Error(reason),{code:reason});};
const validDate=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&
 Number.isFinite(Date.parse(value+'T00:00:00Z'))&&
 new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
const round=value=>Number(value.toFixed(5));

// This is a fixed-CURRENT-composition historical comparison, not historical
// AUM reconstruction or an investment backtest. Actual score dates never move.
export function calculateApprovedSpaceBasket({dates,symbols,timelines,observed,
 sessionCounts,aumEvidence,scoreAsOf,window=252,
 historicalSingleContinuity=false}={}){
 need(Array.isArray(dates)&&dates.length>0&&dates.every((date,index)=>
  validDate(date)&&(index===0||dates[index-1]<date))&&
  validDate(scoreAsOf)&&scoreAsOf===dates.at(-1),
 'SPACE_R27_DATES_INVALID');
 need(typeof historicalSingleContinuity==='boolean'&&
  Number.isInteger(window)&&window>0&&
  Array.isArray(symbols)&&symbols.length>=3&&new Set(symbols).size===symbols.length&&
  symbols.every(symbol=>/^[A-Z][A-Z0-9.-]{0,15}$/.test(symbol)&&symbol!=='SPY'),
 'SPACE_R27_APPROVED_ROSTER_INVALID');
 const bySymbol=new Map();
 need(Array.isArray(aumEvidence)&&aumEvidence.length>=symbols.length,
 'SPACE_R27_AUM_EVIDENCE_MISSING');
 for(const row of aumEvidence){
  need(row&&typeof row.symbol==='string'&&!bySymbol.has(row.symbol),
   'SPACE_R27_AUM_SYMBOL_DUPLICATE');
  bySymbol.set(row.symbol,row);
 }
 for(const symbol of symbols){
  const row=bySymbol.get(symbol);
  need(row&&Number.isFinite(row.aumUsd)&&row.aumUsd>0&&validDate(row.aumAsOf)&&
   row.aumAsOf<=scoreAsOf&&/^https:\/\//.test(row.issuerUrl??'')&&
   Array.isArray(timelines?.[symbol])&&timelines[symbol].length===dates.length&&
   observed?.[symbol] instanceof Set&&sessionCounts?.[symbol] instanceof Map,
   'SPACE_R27_SELECTED_INPUT_UNVERIFIED');
 }
 const history=[];
 const start=Math.max(0,dates.length-window);
 for(let i=start;i<dates.length;i++){
  const date=dates[i];
  const present=symbols.flatMap(symbol=>{
   const day=timelines[symbol][i],sessions=sessionCounts[symbol].get(date);
   return observed[symbol].has(date)&&Number.isInteger(sessions)&&sessions>=40&&
    Number.isFinite(day?.score)&&day.score>=0&&day.score<=100&&
    ['ADAPTIVE_PROVISIONAL','R188_COMPATIBLE'].includes(day.status)?
    [{symbol,score:day.score,sessions,status:day.status,aum:bySymbol.get(symbol).aumUsd}]:[];
  });
  let weights=null,status='INSUFFICIENT_REAL_ETF_SCORES';
  if(present.length>=3){
   const total=present.reduce((sum,row)=>sum+row.aum,0);
   need(Number.isFinite(total)&&total>0,'SPACE_R27_AUM_SUM_INVALID');
   weights=Object.fromEntries(present.map(row=>[row.symbol,row.aum/total]));
   status='APPROVED_THREE_PLUS_AUM';
  }else if(present.length===2){
   const [a,b]=present;
   if(a.status==='R188_COMPATIBLE'&&b.status==='R188_COMPATIBLE'&&
    a.sessions>=377&&b.sessions>=377){
    weights={[a.symbol]:0.5,[b.symbol]:0.5};status='EXISTING_PAIR_50_50';
   }else try{
    const pair=adaptivePairWeights({firstSessions:a.sessions,secondSessions:b.sessions,
     firstStatus:a.status,secondStatus:b.status});
    weights={[a.symbol]:pair.first,[b.symbol]:pair.second};
    status='APPROVED_LONG_SHORT_PAIR';
   }catch(error){
    if(error.message!=='THEME_R3_UNAPPROVED_PAIR_OR_INCOMPLETE_SOURCE')throw error;
    status='PAIR_COMBINATION_NOT_SCORABLE';
   }
  }
  // R32 opt-in: a young ETF must not erase actual 1Y observations from a
  // longer-lived approved ETF. Existing R27 default still rejects singles.
  // Also apply when a two-ETF mix is not approved under existing pair rules.
  if(historicalSingleContinuity&&!weights&&present.length>0){
   const chosen=[...present].sort((a,b)=>b.sessions-a.sessions||
    b.aum-a.aum||a.symbol.localeCompare(b.symbol))[0];
   weights={[chosen.symbol]:1};
   status='SINGLE_REAL_ETF_LONGEST_HISTORY_CONTINUITY';
  }
  const score=weights?round(present.reduce((sum,row)=>
   sum+row.score*(weights[row.symbol]??0),0)):null;
  history.push({date,score,status,
   etfs:weights?present.filter(row=>weights[row.symbol]>0).map(row=>row.symbol):[],
   weightsPercent:weights?Object.fromEntries(Object.entries(weights).map(
    ([symbol,weight])=>[symbol,Number((weight*100).toFixed(4))])):null});
 }
 const latest=history.at(-1);
 return {scoreAsOf,latest,history,scoredDays:history.filter(row=>row.score!==null).length,
  windowDays:history.length,etfs:[...symbols],
  weighting:'APPROVED_NORMALIZED_CURRENT_ISSUER_AUM_FOR_THREE_PLUS',
  historicalWeightMode:historicalSingleContinuity?
   'CURRENT_ROSTER_DATE_ELIGIBLE_AUM_WITH_REAL_SINGLE_ETF_HISTORY':
   'CURRENT_BASKET_FIXED_AUM_RETROSPECTIVE_NOT_HISTORICAL_AUM',
  ...(historicalSingleContinuity?{
   historyFallbackPolicy:'LONGEST_VERIFIED_SESSIONS_TIE_CURRENT_AUM'}:{}),
  aumAsOf:Object.fromEntries(symbols.map(symbol=>[symbol,bySymbol.get(symbol).aumAsOf])),
  noPricesFabricated:true,providerCalls:0,d1Writes:0,publicWrites:0,schedulerWrites:0};
}

export function auditApprovedSpaceR27({dataRoot,
 rosterFile=new URL('./theme-space-satellite-r26-approved-roster.json',import.meta.url),
 evidenceFile=new URL('./theme-space-satellite-r23-dated-aum-evidence.json',import.meta.url),
 privateAudit=runSpaceVariableBasketShadow}={}){
 const roster=JSON.parse(fs.readFileSync(rosterFile,'utf8'));
 const evidence=JSON.parse(fs.readFileSync(evidenceFile,'utf8'));
 const approval=auditApprovedRoster(evidence,roster);
 const original=privateAudit({dataRoot,includePrivateTrace:true});
 need(original.report==='SPACE_SATELLITE_R18_PC_PRIVATE_VARIABLE_BASKET_SHADOW'&&
  original.sourceManifestSha256===evidence.sourceManifestSha256&&
  original.sharedSpyManifestSha256===evidence.spyManifestSha256&&
  original.shadowHistorySha256===evidence.r18HistorySha256&&
  original.benchmarkLastDate===evidence.scoreAsOf,
 'SPACE_R27_PC_EVIDENCE_DRIFT');
 const trace=original.privateTrace;
 need(trace?.dates?.at(-1)===evidence.scoreAsOf,'SPACE_R27_PC_TRACE_MISSING');
 const actual=calculateApprovedSpaceBasket({dates:trace.dates,
  symbols:approval.approvedCurrentSymbols,timelines:trace.timelines,
  observed:Object.fromEntries(approval.approvedCurrentSymbols.map(symbol=>[
   symbol,new Set(trace.dates.filter((date,index)=>
    trace.timelines?.[symbol]?.[index]?.score!==null&&
    // R18 trace has actual session count only on observed original bars; use
    // original R18 active membership for today and per-day raw completeness.
    original.privateTrace.history?.some(row=>row.date===date&&row.active.includes(symbol))))])),
  sessionCounts:trace.sessionCounts,aumEvidence:evidence.rows,
  scoreAsOf:evidence.scoreAsOf});
 need(actual.latest.etfs.join(',')===approval.approvedCurrentSymbols.join(',')&&
  Math.abs(actual.latest.score-approval.privateScore)<0.00002,
 'SPACE_R27_APPROVED_CURRENT_SCORE_MISMATCH');
 return {report:'SPACE_SATELLITE_R27_APPROVED_PRIVATE_BASKET',
  status:'APPROVED_BASKET_PRIVATE_SCORE_VERIFIED',
  sourceManifestSha256:evidence.sourceManifestSha256,
  sharedSpyManifestSha256:evidence.spyManifestSha256,
  ...actual,selectionApproved:true,publicationCompleted:false};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv.slice(2).join(' ')!=='--audit'){
  console.log('Usage: theme-space-satellite-approved-r27.mjs --audit (read only)');
 }else try{
  const result=auditApprovedSpaceR27({dataRoot:process.env.ZGMINI_DATA_ROOT??'E:/ZGmini/data'});
  console.log(JSON.stringify(result,null,2));
 }catch(error){
  console.error(JSON.stringify({report:'SPACE_SATELLITE_R27_APPROVED_PRIVATE_BASKET',
   status:'AUDIT_FAILED',reason:error.code??error.message,
   providerCalls:0,d1Writes:0,publicWrites:0,schedulerWrites:0}));
  process.exitCode=1;
 }
}
