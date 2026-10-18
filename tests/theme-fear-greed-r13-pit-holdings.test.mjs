import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveThemeFundRegistryR13,auditThemeFundPITR13} from '../lib/market-score/theme-fear-greed-r13-pit-holdings.mjs';
const mf={fields:['cik','seriesId','classId','symbol'],data:[[1432353,'S000054693','C000171853','BOTZ'],[1064642,'S000063361','C000205414','ROKT']]};
const identity={cik:'0001432353',seriesId:'S000054693',classId:'C000171853'};
const report={source:'SEC_NPORT_PUBLIC',accession:'0001752724-25-183092',cik:'1432353',seriesId:'S000054693',classId:'C000171853',holdingsAsOf:'2025-05-31',publiclyAvailableAt:'2025-07-30T14:19:02Z',holdingCount:81,hasStableSecurityIds:true};
test('SEC mutual-fund registry maps CIK plus series/class, not verified security',()=>{
 const x=resolveThemeFundRegistryR13(mf,['BOTZ','ROKT','ZZZZ']); assert.equal(x.matched,2);assert.equal(x.unresolved,1);
 assert.deepEqual(x.funds[0].identity,identity);assert.equal(x.funds[0].status,'REGISTRY_CANDIDATE_ONLY');assert.equal(x.scoreReady,false);
});
test('SEC registry rejects missing/wrong schema and duplicate ticker request',()=>{
 assert.equal(resolveThemeFundRegistryR13(null,['BOTZ']).status,'SEC_MF_REGISTRY_MISSING');
 assert.equal(resolveThemeFundRegistryR13({fields:[],data:[]},['BOTZ']).status,'SEC_MF_SCHEMA_INVALID');
 assert.equal(resolveThemeFundRegistryR13(mf,['BOTZ','BOTZ']).status,'TICKER_REQUEST_INVALID');
});
test('SEC registry reports collision as ambiguous',()=>{
 const dup={...mf,data:[...mf.data,[999999,'S000000001','C000000002','BOTZ']]};
 assert.equal(resolveThemeFundRegistryR13(dup,['BOTZ']).funds[0].status,'AMBIGUOUS_OR_MALFORMED');
});
test('SEC registry rejects malformed identity rather than guessing',()=>{
 const broken={...mf,data:[[1432353,'x','C000171853','BOTZ']]};
 assert.equal(resolveThemeFundRegistryR13(broken,['BOTZ']).funds[0].status,'AMBIGUOUS_OR_MALFORMED');
});
test('N-PORT publication lag is preserved; no historical lookahead',()=>{
 const x=auditThemeFundPITR13({ticker:'BOTZ',identity,reports:[report],studyDates:['2025-06-02','2025-07-30','2025-07-31']});
 assert.equal(x.status,'PIT_REPORT_TIMELINE_AUDITED_NOT_DAILY_COMPLETE');assert.equal(x.acceptedReports,1);
 assert.equal(x.dateAudit[0].previouslyPublishedReports,0);assert.equal(x.dateAudit[1].previouslyPublishedReports,0);
 assert.equal(x.dateAudit[1].sameDayTimingRequiresIntradayGate,true);assert.equal(x.dateAudit[2].previouslyPublishedReports,1);
 assert.equal(x.scoreReady,false);
});
test('trust CIK alone does not prove ETF series',()=>{
 const x=auditThemeFundPITR13({ticker:'BOTZ',identity,reports:[{...report,seriesId:'S000066518'}]});
 assert.equal(x.acceptedReports,0);assert.equal(x.rejected[0].reason,'FUND_IDENTITY_MISMATCH');
});
test('missing SEC public provenance/accession cannot be used',()=>{
 const x=auditThemeFundPITR13({ticker:'BOTZ',identity,reports:[{...report,source:'UNVERIFIED'}]});
 assert.equal(x.rejected[0].reason,'SOURCE_OR_ACCESSION_INVALID');
});
test('filing known before observation is rejected',()=>{
 const x=auditThemeFundPITR13({ticker:'BOTZ',identity,reports:[{...report,publiclyAvailableAt:'2025-05-30T10:00:00Z'}]});
 assert.equal(x.rejected[0].reason,'PUBLICATION_CHRONOLOGY_INVALID');
});
test('malformed reporting dates reject before scoring',()=>{
 const x=auditThemeFundPITR13({ticker:'BOTZ',identity,reports:[{...report,holdingsAsOf:'2025-02-30'}]});
 assert.equal(x.rejected[0].reason,'DATES_INVALID');
});
test('missing holdings identifier evidence rejects',()=>{
 const x=auditThemeFundPITR13({ticker:'BOTZ',identity,reports:[{...report,hasStableSecurityIds:false}]});
 assert.equal(x.rejected[0].reason,'HOLDINGS_EVIDENCE_INCOMPLETE');
});
test('no reports yields no false PIT readiness',()=>{
 const x=auditThemeFundPITR13({ticker:'BOTZ',identity,reports:[],studyDates:['2025-10-01']});
 assert.equal(x.acceptedReports,0);assert.equal(x.dateAudit[0].pointInTimeDailyHoldingsVerified,false);assert.equal(x.published,false);
});
test('invalid study dates fail explicitly',()=>{
 const x=auditThemeFundPITR13({ticker:'BOTZ',identity,reports:[],studyDates:['2025-02-30']});
 assert.equal(x.status,'REPORT_INPUT_INVALID');
});