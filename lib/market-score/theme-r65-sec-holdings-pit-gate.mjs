/**
 * R65 offline SEC fund-holdings evidence gate (research only).
 * A public N-PORT filing is a historical snapshot, not daily ETF membership.
 * No network, storage, market-data values, formulas, weights or publication.
 */
export const R65_VERSION='THEME-R65-SEC-HOLDINGS-PIT-GATE-RESEARCH-V1';
const DATE=/^\d{4}-\d{2}-\d{2}$/;
const SEC_INDEX=/^https:\/\/www\.sec\.gov\/Archives\/edgar\/data\/(\d+)\/(\d{18})\/(\d{10}-\d{2}-\d{6})-index\.htm$/;
const ID={CUSIP:/^[0-9A-Z*@#]{9}$/,ISIN:/^[A-Z]{2}[0-9A-Z]{10}$/,SEDOL:/^[0-9A-Z]{7}$/};
const FAIL=code=>{throw Error('R65_'+code);};
function validDate(s){if(typeof s!=='string'||!DATE.test(s))return false;const d=new Date(`${s}T00:00:00.000Z`);return !Number.isNaN(d.valueOf())&&d.toISOString().slice(0,10)===s;}
function required(cond,code){if(!cond)FAIL(code);}
function validateFiling(f,cutoff){
 required(validDate(cutoff)&&f&&typeof f==='object','INVALID_CUTOFF_OR_FILING');
 required(['NPORT-P','N-CSRS'].includes(f.form),'FORM_NOT_SUPPORTED');
 required(validDate(f.reportDate)&&validDate(f.filedDate)&&f.filedDate>=f.reportDate,'FILING_DATE_INVALID');
 required(/^S\d{9}$/.test(f.seriesId??'')&&/^C\d{9}$/.test(f.classId??''),'SERIES_CLASS_REQUIRED');
 required(/^\d{10}$/.test(f.cik??''),'CIK_REQUIRED');
 const m=SEC_INDEX.exec(f.indexUrl??'');
 required(m&&Number(m[1])===Number(f.cik)&&m[2]===m[3].replaceAll('-','')&&m[3]===f.accession,'SEC_INDEX_NOT_AUTHENTICATED');
 required(f.reportDate<=cutoff,'FUTURE_REPORT_DATE');
 return f.filedDate<=cutoff;
}
/**
 * Input holdings are parsed upstream from the exact public SEC filing and must
 * carry a stable source identifier; this module does not trust ticker alone.
 * Empty/malformed rows are not silently dropped or zero-filled.
 */
export function auditR65SecSnapshot({filing,holdings,cutoffDate,expectedTicker=null}={}){
 const publicByCutoff=validateFiling(filing,cutoffDate);
 if(expectedTicker!==null)required(filing.ticker===expectedTicker,'FUND_TICKER_MISMATCH');
 required(Array.isArray(holdings),'HOLDINGS_ARRAY_REQUIRED');
 required(holdings.length<=10000,'HOLDINGS_LIMIT');
 const seen=new Set();let unidentified=0,weightsPresent=0,priceEligible=0;
 for(const row of holdings){
  required(row&&typeof row==='object','ROW_INVALID');
  const idType=row.identifierType,id=String(row.identifier??'').toUpperCase();
  if(!idType||!id){unidentified++;continue;}
  required(ID[idType]?.test(id),'IDENTIFIER_FORMAT_INVALID');
  const key=`${idType}:${id}`;required(!seen.has(key),'DUPLICATE_SECURITY_ID');seen.add(key);
  if(row.weightPercent!==undefined&&row.weightPercent!==null){
   required(typeof row.weightPercent==='number'&&Number.isFinite(row.weightPercent)&&row.weightPercent>=0&&row.weightPercent<=100,'WEIGHT_INVALID');weightsPresent++;
  }
  if(row.storedPriceVolumeReady===true)priceEligible++;
 }
 const completeIdentity=holdings.length>0&&unidentified===0;
 return Object.freeze({
  version:R65_VERSION,ticker:filing.ticker,seriesId:filing.seriesId,classId:filing.classId,
  filingReportDate:filing.reportDate,filingPublicDate:filing.filedDate,decisionDate:cutoffDate,
  publishedByDecisionDate:publicByCutoff,reportedHoldings:holdings.length,
  identifiableRows:holdings.length-unidentified,unidentifiedRows:unidentified,weightRows:weightsPresent,
  storedPriceVolumeRowFlags:priceEligible,
  singleReportSnapshotReady:publicByCutoff&&completeIdentity,
  dailyConstituentPITVerified:false,aligned252TradingDaysVerified:false,reference756Verified:false,
  holdingsPriceJoinVerified:false,themeFiveAxisScoreReady:false,commercialPublicationAllowed:false,
  state:!publicByCutoff?'FILING_NOT_PUBLIC_AT_CUTOFF':!completeIdentity?'INCOMPLETE_SECURITIES':'SINGLE_REPORT_ONLY_NOT_DAILY_PIT',
 });
}
/** Historical guard: a quarterly snapshot may be used only as an exact dated
 * observation of holdings, never copied into intervening days as known truth. */
export function auditR65SnapshotTimeline(snapshots=[]){
 required(Array.isArray(snapshots),'TIMELINE_ARRAY_REQUIRED');
 const byKey=new Set(),out=[];
 for(const snapshot of snapshots){
  const r=auditR65SecSnapshot(snapshot),key=`${r.seriesId}|${r.filingReportDate}`;
  required(!byKey.has(key),'DUPLICATE_FUND_REPORT_DATE');byKey.add(key);
  out.push(Object.freeze({seriesId:r.seriesId,reportDate:r.filingReportDate,filedDate:r.filingPublicDate,publicByCutoff:r.publishedByDecisionDate,verifiedSingleReport:r.singleReportSnapshotReady,usableAsDailyPIT:false}));
 }
 return Object.freeze({snapshots:out.length,reports:Object.freeze(out),dailyPITVerified:false,publicScoreReady:false});
}
