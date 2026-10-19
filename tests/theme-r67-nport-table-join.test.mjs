import test from 'node:test';
import assert from 'node:assert/strict';
import {joinR67NportFiling,summarizeR67WithoutHoldings} from '../lib/market-score/theme-r67-nport-table-join.mjs';
const a='0000940400-26-032759';
function f(){return {ticker:'CIBR',decisionDate:'2026-10-16',firstPublicDate:'2026-08-21',accession:a,
  submissionRows:[{ACCESSION_NUMBER:a,FILING_DATE:'2026-08-21',REPORT_DATE:'2026-06-30',SUB_TYPE:'NPORT-P'}],
  registrantRows:[{ACCESSION_NUMBER:a,CIK:'1364608'}],
  fundRows:[{ACCESSION_NUMBER:a,SERIES_ID:'S000050385'}],
  holdingRows:[{ACCESSION_NUMBER:a,HOLDING_ID:'7',ISSUER_CUSIP:'123456789',ISSUER_NAME:'Sample Technology',PERCENTAGE:'4.5',ASSET_CAT:'EC',CURRENCY_CODE:'USD'},
    {ACCESSION_NUMBER:a,HOLDING_ID:'8',ISSUER_CUSIP:'',ISSUER_NAME:'Another Equity',PERCENTAGE:'2.1',ASSET_CAT:'EC',CURRENCY_CODE:'USD'}],
  identifierRows:[{HOLDING_ID:'7',IDENTIFIER_ISIN:'US1234567890',IDENTIFIER_TICKER:'SAMP'},
    {HOLDING_ID:'8',IDENTIFIER_ISIN:'US0987654321',IDENTIFIER_TICKER:'OTHR'}]};}
test('exact accession and unique SEC fund series join; holdings remain private',()=>{const x=joinR67NportFiling(f());assert.equal(x.exactAccessionAndFundMatched,true);assert.equal(x.holdingsRows,2);assert.equal(x.readyForSnapshotResearch,true);assert.equal(x.holdingsPrivate[1].stableId.kind,'ISIN');assert.equal(summarizeR67WithoutHoldings(x).holdingsPrivate,undefined);});
test('published after decision does not get used in prior history',()=>{const x=f();x.decisionDate='2026-08-20';const r=joinR67NportFiling(x);assert.equal(r.publicAtDecisionDate,false);assert.equal(r.readyForSnapshotResearch,false);assert.equal(r.dailyHistoricalPITVerified,false);});
test('wrong CIK or series cannot be mixed into ETF',()=>{const x=f();x.registrantRows[0].CIK='1432353';assert.throws(()=>joinR67NportFiling(x),/CIK_MISMATCH/);const y=f();y.fundRows[0].SERIES_ID='S000066713';assert.throws(()=>joinR67NportFiling(y),/SERIES_ID_MISMATCH/);});
test('unrelated accessions and holdings are never joined',()=>{const x=f();x.holdingRows.push({ACCESSION_NUMBER:'0000940400-26-022222',HOLDING_ID:'99',ISSUER_CUSIP:'012345678'});x.identifierRows.push({HOLDING_ID:'99',IDENTIFIER_TICKER:'OTHER'});const r=joinR67NportFiling(x);assert.equal(r.holdingsRows,2);});
test('duplicate holding ID fails instead of overwriting',()=>{const x=f();x.holdingRows.push({...x.holdingRows[0]});assert.throws(()=>joinR67NportFiling(x),/DUPLICATE_OR_BAD_HOLDING_ID/);});
test('ambiguous identifiers cannot be approved',()=>{const x=f();x.identifierRows.push({...x.identifierRows[0],IDENTIFIER_TICKER:'WRONG'});const r=joinR67NportFiling(x);assert.equal(r.duplicateIdentifierRecords,1);assert.equal(r.readyForSnapshotResearch,false);});
test('missing stable CUSIP and ISIN is preserved as missing',()=>{const x=f();x.identifierRows=x.identifierRows.filter(y=>y.HOLDING_ID!=='8');const r=joinR67NportFiling(x);assert.equal(r.missingStableId,1);assert.equal(r.holdingsPrivate[1].stableId,null);assert.equal(r.readyForSnapshotResearch,false);});
test('negative percentage is not normalized to zero',()=>{const x=f();x.holdingRows[0].PERCENTAGE='-1';assert.throws(()=>joinR67NportFiling(x),/NEGATIVE_WEIGHT_REQUIRES_REVIEW/);});
test('duplicate security ID across two holdings requires review',()=>{const x=f();x.holdingRows[1].ISSUER_CUSIP=x.holdingRows[0].ISSUER_CUSIP;const r=joinR67NportFiling(x);assert.equal(r.duplicateStableIds,1);assert.equal(r.readyForSnapshotResearch,false);});
test('unverified snapshot is never 252 daily PIT or final five-axis score',()=>{const x=joinR67NportFiling(f());assert.equal(x.dailyHistoricalPITVerified,false);assert.equal(x.memberPriceVolumeAligned,false);assert.equal(x.reference756Verified,false);assert.equal(x.fiveAxisScoreComputed,false);assert.equal(x.commercialRedistributionAllowed,false);});
