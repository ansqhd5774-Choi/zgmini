/**
 * R8 shadow-only input gate. This module never fetches, writes, changes factors,
 * or supplies synthetic prices/volumes. It does NOT promote production scores.
 */
export const R8_SOURCE_GUARD_METHOD='BREADTH_R8_SOURCE_PURE_GUARD_R1';
export const R8_MIN_COVERAGE=0.98;
const dateOK=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x);
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const key=(d,t)=>d+'|'+t;
const num=x=>x===undefined||x===null||x===''?null:Number(x);
const activeSource=(r,s,f)=>String(r?.source??'')===s&&String(r?.feed??'')===f;
const recordDate=r=>String(r?.trade_date??r?.tradeDate??r?.date??'');
const recordTicker=r=>String(r?.ticker??r?.symbol??'').trim();
const cmp=(a,b)=>a===b||a===null&&b===null;

function pitDates(universes,asOfDate){
 const dates=new Map();
 for(const u of universes??[]){
  const d=String(u?.tradeDate??u?.trade_date??'');
  if(!dateOK(d)||d>asOfDate||!Array.isArray(u?.members))continue;
  const members=[...new Set(u.members.map(x=>String(x??'').trim()).filter(Boolean))];
  if(members.length<490||members.length>520)continue;
  if(dates.has(d))throw Error('R8_PIT_DUPLICATE_DATE');
  dates.set(d,members);
 }
 return [...dates].sort((a,b)=>a[0].localeCompare(b[0]));
}

function etfGate(relative,sessionDates,asOfDate){
 const absent={ready:false,reason:'R8_RELATIVE_INPUT_MISSING',aligned:0,needed:315};
 if(!relative||!Array.isArray(relative.equalWeighted)||!Array.isArray(relative.capWeighted))return absent;
 // A pair may use a different provider than the stock breadth, but both ETFs
 // must have a verifiable identical source/feed/adjustment contract.
 const source=String(relative.source??''),feed=String(relative.feed??''),adjustment=String(relative.adjustment??'');
 if(!source||!feed||!adjustment||relative.sourceVerified!==true)return {...absent,reason:'R8_RELATIVE_PROVENANCE_UNVERIFIED'};
 const toMap=(arr)=>{
  const m=new Map(),bad=new Set();
  for(const r of arr){
   const d=String(r?.date??r?.tradeDate??'');const v=num(r?.value??r?.close);
   if(!dateOK(d)||d>asOfDate||!finite(v)||v<=0)continue;
   if(r?.source!==undefined&&r.source!==source)bad.add(d);
   if(r?.feed!==undefined&&r.feed!==feed)bad.add(d);
   if(r?.adjustment!==undefined&&r.adjustment!==adjustment)bad.add(d);
   if(m.has(d)&&m.get(d)!==v)bad.add(d);
   m.set(d,v);
  }
  return {m,bad};
 };
 const e=toMap(relative.equalWeighted),c=toMap(relative.capWeighted);
 const expected=sessionDates.slice(-315);
 const aligned=expected.filter(d=>e.m.has(d)&&c.m.has(d)&&!e.bad.has(d)&&!c.bad.has(d)).length;
 const ready=expected.length===315&&aligned===315&&expected.at(-1)===asOfDate;
 return {ready,reason:ready?null:'R8_RELATIVE_315_EXACT_ALIGNED_MISSING',aligned,needed:315,source,feed,adjustment};
}

/**
 * @returns input readiness only (not factor readiness). Caller must still use
 * unchanged R8 R2 calculation and require result.status === READY.
 */
export function assessBreadthR8SourcePure({rows=[],universes=[],relativeSeries=null,asOfDate,source,feed,minCoverage=R8_MIN_COVERAGE}={}){
 if(!dateOK(asOfDate)||!source||!feed||minCoverage!==R8_MIN_COVERAGE)throw Error('R8_GUARD_CONTRACT_INVALID');
 const calendar=pitDates(universes,asOfDate),sessionDates=calendar.map(x=>x[0]);
 const blockers=[];
 if(sessionDates.at(-1)!==asOfDate)blockers.push('R8_PIT_EVALUATION_DATE_MISSING');
 if(calendar.length<315)blockers.push('R8_PIT_WARMUP_SESSIONS_MISSING');
 const byDate=new Map(calendar.map(([d,m])=>[d,new Map()]));
 const all=new Map(),duplicates=[];
 let sourceRows=0,otherSourceRows=0,excludedInvalid=0,excludedSynthetic=0,ignoredFuture=0;
 for(const r of Array.isArray(rows)?rows:[]){
  const d=recordDate(r),t=recordTicker(r);
  if(dateOK(d)&&d>asOfDate){ignoredFuture++;continue;}
  if(!activeSource(r,source,feed)){otherSourceRows++;continue;}
  sourceRows++;
  if(!dateOK(d)||!t){excludedInvalid++;continue;}
  if(String(r?.source??'').startsWith('B1_R3_PREVIOUS_CLOSE')||r?.synthetic===true||r?.derived===true){excludedSynthetic++;continue;}
  const close=num(r.current_close??r.currentClose??r.close);
  const volume=num(r.current_volume??r.currentVolume??r.volume);
  const prior=num(r.previous_close??r.previousClose);
  const prevDate=String(r.previous_date??r.previousDate??'');
  if(!finite(close)||close<=0){excludedInvalid++;continue;}
  // Genuine missing volume stays null and may only contribute to price fields.
  if(volume!==null&&(!finite(volume)||volume<0)){excludedInvalid++;continue;}
  const item={trade_date:d,ticker:t,current_close:close,current_volume:volume,
    previous_close:finite(prior)&&prior>0?prior:null,previous_date:dateOK(prevDate)?prevDate:null,
    source,feed};
  const k=key(d,t),old=all.get(k);
  if(old&&(!cmp(old.current_close,close)||!cmp(old.current_volume,volume)||
   (old.previous_close!==null&&item.previous_close!==null&&!cmp(old.previous_close,item.previous_close)))){
   duplicates.push(k);continue;
  }
  if(!old)all.set(k,item);
 }
 if(duplicates.length)blockers.push('R8_SAME_SOURCE_DUPLICATE_CONFLICT');
 for(const item of all.values()){byDate.get(item.trade_date)?.set(item.ticker,item);}
 // Never pass stale previous_close into the unchanged R8 calculation. That
 // calculator prefers previous_close over any observed previous-day row.
 for(let i=0;i<calendar.length;i++){
  const [d]=calendar[i],prev=i>0?calendar[i-1][0]:null;
  for(const item of byDate.get(d).values()){
   if(item.previous_date!==prev){item.previous_date=null;item.previous_close=null;}
  }
 }
 // Use PIT members ONLY for that session. Do not erase earlier history merely
 // because a company was not a member in that earlier session.
 const daily=[];
 for(let i=0;i<calendar.length;i++){
  const [d,members]=calendar[i];const memberRows=byDate.get(d);const previous=i>0?byDate.get(calendar[i-1][0]):null;
  const previousDay=i>0?calendar[i-1][0]:null;
  const required=Math.ceil(members.length*minCoverage);
  let price=0,value=0;
  for(const ticker of members){
   const row=memberRows.get(ticker);if(!row)continue;
   const priorSameSession=previous?.get(ticker)?.current_close;
   const hasPrevious=previousDay&&(
    row.previous_date===previousDay&&finite(row.previous_close)&&row.previous_close>0 ||
    finite(priorSameSession)&&priorSameSession>0);
   if(!hasPrevious)continue;
   price++;
   if(finite(row.current_volume)&&row.current_volume>=0)value++;
  }
  daily.push({date:d,members:members.length,required,price,value,
   priceReady:price>=required,valueReady:value>=required});
 }
 const current=daily.at(-1)??null;
 if(!current?.priceReady)blockers.push('R8_CURRENT_EXACT_DATE_PRICE_COVERAGE');
 if(!current?.valueReady)blockers.push('R8_CURRENT_EXACT_DATE_VALUE_COVERAGE');
 const recent=daily.slice(-252);
 const shortDates=recent.filter(x=>!x.priceReady||!x.valueReady);
 if(recent.length<252||shortDates.length)blockers.push('R8_DAILY_252_CONTIGUOUS_INPUT_MISSING');
 // Original R8 reducer uses daily.filter(READY) before computing rolling EMAs.
 // If an older READY segment precedes a missing day, it would silently compress
 // the timeline. Refuse computation rather than change its EMA initialization.
 let seenReady=false,readyGap=false;
 for(const d of daily){
  const ready=d.priceReady&&d.valueReady;
  if(ready)seenReady=true;
  else if(seenReady)readyGap=true;
 }
 if(readyGap)blockers.push('R8_READY_SESSION_GAP_WOULD_COMPRESS_EMA');
 const etf=etfGate(relativeSeries,sessionDates,asOfDate);
 if(!etf.ready)blockers.push(etf.reason);
 const uniqueBlockers=[...new Set(blockers)];
 return {
  method:R8_SOURCE_GUARD_METHOD,mode:'SHADOW_ONLY',status:uniqueBlockers.length?'PARTIAL':'INPUT_READY',
  asOfDate,source,feed,sourceRows,otherSourceRows,excludedInvalid,excludedSynthetic,ignoredFuture,
  sameSourceConflictCount:duplicates.length,sameSourceConflictSample:duplicates.slice(0,5),
  calendarSessions:calendar.length,recent252ShortDates:shortDates.map(x=>({...x})),
  dailyReadyDates:daily.filter(x=>x.priceReady&&x.valueReady).length,
  current,relative:etf,blockers:uniqueBlockers,
  // Selected source-pure observed rows only; no cross-source fallback, no inferred volume.
  rows:[...all.values()].filter(x=>finite(x.current_volume)&&byDate.has(x.trade_date))
    .sort((a,b)=>a.trade_date.localeCompare(b.trade_date)||a.ticker.localeCompare(b.ticker)),
 };
}

export function scoreBreadthR8Guarded(params,calculate){
 if(typeof calculate!=='function')throw TypeError('R8_CALCULATOR_REQUIRED');
 const assessment=assessBreadthR8SourcePure(params);
 if(assessment.status!=='INPUT_READY')return {
  status:'PARTIAL',score:null,reason:'R8_SOURCE_PURE_INPUT_NOT_READY',
  mode:'SHADOW_ONLY',assessment:{...assessment,rows:undefined},
 };
 const result=calculate({rows:assessment.rows,universes:params.universes,
  relativeSeries:params.relativeSeries,asOfDate:params.asOfDate,
  minCoverage:R8_MIN_COVERAGE});
 if(result?.asOfDate!==params.asOfDate||result?.status!=='READY'||!finite(result?.score)){
  return {status:'PARTIAL',score:null,reason:'R8_CALCULATION_NOT_READY',mode:'SHADOW_ONLY',
   assessment:{...assessment,rows:undefined},calculationStatus:result?.status??null};
 }
 return {status:'READY_SHADOW_ONLY',score:result.score,mode:'SHADOW_ONLY',
  assessment:{...assessment,rows:undefined},calculation:result};
}
