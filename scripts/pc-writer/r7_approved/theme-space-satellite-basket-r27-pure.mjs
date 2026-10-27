// Original unmodified function body extracted from approved R27, private-only.
import {adaptivePairWeights} from './theme-optional-pair-weight-r3.mjs';
const need=(ok,reason)=>{if(!ok)throw Object.assign(new Error(reason),{code:reason});};
const validDate=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
const round=value=>Number(value.toFixed(5));

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
