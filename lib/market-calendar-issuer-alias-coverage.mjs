// Private, read-only Korean alias coverage for the existing saved ER1 cohort.
// Never put issuer names into the public score output, D1, or visitor GET.
import {ER1_STAR3_THRESHOLD} from './market-calendar-er1-earnings-score.mjs';
import {koreanCompanyAliasStatus} from './market-calendar-company-ko.mjs';

const STAR2_THRESHOLD=85; // Existing earnings-display ★★ threshold; unchanged.
const MAX_REPORT_ITEMS=1000; // Limit the private PC run report, not scoring.

export function reportUnmappedHighStarIssuers(savedDays,publicScore){
 if(!Array.isArray(savedDays)||publicScore?.status!=='READY_ER1_PUBLIC'||
  !Array.isArray(publicScore.scores))throw Error('ER1_ALIAS_COVERAGE_INPUT_INVALID');
 const scored=publicScore.scores.filter(row=>row.score>=STAR2_THRESHOLD);
 const byTicker=new Map();
 for(const row of scored){
  for(const ticker of row.tickers){
   if(byTicker.has(ticker))throw Error('ER1_ALIAS_COVERAGE_DUPLICATE_TICKER');
   byTicker.set(ticker,{issuerId:row.issuerId,score:row.score,
    stars:row.score>=ER1_STAR3_THRESHOLD?3:2});
  }
 }
 const observed=new Set(),unmappedIssuers=new Set(),missing=new Map();
 for(const saved of savedDays){
  const day=saved?.day,body=saved?.body;
  if(typeof day!=='string'||body?.date!==day||
   !['pre','after','notSupplied'].every(group=>Array.isArray(body[group])))
   throw Error('ER1_ALIAS_COVERAGE_SAVED_DAY_INVALID');
  // The signed-EPS forecast cohort only considers events as of this NY day
  // or later. Past issuer names must not create false current-name alerts.
  if(day<publicScore.asOf)continue;
  for(const group of ['pre','after','notSupplied'])for(const entry of body[group]){
   const score=byTicker.get(entry?.symbol);
   if(!score)continue;
   if(typeof entry.name!=='string'||!entry.name.trim())
    throw Error('ER1_ALIAS_COVERAGE_ISSUER_INVALID');
   observed.add(score.issuerId);
   const englishIssuer=entry.name.trim();
   const reason=koreanCompanyAliasStatus([entry.symbol],englishIssuer);
   if(reason==='MAPPED')continue;
   unmappedIssuers.add(score.issuerId);
   const key=JSON.stringify([entry.symbol,englishIssuer]);
   if(!missing.has(key))missing.set(key,{ticker:entry.symbol,englishIssuer,
    stars:score.stars,score:score.score,firstEventDate:day,reason});
   else if(day<missing.get(key).firstEventDate)missing.get(key).firstEventDate=day;
  }
 }
 // A scored issuer lacking any saved source name is not silently called mapped.
 for(const row of scored){
  if(observed.has(row.issuerId))continue;
  unmappedIssuers.add(row.issuerId);
  const ticker=row.tickers[0];
  missing.set(JSON.stringify([ticker,null]),{ticker,englishIssuer:null,
   stars:row.score>=ER1_STAR3_THRESHOLD?3:2,score:row.score,
   firstEventDate:null,reason:'SOURCE_NAME_NOT_FOUND'});
 }
 const candidates=[...missing.values()].sort((a,b)=>b.stars-a.stars||
  a.ticker.localeCompare(b.ticker)||
  (a.englishIssuer??'').localeCompare(b.englishIssuer??''));
 return {status:'READY_PRIVATE_REVIEW',asOf:publicScore.asOf,
  highStarIssuerCount:scored.length,
  unmappedIssuerCount:unmappedIssuers.size,
  unmappedNameCount:candidates.length,
  truncated:candidates.length>MAX_REPORT_ITEMS,
  candidates:candidates.slice(0,MAX_REPORT_ITEMS),providerRequests:0};
}
