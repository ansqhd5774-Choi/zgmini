/**
 * R77: stable SEC ISIN -> dated prior CIBR ticker -> R57 stored-ticker candidates.
 * Research only: not live BUG constituents, not daily PIT, not a verified
 * market-data join, and not approved for publication.
 */
export const R77_VERSION='THEME-R77-SEC-ISIN-TO-PRIOR-STORED-SYMBOL-RESEARCH-V1';
export const R77_R57_STORED_TICKERS=Object.freeze([
 'FTNT','CRWD','CSCO','PANW','AVGO','FFIV','ACN','NTAP',
 'DDOG','MSFT','GOOGL','IBM','ANET','LDOS','GEN','AKAM'
]);
const fail=code=>{throw Error('R77_STOP_'+code);};
const req=(ok,code)=>{if(!ok)fail(code);};
const validDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s+'T00:00:00Z'));
const requiredNames=['CIBR|2025-12-31','CIBR|2026-03-31','CIBR|2026-06-30','BUG|2025-11-30'];
const shared=(a,b)=>[...a].filter(x=>b.has(x)).length;
function sourceValid(x){
 req(x?.meta&&x?.privateIds?.isins instanceof Set&&x?.privateIds?.byIsin instanceof Map,'INPUT_SHAPE');
 const {meta,privateIds:ids}=x;
 req(meta.sha256Verified===true&&validDate(meta.reportDate)&&validDate(meta.firstPublicDate)&&meta.firstPublicDate<='2026-10-16','SOURCE_HASH_OR_DATE_NOT_VERIFIED');
 req(ids.isins.size===meta.uniqueIsinEquities&&meta.validIsinEquityPositions===ids.isins.size,'SOURCE_ISIN_SET_COUNT');
 req([...ids.byIsin.keys()].every(i=>ids.isins.has(i)),'EXTRA_SYMBOL_ISIN');
 req(meta.duplicateIsinEquityPositions===0&&meta.invalidIsinEquityFields===0&&meta.ambiguousTickerPerIsin===0,'IDENTITY_CONFLICTS_PRESENT');
}
export function buildR77Crosswalk(snapshots,{asof='2026-10-16',r57Tickers=R77_R57_STORED_TICKERS}={}){
 req(asof==='2026-10-16','ASOF_NOT_APPROVED');
 req(Array.isArray(snapshots)&&snapshots.length===4,'FOUR_SNAPSHOTS_REQUIRED');
 const byName=new Map();
 for(const snapshot of snapshots){
  sourceValid(snapshot);
  const key=snapshot.meta.ticker+'|'+snapshot.meta.reportDate;
  req(requiredNames.includes(key)&&!byName.has(key),'UNEXPECTED_OR_DUPLICATE_REPORT');
  byName.set(key,snapshot);
 }
 req(byName.size===4,'FOUR_REPORTS_MISSING');
 const [c1,c2,c3,bug]=requiredNames.map(k=>byName.get(k));
 req(c1.privateIds.isins.size===32&&c2.privateIds.isins.size===42&&c3.privateIds.isins.size===42&&bug.privateIds.isins.size===29,'R76_EQUITY_COUNT_DRIFT');
 req(shared(c1.privateIds.isins,c2.privateIds.isins)===29&&shared(c2.privateIds.isins,c3.privateIds.isins)===42,'R76_CIBR_TRANSITION_DRIFT');
 req(shared(bug.privateIds.isins,c1.privateIds.isins)===19&&shared(bug.privateIds.isins,c3.privateIds.isins)===17,'R76_BUG_CIBR_OVERLAP_DRIFT');
 req(Array.isArray(r57Tickers)&&r57Tickers.length===16&&new Set(r57Tickers).size===16&&r57Tickers.every(x=>/^[A-Z0-9]+$/.test(x)),'R57_TICKER_COUNT_DRIFT');
 const r57=new Set(r57Tickers);
 const byIsin=new Map();
 for(const f of [c1,c2,c3])for(const [isin,symbol] of f.privateIds.byIsin){
  if(typeof symbol!=='string'||!symbol)continue;
  const records=byIsin.get(isin)??[];records.push({symbol,date:f.meta.reportDate});byIsin.set(isin,records);
 }
 let june=0,any=0,storedJune=0,storedAny=0,conflicts=0,unmapped=0,unknown=0;
 const candidates=new Set(),storedCandidates=new Set();
 for(const isin of bug.privateIds.isins){
  if(c3.privateIds.isins.has(isin))june++;
  const dates=byIsin.get(isin)??[];
  if(!dates.length){unmapped++;continue;}
  any++;
  const names=new Set(dates.map(x=>x.symbol));
  if(names.size>1){conflicts++;continue;}
  const ticker=[...names][0];
  if(!ticker){unknown++;continue;}
  candidates.add(ticker);
  if(r57.has(ticker)){storedAny++;storedCandidates.add(ticker);}
  if(c3.privateIds.isins.has(isin)&&c3.privateIds.byIsin.get(isin)===ticker&&r57.has(ticker))storedJune++;
 }
 req(june===17&&any>=19&&any+unmapped===29,'CROSSWALK_OVERLAP_DRIFT');
 return Object.freeze({audit:'R77_CIBR_BUG_STORED_FOUR_XML_ISIN_TO_R57_SYMBOL_CANDIDATES',
  version:R77_VERSION,asof,asofType:'RESEARCH_REFERENCE_ONLY',sourcesVerified:4,
  sourceDates:Object.freeze(requiredNames),
  bugNov2025EquityIsins:29,cibrJune2026EquityIsins:42,
  bugIsinsSharedWithCibrJune2026:june,bugIsinsSharedWithAnyPriorCibrSnapshot:any,
  bugIsinsUnmappedInPriorCibr:unmapped,bugIsinsWithConsistentPriorCibrTicker:any-conflicts-unknown,
  crossSnapshotTickerConflicts:conflicts,unknownTickerAfterIsinJoin:unknown,
  bugIsinsWithR57StoredTickerFromJune:storedJune,bugIsinsWithR57StoredTickerFromAnySnapshot:storedAny,
  distinctCibrTickerCandidates:candidates.size,distinctCibrTickersPreviouslyObservedInR57:storedCandidates.size,
  r57StoredTickerCountAt2026_10_16:16,r57MarketHistoryReRead:false,
  priceVolumeSeriesRecovered:0,bugEquityPricesDateAligned:0,
  bugOfficial2026_10_16MembershipVerified:false,dailyETFConstituentPITVerified:false,
  corporateActionVerified:false,volumeRevisionsApproved:0,fiveAxisScoresComputed:0,
  commercialPublicationAuthorized:false,
  safety:Object.freeze({networkCalls:0,providerCalls:0,dbReads:0,dbWrites:0,
   writerCalls:0,rawHoldingsOutput:false,rawStockSymbolsOutput:false,sourceMutation:false,productionMutation:false}),
  verdict:'RESEARCH_SYMBOL_CANDIDATES_ONLY_NO_CONFIRMED_BUG_PRICE_HISTORY_OR_PIT'});
}
