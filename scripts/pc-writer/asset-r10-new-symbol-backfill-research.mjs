import {createHash} from 'node:crypto';
import {isMarketSession} from '../../lib/market-score/breadth-b1-r3-calendar.mjs';

// A pure R10 research helper: no fetch, filesystem, environment, SQLite or D1.
// It cannot promote data. The approved market-breadth formula remains unchanged.
export const R10_NEW_SYMBOL_BACKFILL_METHOD='R10_B_NEW_SYMBOL_ASOF_UNMAPPED_RESEARCH_R1';
const SHA=/^[a-f0-9]{64}$/;
const DATE=/^\d{4}-\d{2}-\d{2}$/;
// A ticker is also used as a research-only directory component. In particular
// "." and ".." are never symbols: accepting them would permit path traversal.
// Keep genuine dot-class tickers (BRK.B, BF.B) and hyphenated tickers.
const TICKER=/^[A-Z0-9][A-Z0-9.\-]{0,14}$/;
const stamp=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const dateValid=value=>typeof value==='string'&&DATE.test(value)&&
 !Number.isNaN(Date.parse(value+'T00:00:00Z'))&&
 new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
const stop=(status,extras={})=>({status,method:R10_NEW_SYMBOL_BACKFILL_METHOD,canPromote:false,productionEligible:false,providerRequests:0,...extras});

// Treat "200 sessions" as 200 consecutive actual market-session dates, not
// merely 200 arbitrary sorted YYYY-MM-DD values. This is a research input
// check and does not replace independent PIT or exchange-holiday evidence.
function completeMarketSessionWindow(window){
 if(window.some(date=>!isMarketSession(date)))return false;
 let cursor=window[0],index=0;
 for(let guard=0;guard<400&&index<window.length;guard++){
  if(isMarketSession(cursor)){
   if(cursor!==window[index])return false;
   index++;
  }
  cursor=new Date(Date.parse(cursor+'T00:00:00Z')+86400000).toISOString().slice(0,10);
 }
 return index===window.length;
}

function verifiedBarDate(value){
 if(typeof value!=='string')return null;
 // Alpaca documents RFC-3339 nanosecond timestamps. Both Z and explicit
 // UTC offsets are valid, provided they resolve to the same exchange date.
 const match=value.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,9})?(Z|[+-]\d{2}:\d{2})$/);
 if(!match||!dateValid(match[1])||Number(match[2])>23||Number(match[3])>59||Number(match[4])>59||
    !Number.isFinite(Date.parse(value))||new Date(value).toISOString().slice(0,10)!==match[1])return null;
 return match[1];
}

/**
 * Only prepares bounded, operator-inspectable API requests. The caller must
 * independently establish PIT membership, date-effective issuer identity and
 * the corporate-action price basis. Its return value is never a release gate.
 */
export function planNewSymbolBackfill({sessions=[],throughDate,asOfDate,missingSymbols=[],pitProof={},identities=[],providerPolicy={}}={}){
 if(!dateValid(throughDate)||!dateValid(asOfDate)||throughDate>=asOfDate)
  return stop('STOP_DATE_SCOPE_INVALID');
 if(!Array.isArray(sessions)||sessions.length<200||sessions.some((v,i)=>!dateValid(v)||(i>0&&v<=sessions[i-1]))||
    sessions.at(-1)!==throughDate)return stop('STOP_VERIFIED_SESSION_WINDOW_MISSING');
 if(!completeMarketSessionWindow(sessions.slice(-200)))return stop('STOP_VERIFIED_SESSION_WINDOW_MISSING');
 if(pitProof?.status!=='PIT_TIME_EFFECTIVE_IDENTITIES_VERIFIED'||!SHA.test(pitProof?.eventDigest??'')||
    pitProof?.isResearchOnly!==true)return stop('STOP_TIME_EFFECTIVE_PIT_PROOF_MISSING');
 if(providerPolicy?.rightsStatus!=='ALPACA_IEX_RESEARCH_RETRIEVAL_APPROVED'||
    !SHA.test(providerPolicy?.rightsEvidenceSha256??'')||
    !Number.isInteger(providerPolicy?.approvedRequestCap)||providerPolicy.approvedRequestCap<1||
    providerPolicy.approvedRequestCap>20||
    !Number.isInteger(providerPolicy?.approvedSymbolCap)||providerPolicy.approvedSymbolCap<1||
    providerPolicy.approvedSymbolCap>10)return stop('STOP_PROVIDER_RIGHTS_OR_BUDGET_NOT_APPROVED');
 if(!Array.isArray(missingSymbols)||missingSymbols.length===0||missingSymbols.length>10||
    missingSymbols.some(s=>!TICKER.test(s))||new Set(missingSymbols).size!==missingSymbols.length)
  return stop('STOP_NEW_SYMBOL_SCOPE_INVALID');
 if(missingSymbols.length>providerPolicy.approvedSymbolCap||
    missingSymbols.length>providerPolicy.approvedRequestCap)
  return stop('STOP_PROVIDER_REQUEST_BUDGET_EXCEEDED');
 if(!Array.isArray(identities)||identities.length!==missingSymbols.length)
  return stop('STOP_SYMBOL_IDENTITY_EVIDENCE_MISSING');
 const members=new Map(),window=sessions.slice(-200),start=window[0],end=window.at(-1);
 for(const row of identities){
  if(!TICKER.test(row?.ticker)||!SHA.test(row?.membershipEvidenceSha256??'')||
     !SHA.test(row?.securityIdentitySha256??'')||!dateValid(row?.validFrom)||
     (row.validTo!==null&&row.validTo!==undefined&&!dateValid(row.validTo))||
     row.validFrom>start||(row.validTo!==null&&row.validTo!==undefined&&row.validTo<end)||
     members.has(row.ticker)||row.corporateActionPriceBasisReviewed!==true||
     !SHA.test(row.priceBasisEvidenceSha256??''))return stop('STOP_SYMBOL_IDENTITY_EVIDENCE_INVALID');
  members.set(row.ticker,row);
 }
 if(missingSymbols.some(t=>!members.has(t)))return stop('STOP_SYMBOL_IDENTITY_EVIDENCE_MISSING');
 const requests=missingSymbols.map(ticker=>{
  const params=new URLSearchParams({symbols:ticker,timeframe:'1Day',start:start+'T00:00:00Z',end:end+'T23:59:59Z',
   feed:'iex',adjustment:'split',asof:'-',limit:'10000'});
  return {ticker,method:'GET',url:'https://data.alpaca.markets/v2/stocks/bars?'+params,
   params:Object.fromEntries(params),sessionCount:window.length,
   membershipEvidenceSha256:members.get(ticker).membershipEvidenceSha256,
   securityIdentitySha256:members.get(ticker).securityIdentitySha256,
   priceBasisEvidenceSha256:members.get(ticker).priceBasisEvidenceSha256};
 });
 const provenance={eventDigest:pitProof.eventDigest,asOfDate,
  providerPolicy:{rightsStatus:providerPolicy.rightsStatus,rightsEvidenceSha256:providerPolicy.rightsEvidenceSha256,
   approvedRequestCap:providerPolicy.approvedRequestCap,approvedSymbolCap:providerPolicy.approvedSymbolCap},
  identities:missingSymbols.map(ticker=>({
   ticker,validFrom:members.get(ticker).validFrom,validTo:members.get(ticker).validTo??null,
   membershipEvidenceSha256:members.get(ticker).membershipEvidenceSha256,
   securityIdentitySha256:members.get(ticker).securityIdentitySha256,
   corporateActionPriceBasisReviewed:members.get(ticker).corporateActionPriceBasisReviewed,
   priceBasisEvidenceSha256:members.get(ticker).priceBasisEvidenceSha256}))};
 return stop('RESEARCH_REQUESTS_PREPARED_NO_PROVIDER_CALLS',{
  requestCount:requests.length,requests,expectedSessions:window,provenance,
  auditDigest:stamp({provenance,requests,window}),
 });
}

/** Validate supplied pages only; never connects to Alpaca or writes prices. */
export function inspectBackfillPages({plan,pagesByTicker={}}={}){
 if(plan?.status!=='RESEARCH_REQUESTS_PREPARED_NO_PROVIDER_CALLS'||!Array.isArray(plan.requests)||
    plan.requestCount!==plan.requests.length||!SHA.test(plan.auditDigest??'')||
    plan.auditDigest!==stamp({provenance:plan.provenance,requests:plan.requests,window:plan.expectedSessions}))
  return stop('STOP_BACKFILL_PLAN_INVALID');
 if(Object.keys(pagesByTicker).some(ticker=>!plan.requests.some(request=>request.ticker===ticker)))
  return stop('STOP_UNEXPECTED_ALPACA_TICKER_EVIDENCE');
 const expected=new Set(plan.expectedSessions??[]),results=[];
 for(const request of plan.requests){
  const ticker=request.ticker,pages=pagesByTicker[ticker];
  if(!Array.isArray(pages)||!pages.length||pages.length>12)return stop('STOP_PAGINATION_EVIDENCE_MISSING',{ticker});
  if(pages.length>plan.provenance?.providerPolicy?.approvedRequestCap||
     pages.length+results.reduce((n,row)=>n+row.providerPageCount,0)>
      plan.provenance?.providerPolicy?.approvedRequestCap)
   return stop('STOP_PROVIDER_REQUEST_BUDGET_EXCEEDED',{ticker});
  const seen=new Set(),rows=[];let pendingToken=null;
  for(const [index,item] of pages.entries()){
   if(index>0&&pendingToken===null)return stop('STOP_ALPACA_PAGINATION_INVALID',{ticker,page:index});
   if(item?.requestedPageToken!==pendingToken||item?.requestParams?.asof!=='-'||
      item.requestParams.feed!=='iex'||item.requestParams.adjustment!=='split'||
      item.requestParams.timeframe!=='1Day'||item.requestParams.limit!=='10000'||
      item.requestParams.symbols!==ticker||item.requestParams.start!==request.params.start||
      item.requestParams.end!==request.params.end||item?.httpStatus!==200||
      !Array.isArray(item?.response?.bars?.[ticker])||
      Object.keys(item.response.bars).some(key=>key!==ticker))
    return stop('STOP_UNVERIFIED_ALPACA_RESPONSE',{ticker,page:index});
   if(!SHA.test(item.responseSha256??'')||item.responseSha256!==stamp(item.response))
    return stop('STOP_ALPACA_RESPONSE_HASH_MISMATCH',{ticker,page:index});
   for(const bar of item.response.bars[ticker]){
    const tradeDate=verifiedBarDate(bar?.t);
    if(!tradeDate||!expected.has(tradeDate)||!Number.isFinite(bar?.c)||bar.c<=0||
       !Number.isFinite(bar?.v)||bar.v<0||seen.has(tradeDate))
      return stop('STOP_ALPACA_BAR_OR_DUPLICATE_INVALID',{ticker,page:index});
    seen.add(tradeDate);
    rows.push({ticker,tradeDate,currentClose:bar.c,currentVolume:bar.v,
      source:'ALPACA',feed:'iex',adjustmentStatus:'split',asof:'-',
      symbolMappingMode:'UNMAPPED_ASOF_DASH',responseSha256:item.responseSha256});
   }
   pendingToken=item.response.next_page_token??null;
   if(index===pages.length-1&&pendingToken!==null)return stop('STOP_ALPACA_PAGINATION_INCOMPLETE',{ticker});
  }
  const missing=plan.expectedSessions.filter(date=>!seen.has(date));
  if(missing.length)return stop('PARTIAL_200_SESSION_PRICE_COVERAGE',{ticker,storedBars:rows.length,missingCount:missing.length,
   missingDates:missing.slice(0,20)});
  results.push({ticker,rows:rows.sort((a,b)=>a.tradeDate.localeCompare(b.tradeDate)),
    completeSessions:200,priceRowDigest:stamp(rows),providerPageCount:pages.length,publicationAllowed:false});
 }
 return stop('RESEARCH_PRICES_200_SESSIONS_VALIDATED_AUDIT_PENDING',{results,
  note:'Source symbol requests and corporate-action price continuity require independent audit. This is never a promotion permit.'});
}
