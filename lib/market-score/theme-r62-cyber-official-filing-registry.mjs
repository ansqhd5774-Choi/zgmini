/**
 * R62: official SEC identity and dated filing metadata for two US-listed ETFs.
 * Research-only evidence catalog, not a daily holdings history or price source.
 * No network calls, persistence, formulas, weights, provider usage, or publish path.
 */
export const R62_CYBER_FILING_VERSION = 'THEME-R62-CYBER-SEC-FILING-IDENTITY-RESEARCH-V1';
export const R62_CYBER_FUND_IDENTITY = Object.freeze({
  CIBR: Object.freeze({cik:'0001364608',series:'S000050385',classId:'C000159087'}),
  BUG: Object.freeze({cik:'0001432353',series:'S000066713',classId:'C000214985'}),
});
export const R62_OFFICIAL_FILINGS = Object.freeze([
  Object.freeze({ticker:'CIBR',form:'NPORT-P',accession:'0000940400-26-007646',reportDate:'2025-12-31',filedDate:'2026-02-25',url:'https://www.sec.gov/Archives/edgar/data/1364608/000094040026007646/0000940400-26-007646-index.htm'}),
  Object.freeze({ticker:'CIBR',form:'NPORT-P',accession:'0000940400-26-020522',reportDate:'2026-03-31',filedDate:'2026-05-21',url:'https://www.sec.gov/Archives/edgar/data/1364608/000094040026020522/0000940400-26-020522-index.htm'}),
  Object.freeze({ticker:'CIBR',form:'NPORT-P',accession:'0000940400-26-032759',reportDate:'2026-06-30',filedDate:'2026-08-21',url:'https://www.sec.gov/Archives/edgar/data/1364608/000094040026032759/0000940400-26-032759-index.htm'}),
  Object.freeze({ticker:'BUG',form:'NPORT-P',accession:'0002048251-26-000815',reportDate:'2025-11-30',filedDate:'2026-01-29',url:'https://www.sec.gov/Archives/edgar/data/1432353/000204825126000815/0002048251-26-000815-index.htm'}),
  Object.freeze({ticker:'BUG',form:'N-CSRS',accession:'0000930413-26-002360',reportDate:'2026-05-31',filedDate:'2026-08-06',url:'https://www.sec.gov/Archives/edgar/data/1432353/000093041326002360/0000930413-26-002360-index.htm'}),
]);
const isDate=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&!Number.isNaN(Date.parse(x+'T00:00:00Z'));
const requireCheck=(condition,code)=>{if(!condition)throw Error('THEME_R62_'+code);};
export function auditR62FilingAvailability(asOf,filings=R62_OFFICIAL_FILINGS){
  requireCheck(isDate(asOf),'ASOF_INVALID');
  requireCheck(Array.isArray(filings),'SOURCE_INVALID');
  const seen=new Set();
  const evaluated=filings.map(f=>{
    const identity=R62_CYBER_FUND_IDENTITY[f?.ticker];
    requireCheck(identity&&['NPORT-P','N-CSRS'].includes(f.form),'ETF_OR_FORM_INVALID');
    requireCheck(/^\d{10}-\d{2}-\d{6}$/.test(f.accession)&&isDate(f.reportDate)&&isDate(f.filedDate),'ACCESSION_OR_DATE_INVALID');
    requireCheck(f.filedDate>=f.reportDate,'FILED_BEFORE_REPORT');
    requireCheck(f.url===`https://www.sec.gov/Archives/edgar/data/${Number(identity.cik)}/${f.accession.replaceAll('-','')}/${f.accession}-index.htm`,'SEC_URL_MISMATCH');
    requireCheck(!seen.has(f.accession),'DUPLICATE_ACCESSION');
    seen.add(f.accession);
    return Object.freeze({ticker:f.ticker,form:f.form,reportDate:f.reportDate,filedDate:f.filedDate,accession:f.accession,
      publicByDecisionDate:f.filedDate<=asOf,
      usableAsDailyHoldingsPIT:false,holdingsRowsParsed:false,securityIdentifiersVerified:false});
  });
  const latestAvailableByTicker=Object.fromEntries(Object.keys(R62_CYBER_FUND_IDENTITY).map(t=>{
    const available=evaluated.filter(x=>x.ticker===t&&x.publicByDecisionDate).sort((a,b)=>b.reportDate.localeCompare(a.reportDate)||b.filedDate.localeCompare(a.filedDate));
    return [t,available[0]??null];
  }));
  return Object.freeze({version:R62_CYBER_FILING_VERSION,asOf,records:evaluated.length,officialIdentifiersVerified:2,
    latestAvailableByTicker,holdingsRowsParsed:0,datedSnapshotsNotDailyHoldingsPIT:true,
    missingStockSeriesResolved:0,marketBreadthScoreReady:false,marketDemandScoreReady:false,
    publicFiveAxisScoreReady:false,commercialRightsVerified:false,
    result:'FILING_METADATA_ONLY_NO_HISTORICAL_PIT_OR_MARKET_DATA'});
}
