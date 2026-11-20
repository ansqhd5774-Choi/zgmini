// Stored-data-only common calculator. Approved formula functions are reused verbatim.
import {adaptivePairWeights} from './theme-optional-pair-weight-r3.mjs';
import {scoreOneR25} from './theme-r25-pure.mjs';
import {mixNineR32Date} from './theme-r32-pure.mjs';
import {calculateApprovedSpaceBasket} from './theme-space-basket-pure.mjs';
import {scoreAll252} from './theme-optional-score-r188.mjs';
import {scoreAdaptiveTimeline} from './theme-optional-adaptive-r2.mjs';
import {PAID_HOURLY_MODE} from './theme-paid-hourly-source.mjs';
export {PAID_THEME_KEY,PAID_THEME_VERSION} from '../../worker/theme-paid-contract.mjs';
import {PAID_THEME_KEY,PAID_THEME_VERSION} from '../../worker/theme-paid-contract.mjs';
const need=(ok,c)=>{if(!ok)throw Object.assign(Error(c),{code:c});};
const score=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=100;
export function choosePaidPhaseDates(spy,{now=Date.now(),confirmedLagHours=48,provisionalLagHours=24}={}){
 need(Array.isArray(spy)&&spy.length&&Number.isSafeInteger(now),'PAID_THEME_CLOCK_OR_SPY');
 const eligible=hours=>spy.filter(p=>Number.isFinite(Date.parse(p.timestamp))&&Date.parse(p.timestamp)+3600000+hours*3600000<=now).at(-1)?.date;
 const confirmed=eligible(confirmedLagHours),provisional=eligible(provisionalLagHours);
 need(confirmed&&provisional&&confirmed<=provisional,'PAID_THEME_PHASE_SOURCE_NOT_READY');
 return {confirmed,provisional,sourceLatest:spy.at(-1).date,confirmedLagHours,provisionalLagHours,clockBasis:'ACTUAL_NY_PROXY_BAR_END'};
}
export function mergePublishedThemeHistory(previous,calculated,through,{window=252}={}){
 const old=previous?.history??[];need(Array.isArray(old)&&old.every((p,i)=>typeof p.date==='string'&&score(p.score)&&(!i||p.date>old[i-1].date)),'PAID_THEME_PRIOR_HISTORY_INVALID');
 const cutoff=old.at(-1)?.date??'',byDate=new Map(old.filter(p=>p.date<=through).map(p=>[p.date,{date:p.date,score:p.score}]));
 for(const p of calculated)if(p.date>cutoff&&p.date<=through&&score(p.score))byDate.set(p.date,{date:p.date,score:p.score});
 return [...byDate.values()].sort((a,b)=>a.date.localeCompare(b.date)).slice(-window);
}
export function calculatePaidThemes({registry,aumByTheme,series,previousThemes=[],phases,sourceStoredAt,registrySha256,sourceVersion,now=Date.now()}={}){
 const spy=(series.SPY??[]).filter(p=>p.date<=phases.provisional);need(spy.length>=40,'PAID_THEME_SPY_SHORT');const spyDays=new Set(spy.map(p=>p.date));
 const confirmedSpy=spy.filter(p=>p.date<=phases.confirmed),firstConfirmed=confirmedSpy.slice(-252)[0]?.date;
 const scoringDays=spy.filter(p=>p.date>=firstConfirmed),spaceSymbols=new Set(registry.themes.filter(t=>t.methodologyVersion==='ETF_ONLY_T40_R20_V40_ADAPTIVE_R2_AUM_DATE_ELIGIBLE_SINGLE_R32').flatMap(t=>t.etfs));
 const perSymbol=new Map(),rawTimelines=new Map(),observed={},sessionCounts={};
 const symbols=[...new Set(registry.themes.filter(t=>t.enabled).flatMap(t=>t.etfs))];
 for(const symbol of symbols){
  const own=(series[symbol]??[]).filter(p=>spyDays.has(p.date)),byDate=new Map(own.map(p=>[p.date,p.close]));
  const individual=scoreOneR25({symbol,spySessions:spy,ownSessions:own});
  const confirmed=scoreOneR25({symbol,spySessions:confirmedSpy,ownSessions:own.filter(p=>p.date<=phases.confirmed)});
  perSymbol.set(symbol,new Map([...confirmed.history,...individual.history].map(p=>[p.date,p])));
  observed[symbol]=new Set(own.map(p=>p.date));let count=0;sessionCounts[symbol]=new Map(spy.map(p=>{if(byDate.has(p.date))count++;return [p.date,count];}));
  if(spaceSymbols.has(symbol))rawTimelines.set(symbol,scoreAdaptiveTimeline(spy.map(p=>({date:p.date,own:byDate.get(p.date)??null,spy:p.close}))));
 }
 const previous=new Map(previousThemes.map(t=>[t.id??t.theme,t]));const results=[],publicThemes=[],privateResults=[];
 const points=new Map();
 for(const t of registry.themes.filter(t=>t.enabled)){
  try{
   const money=new Map((aumByTheme[t.id]??[]).map(r=>[r.ticker??r.symbol,r]));let calculated;
   if(t.methodologyVersion==='ETF_ONLY_T40_R20_V40_PAIR50'){
    need(t.etfs.length===2,'PAID_THEME_PAIR_ROSTER');
    const maps=t.etfs.map(s=>new Map((series[s]??[]).map(p=>[p.date,p.close])));
    const valuesThrough=through=>{const common=spy.filter(p=>p.date<=through&&maps.every(m=>m.has(p.date))).slice(-628);need(common.length===628,'PAID_THEME_PAIR_628_REAL_SESSIONS');
     const values=maps.map(m=>scoreAll252(common.map(p=>m.get(p.date)),common.map(p=>p.close)));
     return common.slice(-252).map((p,i)=>({date:p.date,score:Number(((values[0][i]+values[1][i])/2).toFixed(5))}));};
    calculated=[...new Map([...valuesThrough(phases.confirmed),...valuesThrough(phases.provisional)].map(p=>[p.date,p])).values()].sort((a,b)=>a.date.localeCompare(b.date));
   }else if(t.methodologyVersion==='ADAPTIVE_R2_PAIR_R3'){
    need(t.etfs.length===2,'PAID_THEME_PAIR_ROSTER');
    calculated=scoringDays.map(p=>{const [a,b]=t.etfs.map(s=>perSymbol.get(s)?.get(p.date));let weights=null;
     if(a&&b&&score(a.score)&&score(b.score))try{weights=adaptivePairWeights({firstSessions:a.realSessionCount,secondSessions:b.realSessionCount,firstStatus:a.status,secondStatus:b.status});}catch(e){if(e.message!=='THEME_R3_UNAPPROVED_PAIR_OR_INCOMPLETE_SOURCE')throw e;}
     return {date:p.date,score:weights?Number((a.score*weights.first+b.score*weights.second).toFixed(5)):null};});
   }else if(t.methodologyVersion==='ETF_ONLY_T40_R20_V40_ADAPTIVE_R2_AUM_DATE_ELIGIBLE_SINGLE_R32'){
    const basket=calculateApprovedSpaceBasket({dates:spy.map(p=>p.date),symbols:t.etfs,timelines:Object.fromEntries(t.etfs.map(s=>[s,rawTimelines.get(s)])),observed,sessionCounts,aumEvidence:aumByTheme[t.id],scoreAsOf:spy.at(-1).date,historicalSingleContinuity:true,window:252+spy.filter(p=>p.date>phases.confirmed).length});calculated=basket.history;
   }else if(t.methodologyVersion==='ETF_ONLY_T40_R20_V40_ADAPTIVE_R2_DATED_ISSUER_AUM_R32'){
    calculated=scoringDays.map(p=>{
     const rows=t.etfs.flatMap(s=>{const v=perSymbol.get(s)?.get(p.date),m=money.get(s);return v&&score(v.score)&&m&&m.aumAsOf<=p.date?[{ticker:s,score:v.score,sessions:v.realSessionCount,status:v.status,aumUsd:m.aumUsd,aumAsOf:m.aumAsOf}]:[];});
     return mixNineR32Date({date:p.date,rows,benchmarkDate:p.date,allowDatedOfficialAum:true});
    });
   }else throw Object.assign(Error('PAID_THEME_METHOD_NOT_SUPPORTED'),{code:'PAID_THEME_METHOD_NOT_SUPPORTED'});
   const prior=previous.get(t.id)??previous.get(t.label),history=mergePublishedThemeHistory(prior,calculated,phases.confirmed);
   const last=history.at(-1);need(last?.date===phases.confirmed&&score(last.score),'PAID_THEME_CONFIRMED_SCORE_NOT_READY');
   if(t.public&&prior?.history?.length===252)need(history.length===252,'PAID_THEME_EXISTING_HISTORY_NOT_252');
   const provisional=calculated.filter(p=>p.date>phases.confirmed&&p.date<=phases.provisional&&score(p.score)).map(p=>({date:p.date,score:p.score}));
   need(phases.confirmed===phases.provisional||provisional.at(-1)?.date===phases.provisional,'PAID_THEME_PROVISIONAL_SCORE_NOT_READY');
   const missingETFs=t.etfs.filter(s=>!observed[s].has(phases.provisional));
   const item={id:t.id,configured:t.operational?.family==='configured',theme:t.label,etfs:[...t.etfs],methodologyVersion:t.methodologyVersion,score:last.score,history,confirmedObservationDate:phases.confirmed,provisionalObservationDate:provisional.at(-1)?.date??null,sourcePriceMode:PAID_HOURLY_MODE,previousPriceMode:prior?.previousPriceMode??prior?.sourcePriceMode??null,transitionAfter:prior?.transitionAfter??prior?.history?.at(-1)?.date??null,missingETFs,provisional};
   if(t.public){publicThemes.push(item);for(const p of provisional){const point=points.get(p.date)??{date:p.date,scores:{}};point.scores[t.label]=p.score;points.set(p.date,point);}}
   else privateResults.push({id:t.id,status:'PRIVATE_CALCULATED_NOT_PUBLISHED',confirmedDate:phases.confirmed,provisionalDate:item.provisionalObservationDate});
   results.push({id:t.id,public:t.public,status:'READY',missingETFs});
  }catch(e){results.push({id:t.id,public:t.public,status:'WAIT_SOURCE_OR_SCORE',code:/^[A-Z0-9_]+$/.test(e.code??'')?e.code:'PAID_THEME_CALCULATION_FAILED'});}
 }
 const expected=registry.themes.filter(t=>t.enabled&&t.public).map(t=>t.id),ready=publicThemes.map(t=>t.id);
 return {record:{version:PAID_THEME_VERSION,status:publicThemes.length?'READY':'PENDING',phase:points.size?'PROVISIONAL':'CONFIRMED',observationDate:phases.confirmed,confirmedObservationDate:phases.confirmed,sourceLatestDate:phases.sourceLatest,methodologyVersion:'REGISTERED_APPROVED_THEME_METHODS_V1',sourcePriceMode:PAID_HOURLY_MODE,historicalSourcePolicy:'PRESERVE_PRE_TRANSITION_PUBLIC_VALUES',sourceStoredAt,sourceVersion,registrySha256,updatedAt:new Date(now).toISOString(),phasePolicy:{confirmedLagHours:phases.confirmedLagHours,provisionalLagHours:phases.provisionalLagHours,clockBasis:phases.clockBasis},themes:publicThemes,provisional:{points:[...points.values()].sort((a,b)=>a.date.localeCompare(b.date))},dataQuality:{expectedPublicIds:expected,readyPublicIds:ready,pendingPublicIds:expected.filter(id=>!ready.includes(id)),results:results.filter(r=>r.public)}},results,privateResults};
}
