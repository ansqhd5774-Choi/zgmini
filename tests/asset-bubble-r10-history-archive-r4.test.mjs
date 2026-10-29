import test from 'node:test';
import assert from 'node:assert/strict';
import {parseAssetR10ArchivedAuditLog,validateArchivedAssetR10AgainstCurrent,
 assertArchivedR10MatchesD1Raw}
 from '../lib/diagnostic-layer/asset-bubble-r10-history-archive-r4.mjs';
const clone=x=>JSON.parse(JSON.stringify(x));
const snapshot=()=>({
 schemaVersion:'asset-bubble-r10-one-year-readonly-r1',
 status:'PARTIAL_1Y_READONLY',
 sourceVersion:'macro:2026-10-28:'+('a'.repeat(64)),sourceStoredAt:1793203206694,
 asOfDate:'2026-10-28',scoreObservationQuarter:'2026-Q2',
 firstQuarter:'2025-Q2',lastQuarter:'2026-Q2',
 historicalMode:'CURRENT_VINTAGE_NOT_PIT',rightsStatus:'USER_ACCEPTED_UNVERIFIED',
 approvedScore:22.57324252737245,approvedRawParity:'PASS',
 providerRequests:0,pcSqliteWrites:0,d1Writes:0,scoreWrites:0,deployments:0,
 storedInputs:{priceBatchKey:'price-1',priceStoredAt:100,macroBatchKey:'macro:2026-10-28'},
 factors:Array.from({length:6},(_,i)=>({
  id:'factor'+i,unit:'POINTS',source:'PROVIDER',
  points:Array.from({length:5},(_,j)=>({
   quarter:['2025-Q2','2025-Q3','2025-Q4','2026-Q1','2026-Q2'][j],
   observationDate:i===4&&j<2?null:['2025-04-01','2025-07-01','2025-10-01','2026-01-01','2026-04-01'][j],
   value:i===4&&j<2?null:i+j
  })),
  status:i===4?'PARTIAL_1Y':'READY_1Y',
  missingQuarters:i===4?['2025-Q2','2025-Q3']:[],
 }))
});
const current=a=>{
 const b=clone(a);b.sourceVersion=b.sourceVersion.replace('2026-10-28','2026-10-29');
 b.sourceStoredAt=1793254203126;b.asOfDate='2026-10-29';
 b.storedInputs.macroBatchKey='macro:2026-10-29';return b;
};
const raw=a=>({sourceVersion:a.sourceVersion,sourceStoredAt:a.sourceStoredAt,
 asOfDate:a.asOfDate,scoreObservationQuarter:a.scoreObservationQuarter,
 diagnosticScore:a.approvedScore,
 factors:a.factors.map(f=>({id:f.id,unit:f.unit,source:f.source,
  value:f.points[4].value,previousValue:f.points[3].value,
  observationDate:f.points[4].observationDate,
  previousObservationDate:f.points[3].observationDate}))});
const log=a=>[
 'ZGMINI_ASSET_R10_1Y_HISTORY_READONLY_R1',
 'SOURCE_BRANCH=codex/api-site-integration-r1-20261026',
 'SOURCE_SHA=42e3abbc671185cd9ea87b906ae32e84c51bd0e1',
 JSON.stringify(a),'AUDIT_EXIT_CODE=0','WRAPPER_RESULT=PASS_READONLY_AUDIT_EXECUTED'
].join('\r\n');
test('R4 accepts audited archived evidence but never an incomplete log',()=>{
 const a=snapshot();assert.equal(parseAssetR10ArchivedAuditLog(log(a)).asOfDate,'2026-10-28');
 assert.throws(()=>parseAssetR10ArchivedAuditLog(log(a).replace('AUDIT_EXIT_CODE=0','AUDIT_EXIT_CODE=1')),/PROVENANCE/);
});
test('R4 accepts unchanged five-quarter observations under later collection timestamp',()=>{
 const a=snapshot();assert.equal(validateArchivedAssetR10AgainstCurrent(a,current(a)),a);
});
test('R4 refuses altered historical values',()=>{
 const a=snapshot(),b=current(a);b.factors[0].points[0].value=100;
 assert.throws(()=>validateArchivedAssetR10AgainstCurrent(a,b),/FACTOR_OR_SCORE_DRIFT/);
});
test('R4 refuses changed batch fingerprint even if values match',()=>{
 const a=snapshot(),b=current(a);b.sourceVersion=b.sourceVersion.replace(/a{64}$/,'b'.repeat(64));
 assert.throws(()=>validateArchivedAssetR10AgainstCurrent(a,b),/SOURCE_BATCH_DRIFT/);
});
test('R4 refuses backdated or mutated old provenance',()=>{
 const a=snapshot(),b=current(a);a.sourceStoredAt++;
 assert.throws(()=>validateArchivedAssetR10AgainstCurrent(a,b),/AUDIT_GATE_FAILED/);
});
test('R4 requires exact price source batch preserved',()=>{
 const a=snapshot(),b=current(a);b.storedInputs.priceStoredAt++;
 assert.throws(()=>validateArchivedAssetR10AgainstCurrent(a,b),/PRICE_SOURCE_DRIFT/);
});
test('R4 exactly compares all six D1 raw factors including previous dates',()=>{
 const a=snapshot();assert.equal(assertArchivedR10MatchesD1Raw(raw(a),a),true);
 const b=raw(a);b.factors[4].previousObservationDate='2026-04-01';
 assert.throws(()=>assertArchivedR10MatchesD1Raw(b,a),/LINEAGE_MISMATCH/);
});
test('R4 preserves genuine zero rather than manufacturing a null',()=>{
 const a=snapshot();a.factors[3].points[2].value=0;
 assert.equal(validateArchivedAssetR10AgainstCurrent(a,current(a)),a);
});
