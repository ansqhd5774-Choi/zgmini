/**
 * R69: Join actual offline R57 missing-stock observations to the SEC N-PORT
 * 2026-06 R68 identifier research candidates. Research only; no provider calls.
 * Ticker/ISIN string matches NEVER resolve price, historical PIT or licensing.
 */
export const R69_VERSION='THEME-R69-CIBR-29-IDENTIFIER-RESEARCH-JOIN-V1';
const REQUIRED_HEADERS=Object.freeze(['r57_current_symbol','sec_2026_06_ticker','sec_2026_06_isin','sec_date','sec_filed','sec_link','identity_state','price_volume_state','historical_daily_pit']);
const STATES=Object.freeze(['EXACT_TICKER_STRING_ONLY_UNVERIFIED','TICKER_SUFFIX_CANDIDATE_UNVERIFIED','NO_JUNE_TICKER_MATCH']);
const FAIL=code=>{throw Error('THEME_R69_'+code);};
const need=(condition,code)=>{if(!condition)FAIL(code);};
export function parseR69Csv(csv){
 need(typeof csv==='string'&&csv.length<=128000,'CSV_NOT_BOUNDED');
 const text=csv.replace(/^\uFEFF/,'');let q=false,s='',row=[],out=[];
 for(let i=0;i<text.length;i++){
  const ch=text[i];
  if(ch==='"'){if(q&&text[i+1]==='"'){s+='"';i++;}else q=!q;}
  else if(ch===','&&!q){row.push(s);s='';}
  else if((ch==='\n'||ch==='\r')&&!q){if(ch==='\r'&&text[i+1]==='\n')i++;row.push(s);s='';if(row.some(x=>x!==''))out.push(row);row=[];}
  else s+=ch;
 }
 need(!q,'CSV_UNCLOSED_QUOTE');row.push(s);if(row.some(x=>x!==''))out.push(row);
 need(out.length>=2&&JSON.stringify(out[0])===JSON.stringify(REQUIRED_HEADERS),'CSV_SCHEMA');
 need(out.slice(1).every(r=>r.length===REQUIRED_HEADERS.length),'CSV_ROW_WIDTH');
 return out.slice(1).map(r=>Object.fromEntries(REQUIRED_HEADERS.map((k,i)=>[k,r[i]])));
}
export function isR69IsinFormatValid(isin){
 if(typeof isin!=='string'||!/^[A-Z]{2}[A-Z0-9]{10}$/.test(isin))return false;
 const chars=[...isin].flatMap(c=>/[A-Z]/.test(c)?[...String(c.charCodeAt(0)-55)].map(Number):[Number(c)]);
 let sum=0;for(let i=chars.length-1,j=0;i>=0;i--,j++){
  const n=chars[i]*(j%2?2:1);sum+=Math.floor(n/10)+n%10;
 }
 return sum%10===0;
}
export function joinR69CibrOfflineEvidence({r57,csv}={}){
 need(r57?.audit==='R57_CIBR_45_EXISTING_BASE_AND_INCREMENTAL_STOCK_COVERAGE'&&r57.asof==='2026-10-16'&&r57.sourceComplete===true,'R57_EVIDENCE');
 need(r57.source?.totalFiles===660&&r57.source?.base?.filesParsed===55&&r57.source?.incremental?.filesParsed===605,'R57_SOURCE_FILES');
 const base=r57.coverage?.cib45,missing=base?.missingCompletely;
 need(base?.tracked===45&&base?.withTargetDate===16&&missing?.length===29&&new Set(missing).size===29,'R57_MISSING_29');
 need(r57.coverage?.integrity?.conflictingTickerDatePairs===16,'R57_CONFLICTS_UNRESOLVED');
 need(r57.policy?.providerCalls===0&&r57.policy?.networkCalls===0&&r57.policy?.productionMutation===false,'R57_POLICY');
 const candidates=parseR69Csv(csv);need(candidates.length===29,'CANDIDATE_COUNT');
 const required=new Set(missing),seen=new Set(),seenIsin=new Set(),rows=[];
 let exact=0,suffix=0,notFound=0;
 const jurisdictions={};
 for(const x of candidates){
  const symbol=x.r57_current_symbol,secTicker=x.sec_2026_06_ticker,isin=x.sec_2026_06_isin,state=x.identity_state;
  need(required.has(symbol)&&!seen.has(symbol),'CANDIDATE_NOT_R57_MISSING_OR_DUPLICATE');seen.add(symbol);
  need(x.sec_date==='2026-06-30'&&x.sec_filed==='2026-08-21','CANDIDATE_SOURCE_DATES');
  need(x.sec_link==='https://www.sec.gov/Archives/edgar/data/1364608/000094040026032759/xslFormNPORT-P_X01/primary_doc.xml','CANDIDATE_SOURCE_URL');
  need(STATES.includes(state),'CANDIDATE_STATE');
  need(x.price_volume_state==='NOT_FOUND_IN_R57_STORED_SCOPE'&&x.historical_daily_pit==='NOT_VERIFIED','CANDIDATE_FALSE_READY');
  if(state==='NO_JUNE_TICKER_MATCH'){
   need(secTicker===''&&isin==='','MISSING_MATCH_MUST_NOT_HAVE_ISIN');notFound++;
  }else{
   need(isR69IsinFormatValid(isin),'ISIN_CHECKSUM_INVALID');
   need(!seenIsin.has(isin),'DUPLICATE_REPORTED_ISIN');seenIsin.add(isin);
   jurisdictions[isin.slice(0,2)]=(jurisdictions[isin.slice(0,2)]??0)+1;
   if(state==='EXACT_TICKER_STRING_ONLY_UNVERIFIED'){need(symbol===secTicker,'EXACT_TICKER_MISMATCH');exact++;}
   else {need(/^[A-Z0-9]+\.[A-Z]{2}$/.test(symbol)&&symbol.split('.')[0]===secTicker,'EXCHANGE_SUFFIX_MISMATCH');suffix++;}
  }
  rows.push(Object.freeze({currentSymbol:symbol,juneTicker:secTicker||null,juneIsin:isin||null,
   r57PriceVolumeState:'NOT_FOUND_IN_STORED_SCOPE',identifierEvidence:state,
   identifierFormatValid:isin?true:null,matchedSecurityIdentity:false,matchedOctoberMembership:false,
   verifiedHistoricalPIT:false,hasLocalStoredPriceSeries:false,
   nextCheck:state==='EXACT_TICKER_STRING_ONLY_UNVERIFIED'?'ISSUER_STABLE_ID_AND_PRICE_PROVIDER_SYMBOL':state==='TICKER_SUFFIX_CANDIDATE_UNVERIFIED'?'EXCHANGE_VENUE_SYMBOL_AND_STABLE_ID':'DIFFERENT_REPORT_DATE_OR_OFFICIAL_CURRENT_HOLDINGS'}));
 }
 need(seen.size===29&&exact===22&&suffix===4&&notFound===3,'EXPECTED_EVIDENCE_DISTRIBUTION_DRIFT');
 return Object.freeze({version:R69_VERSION,observationDate:'2026-10-16',snapshotDate:'2026-06-30',snapshotFirstPublicDate:'2026-08-21',
  r57StoredMembers:16,r57DeclaredMembers:45,r57MissingMembers:29,
  exactTickerResearchCandidates:exact,exchangeSuffixResearchCandidates:suffix,noJuneTickerMatch:notFound,
  candidateIsinChecksumValid:exact+suffix,isinPrefixes:Object.freeze(jurisdictions),
  resolvedMissingPriceSeries:0,verifiedHistoricalConstituentMembership:0,approvedVolumeRevisions:0,
  newlyComputedBreadthAxes:0,newlyComputedDemandAxes:0,publicFiveAxisScores:0,
  rows:Object.freeze(rows),status:'RESEARCH_ONLY_NO_AUTOMATIC_IDENTIFICATION_OR_PUBLICATION'});
}
