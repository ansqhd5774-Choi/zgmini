/**
 * R82 private, deterministic theme breadth/demand source adapter.
 * Generates ONLY the raw input shape consumed by approved sector-R3
 * deriveSectorFearGreedR3RawAxes(). It does not score, normalize,
 * backfill, fetch, read DB, write, publish or assert data availability.
 * Historical constituent membership MUST be issuer-verified for every day:
 * old SEC N-PORT quarterly snapshots are NOT acceptable substitutes.
 */
export const R82_VERSION='THEME-R82-VERIFIED-DAILY-PIT-RAW-AXES-V1';
const formatDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
const isinFormat=s=>typeof s==='string'&&/^[A-Z]{2}[A-Z0-9]{9}[0-9]$/.test(s);
const numeric=n=>typeof n==='number'&&Number.isFinite(n);
const assert=(b,e)=>{if(!b)throw Error('R82_'+e);};
const allUnique=arr=>new Set(arr).size===arr.length;
const scalarRow=(row)=>[row.close,row.volume].every(numeric)&&row.close>0&&row.volume>=0;
const ID=(date,isin)=>date+'|'+isin;
const average=a=>a.reduce((s,v)=>s+v,0)/a.length;
/**
 * Sessions must be verified market sessions, ascending; bars have one ISIN,
 * one ticker and known price+volume provenance at each session. Memberships
 * must be independently dated daily issuer disclosures, not guessed from
 * quarterly N-PORT. Even valid rows are nonpublishable without rights.
 */
export function buildR82ThemeRawInputs({sessions,memberships,bars,cutoffDate,
  verifiedMarketSessions=false,commercialRightsVerified=false}={}){
 assert(formatDate(cutoffDate),'CUTOFF_DATE_REQUIRED');
 assert(verifiedMarketSessions===true,'UNVERIFIED_SESSION_CALENDAR');
 assert(Array.isArray(sessions)&&sessions.length&&sessions.every(formatDate)&&allUnique(sessions)&&sessions.every((d,i)=>i===0||sessions[i-1]<d)&&sessions.at(-1)<=cutoffDate,'SESSIONS_INVALID');
 assert(Array.isArray(memberships)&&Array.isArray(bars),'REQUIRED_INPUT_ARRAYS');
 const index=new Map(sessions.map((d,i)=>[d,i])),pit=new Map(),data=new Map(),byIsin=new Map();
 for(const m of memberships){
  assert(formatDate(m?.date)&&index.has(m.date)&&formatDate(m.firstPublicDate),'PIT_DATES_INVALID');
  assert(!pit.has(m.date),'DUPLICATE_DAILY_PIT');
  assert(m.issuerDailyHoldingsVerified===true&&m.sourceType==='ISSUER_DAILY_HOLDINGS'&&m.firstPublicDate<=m.date,'UNVERIFIED_KNOWN_AT_MEMBERSHIP');
  assert(Array.isArray(m.members)&&m.members.length>0,'EMPTY_MEMBERS');
  const keys=new Set(),symbols=new Set();
  for(const member of m.members){
   assert(isinFormat(member?.isin)&&/^[A-Z0-9][A-Z0-9.\-]{0,14}$/.test(member?.ticker??'')&&member.symbolIsinBindingVerified===true,'UNVERIFIED_SECURITY_BINDING');
   assert(!keys.has(member.isin)&&!symbols.has(member.ticker),'DUPLICATE_MEMBER_OR_TICKER');
   keys.add(member.isin);symbols.add(member.ticker);
  }
  pit.set(m.date,m.members);
 }
 for(const row of bars){
  assert(formatDate(row?.date)&&index.has(row.date)&&isinFormat(row.isin)&&/^[A-Z0-9][A-Z0-9.\-]{0,14}$/.test(row.ticker??''),'BAR_IDENTIFIER_INVALID');
  assert(scalarRow(row),'BAR_OHLCV_INVALID');
  assert(row.sourceVerified===true&&row.symbolIsinBindingVerified===true&&row.splitAdjustmentVerified===true&&row.volumeRevisionResolved===true,'BAR_PROVENANCE_NOT_VERIFIED');
  const key=ID(row.date,row.isin),old=data.get(key);
  assert(!old||old.ticker===row.ticker&&old.close===row.close&&old.volume===row.volume,'BAR_DUPLICATE_CONFLICT');
  if(!old){data.set(key,row);const t=byIsin.get(row.isin)??[];t.push(row);byIsin.set(row.isin,t);}
 }
 // Do not silently replace a ticker with a different ISIN on the same date.
 const sameDateTicker=new Map();
 for(const r of data.values()){
  const key=r.date+'|'+r.ticker,other=sameDateTicker.get(key);
  assert(!other||other===r.isin,'TICKER_IDENTITY_COLLISION');sameDateTicker.set(key,r.isin);
 }
 const histories=new Map();
 for(const [isin,rows] of byIsin){
  rows.sort((a,b)=>a.date.localeCompare(b.date));
  const map=new Map(rows.map((row,i)=>[row.date,i]));
  const closes=rows.map(r=>r.close),prefix=[0];for(const n of closes)prefix.push(prefix.at(-1)+n);
  histories.set(isin,{rows,map,prefix});
 }
 const breadthRows=[],demandRows=[],days=[];
 for(const date of sessions){
  const members=pit.get(date);
  if(!members){days.push({date,memberCount:null,matched:0,breadthReady:false,demandReady:false,reason:'DAILY_ISSUER_MEMBERSHIP_MISSING'});continue;}
  let above50=0,above200=0,high=0,low=0,up=0,down=0,volumeSum=0;
  let matching=0,ready50=0,ready200=0,ready252=0,directionReady=0;
  for(const member of members){
   const r=data.get(ID(date,member.isin));
   if(!r||r.ticker!==member.ticker)continue;
   matching++;
   const hist=histories.get(member.isin),i=hist.map.get(date);
   const trailing=(window)=>i>=window-1&&index.get(hist.rows[i-window+1].date)===index.get(date)-window+1&&hist.rows.slice(i-window+1,i+1).every((x,j)=>index.get(x.date)===index.get(date)-window+1+j);
   if(trailing(50)){
    ready50++;above50+=(r.close>(hist.prefix[i+1]-hist.prefix[i-49])/50)?1:0;
   }
   if(trailing(200)){
    ready200++;above200+=(r.close>(hist.prefix[i+1]-hist.prefix[i-199])/200)?1:0;
   }
   if(trailing(252)){
    ready252++;
    const window=hist.rows.slice(i-251,i+1).map(x=>x.close);
    if(r.close===Math.max(...window))high++;
    if(r.close===Math.min(...window))low++;
   }
   if(i>0&&index.get(hist.rows[i-1].date)===index.get(date)-1){
    directionReady++;volumeSum+=r.volume;
    if(r.close>hist.rows[i-1].close)up+=r.volume;
    else if(r.close<hist.rows[i-1].close)down+=r.volume;
   }
  }
  const matchedAll=matching===members.length;
  const breadthReady=matchedAll&&ready50===members.length&&ready200===members.length&&ready252===members.length;
  const demandReady=matchedAll&&directionReady===members.length&&volumeSum>0;
  if(breadthReady)breadthRows.push(Object.freeze({date,b50:above50/members.length,b200:above200/members.length,highLowNet:(high-low)/members.length}));
  if(demandReady)demandRows.push(Object.freeze({date,volumeBreadth:(up-down)/volumeSum}));
  days.push(Object.freeze({date,memberCount:members.length,matched:matching,ready50,ready200,ready252,directionReady,
    breadthReady,demandReady,reason:!matchedAll?'PRICE_VOLUME_OR_IDENTITY_MISSING':!breadthReady?'MOVING_HISTORY_INSUFFICIENT':!demandReady?'DIRECTION_VOLUME_INSUFFICIENT':'RAW_AXES_INPUT_READY'}));
 }
 const latest=days.at(-1);
 return Object.freeze({version:R82_VERSION,cutoffDate,daysChecked:sessions.length,pitDaysVerified:pit.size,
  breadthReadyDates:breadthRows.length,demandReadyDates:demandRows.length,
  latest:Object.freeze(latest),commercialRightsVerified,publicationAuthorized:false,
  historicalDailyPITFullWindowVerified:pit.size===sessions.length,
  source:'VERIFIED_DAILY_HOLDINGS_AND_LOCAL_PRICE_VOLUME_ONLY',
  privateRawInputs:Object.freeze({breadthRows:Object.freeze(breadthRows),demandRows:Object.freeze(demandRows)}),
  status:latest.breadthReady&&latest.demandReady?'RAW_INPUTS_RESEARCH_READY_NOT_A_FIVE_AXIS_SCORE':'RAW_INPUTS_INCOMPLETE_NO_SCORE'});
}
export function summarizeR82NoRawRows(result){
 assert(result?.version===R82_VERSION,'INVALID_BRIDGE_OUTPUT');
 const {privateRawInputs,...rest}=result;return Object.freeze(rest);
}