import test from 'node:test';
import assert from 'node:assert/strict';
import {isR69IsinFormatValid,joinR69CibrOfflineEvidence,parseR69Csv} from '../lib/market-score/theme-r69-cibr-missing-29-join.mjs';
const headers=['r57_current_symbol','sec_2026_06_ticker','sec_2026_06_isin','sec_date','sec_filed','sec_link','identity_state','price_volume_state','historical_daily_pit'];
const url='https://www.sec.gov/Archives/edgar/data/1364608/000094040026032759/xslFormNPORT-P_X01/primary_doc.xml';
const isn=i=>{const prefix='US'+String(i).padStart(9,'0');return prefix+[...Array(10).keys()].find(n=>isR69IsinFormatValid(prefix+n));};
const exact=[...Array(22)].map((_,i)=>'T'+i);
const suffix=['A0.FP','B1.JP','C2.CN','D3.FP'],miss=['M0','M1','M2'];
const names=[...exact,...suffix,...miss];
function fixture(){
 const r57={audit:'R57_CIBR_45_EXISTING_BASE_AND_INCREMENTAL_STOCK_COVERAGE',asof:'2026-10-16',sourceComplete:true,source:{totalFiles:660,base:{filesParsed:55},incremental:{filesParsed:605}},coverage:{cib45:{tracked:45,withTargetDate:16,missingCompletely:names},integrity:{conflictingTickerDatePairs:16}},policy:{providerCalls:0,networkCalls:0,productionMutation:false}};
 const rows=names.map((symbol,i)=>{const state=i<22?'EXACT_TICKER_STRING_ONLY_UNVERIFIED':i<26?'TICKER_SUFFIX_CANDIDATE_UNVERIFIED':'NO_JUNE_TICKER_MATCH';const ticker=i<22?symbol:i<26?symbol.split('.')[0]:'';
 return [symbol,ticker,i<26?isn(i):'','2026-06-30','2026-08-21',url,state,'NOT_FOUND_IN_R57_STORED_SCOPE','NOT_VERIFIED'].join(',');});
 return {r57,csv:[headers.join(','),...rows].join('\r\n')};
}
test('29 evidence records remain categorised without invented market data',()=>{const x=joinR69CibrOfflineEvidence(fixture());assert.equal(x.rows.length,29);assert.equal(x.exactTickerResearchCandidates,22);assert.equal(x.exchangeSuffixResearchCandidates,4);assert.equal(x.noJuneTickerMatch,3);assert.equal(x.resolvedMissingPriceSeries,0);assert.equal(x.publicFiveAxisScores,0);});
test('all valid identifier formats are not security identity proof',()=>{const x=joinR69CibrOfflineEvidence(fixture());assert.equal(x.candidateIsinChecksumValid,26);assert.ok(x.rows.every(r=>r.matchedSecurityIdentity===false&&r.verifiedHistoricalPIT===false));});
test('R57 provenance and coverage drift are errors',()=>{const x=fixture();x.r57.source.totalFiles=659;assert.throws(()=>joinR69CibrOfflineEvidence(x),/R57_SOURCE_FILES/);const y=fixture();y.r57.coverage.cib45.withTargetDate=17;assert.throws(()=>joinR69CibrOfflineEvidence(y),/R57_MISSING_29/);});
test('future SEC snapshot date cannot masquerade as June filing',()=>{const x=fixture();x.csv=x.csv.replace('2026-06-30','2026-09-30');assert.throws(()=>joinR69CibrOfflineEvidence(x),/CANDIDATE_SOURCE_DATES/);});
test('bad ISIN checksum and duplicate ISIN both fail closed',()=>{const a=fixture(),id=isn(0);a.csv=a.csv.replace(id,id.slice(0,-1)+(id.at(-1)==='0'?'1':'0'));assert.throws(()=>joinR69CibrOfflineEvidence(a),/ISIN_CHECKSUM_INVALID/);const b=fixture();b.csv=b.csv.replace(isn(1),id);assert.throws(()=>joinR69CibrOfflineEvidence(b),/DUPLICATE_REPORTED_ISIN/);});
test('duplicate missing symbol and suffix alias discrepancy fail closed',()=>{const a=fixture();a.csv=a.csv.replace('T1,T1,','T0,T1,');assert.throws(()=>joinR69CibrOfflineEvidence(a),/CANDIDATE_NOT_R57_MISSING_OR_DUPLICATE/);const b=fixture();b.csv=b.csv.replace('A0.FP,A0,','A0.FP,OTHER,');assert.throws(()=>joinR69CibrOfflineEvidence(b),/EXCHANGE_SUFFIX_MISMATCH/);});
test('CSV quoted escapes and BOM are handled without dependencies',()=>{const x=fixture(),z='\uFEFF'+x.csv;assert.equal(parseR69Csv(z).length,29);const q=z.replace('T0,T0','"T,0",T0');assert.equal(parseR69Csv(q)[0].r57_current_symbol,'T,0');});
test('policy rejects network requests and invalid readiness',()=>{const a=fixture();a.r57.policy.networkCalls=1;assert.throws(()=>joinR69CibrOfflineEvidence(a),/R57_POLICY/);const b=fixture();b.csv=b.csv.replace('NOT_VERIFIED','VERIFIED');assert.throws(()=>joinR69CibrOfflineEvidence(b),/CANDIDATE_FALSE_READY/);});
