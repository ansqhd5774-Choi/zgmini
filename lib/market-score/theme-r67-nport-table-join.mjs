import {R66_SEC_IDENTITIES} from './theme-r66-sec-issuer-registry.mjs';

/**
 * R67 stored-only joins for official SEC N-PORT structured tables.
 * No network, DB, collector, writer, score calculation, or publication.
 * Caller supplies rows from a verified, locally stored SEC dataset and an
 * independently checked firstPublicDate (SEC filing vs dataset posting differ).
 * The returned holdings are PRIVATE research inputs, never a public API value.
 */
export const R67_VERSION='THEME-R67-OFFLINE-NPORT-EXACT-ACCESSION-JOIN-V1';
const ACC=/^\d{10}-\d{2}-\d{6}$/;
const SEC_CUSIP=/^[0-9A-Z*@#]{9}$/;
const ISIN=/^[A-Z]{2}[A-Z0-9]{9}[0-9]$/;
const fail=code=>{throw Error('R67_'+code);};
const requireIt=(yes,code)=>{if(!yes)fail(code);};
const date=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
const digitCik=c=>String(c??'').replace(/^0+/,'')||'0';
const id=s=>String(s??'').trim();
function onlyOne(rows,accession,name){
  requireIt(Array.isArray(rows),name+'_ARRAY_REQUIRED');
  const matches=rows.filter(r=>id(r?.ACCESSION_NUMBER)===accession);
  requireIt(matches.length===1,name+'_ACCESSION_NOT_UNIQUE');
  return matches[0];
}
function numericOrNull(value){
  if(value===undefined||value===null||String(value).trim()==='')return null;
  const n=Number(value);return Number.isFinite(n)?n:null;
}
export function joinR67NportFiling({ticker,decisionDate,firstPublicDate,accession,submissionRows,registrantRows,fundRows,holdingRows,identifierRows}={}){
  const expected=R66_SEC_IDENTITIES[ticker];
  requireIt(expected&&date(decisionDate)&&date(firstPublicDate)&&ACC.test(id(accession)),'IDENTITY_OR_DATES_REQUIRED');
  const sub=onlyOne(submissionRows,accession,'SUBMISSION');
  const reg=onlyOne(registrantRows,accession,'REGISTRANT');
  const fund=onlyOne(fundRows,accession,'FUND');
  const filingDate=id(sub.FILING_DATE),reportDate=id(sub.REPORT_DATE),form=id(sub.SUB_TYPE);
  requireIt(date(filingDate)&&date(reportDate)&&['NPORT-P','NPORT-P/A'].includes(form),'SUBMISSION_DATE_OR_FORM_INVALID');
  requireIt(reportDate<=filingDate&&filingDate<=firstPublicDate,'FILING_CHRONOLOGY_INVALID');
  requireIt(digitCik(reg.CIK)===digitCik(expected.cik),'CIK_MISMATCH');
  requireIt(id(fund.SERIES_ID)===expected.seriesId,'SERIES_ID_MISMATCH');
  requireIt(Array.isArray(holdingRows)&&Array.isArray(identifierRows),'HOLDINGS_OR_IDENTIFIERS_REQUIRED');
  const filingsHoldings=holdingRows.filter(h=>id(h?.ACCESSION_NUMBER)===accession);
  const seenHoldings=new Set();
  for(const h of filingsHoldings){
    const key=id(h.HOLDING_ID);requireIt(/^\d+$/.test(key)&&!seenHoldings.has(key),'DUPLICATE_OR_BAD_HOLDING_ID');seenHoldings.add(key);
  }
  // Identifiers from unrelated accessions cannot become securities here.
  const ids=new Map();
  for(const row of identifierRows){
    const k=id(row?.HOLDING_ID);if(!seenHoldings.has(k))continue;
    const arr=ids.get(k)??[];arr.push(row);ids.set(k,arr);
  }
  let missingStableId=0,duplicateIdentifierRecords=0,nonEquity=0,negativeWeights=0;
  const holdings=filingsHoldings.map(h=>{
    const key=id(h.HOLDING_ID),items=ids.get(key)??[];
    if(items.length>1)duplicateIdentifierRecords++;
    const r=items.length===1?items[0]:null;
    const cusip=id(h.ISSUER_CUSIP).toUpperCase(),isin=id(r?.IDENTIFIER_ISIN).toUpperCase();
    const stableId=SEC_CUSIP.test(cusip)?{kind:'CUSIP',value:cusip}:ISIN.test(isin)?{kind:'ISIN',value:isin}:null;
    if(!stableId)missingStableId++;
    const weight=numericOrNull(h.PERCENTAGE);
    if(weight!==null&&weight<0)negativeWeights++;
    if(id(h.ASSET_CAT)!=='EC')nonEquity++;
    return Object.freeze({holdingId:key,reportedDate:reportDate,firstPublicDate,
      tickerIdentifier:id(r?.IDENTIFIER_TICKER)||null,stableId:stableId?Object.freeze(stableId):null,
      issuerName:id(h.ISSUER_NAME)||null,currency:id(h.CURRENCY_CODE)||null,
      assetCategory:id(h.ASSET_CAT)||null,reportedPctOfAssets:weight,
      identifierStatus:items.length>1?'AMBIGUOUS':stableId?'STABLE':'MISSING',
    });
  });
  requireIt(negativeWeights===0,'NEGATIVE_WEIGHT_REQUIRES_REVIEW');
  const seenSecure=new Set();let duplicateStableIds=0;
  for(const h of holdings){if(!h.stableId)continue;const k=h.stableId.kind+':'+h.stableId.value;if(seenSecure.has(k))duplicateStableIds++;seenSecure.add(k);}
  const available=firstPublicDate<=decisionDate;
  const readyForSnapshotResearch=available&&holdings.length>0&&missingStableId===0&&duplicateStableIds===0&&duplicateIdentifierRecords===0;
  return Object.freeze({version:R67_VERSION,ticker,registrantCik:expected.cik,seriesId:expected.seriesId,
    accession,form,reportDate,filingDate,firstPublicDate,decisionDate,
    publicAtDecisionDate:available,holdingsRows:holdings.length,missingStableId,duplicateStableIds,duplicateIdentifierRecords,nonEquityRows:nonEquity,
    exactAccessionAndFundMatched:true,readyForSnapshotResearch,
    dailyHistoricalPITVerified:false,memberPriceVolumeAligned:false,reference756Verified:false,
    fiveAxisScoreComputed:false,commercialRedistributionAllowed:false,
    holdingsPrivate:Object.freeze(holdings),status:!available?'NOT_PUBLIC_AT_DECISION':readyForSnapshotResearch?'SINGLE_SNAPSHOT_PRIVATE_RESEARCH':'REQUIRES_HOLDING_IDENTITY_REVIEW'});
}
export function summarizeR67WithoutHoldings(joined){
 requireIt(joined?.version===R67_VERSION,'INVALID_JOIN_RESULT');
 const {holdingsPrivate,...summary}=joined;return Object.freeze(summary);
}
