import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {auditStoredSecFactsCoverage,SEC_FACTS_COVERAGE_SCHEMA}
  from '../scripts/pc-writer/earnings-r5-sec-facts-coverage-readonly.mjs';

const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const fact=(start,end,filed,val)=>({start,end,filed,form:'10-Q',val,fy:2026,fp:'Q3',accn:'0000000001-26-000001'});
const sample=(cik,{includePrior=true,conflict=false}={})=>{
  const rows=[fact('2026-07-01','2026-09-30','2026-11-01',200)];
  if(conflict)rows.push(fact('2026-07-01','2026-09-30','2026-11-01',201));
  if(includePrior)rows.push(fact('2025-07-01','2025-09-30','2025-11-01',100));
  return {cik:Number(cik),facts:{'us-gaap':{
    Revenues:{units:{USD:rows}},
    EarningsPerShareDiluted:{units:{'USD/shares':rows.map(x=>({...x,val:x.val/100}))}},
  }}};
};
const pinned=(doc)=>{
  const bytes=Buffer.from(JSON.stringify(doc),'utf8');
  return {bytes,expectedSha256:digest(bytes)};
};

test('stored-only audit derives per-metric coverage over the provided CIK universe',()=>{
  const rows=new Map([['0000000001',pinned(sample(1))],
    ['0000000002',pinned(sample(2,{includePrior:false}))]]);
  const result=auditStoredSecFactsCoverage({
    issuerCiks:['3','1','2'],asOf:'2026-11-17',
    readSource:cik=>rows.get(cik),
  });
  assert.equal(result.schemaVersion,SEC_FACTS_COVERAGE_SCHEMA);
  assert.equal(result.universeIssuerCount,3);
  assert.equal(result.sourceFilesFound,2);
  assert.equal(result.sourceFilesMissing,1);
  assert.equal(result.sourceFilesRejected,0);
  assert.equal(result.providedSha256Matched,2);
  assert.equal(result.metrics.revenue.currentIssuerCount,2);
  assert.equal(result.metrics.revenue.comparableIssuerCount,1);
  assert.equal(result.metrics.revenue.currentCoverage,2/3);
  assert.equal(result.metrics.eps.comparableIssuerCount,1);
  assert.equal(result.metrics.netIncome.comparableIssuerCount,0);
  assert.equal(result.sourceArchiveShaVerified,false);
  assert.equal(result.providerCalls,0);
  assert.equal(result.sqliteWrites,0);
  assert.equal(result.d1Writes,0);
  assert.ok(!JSON.stringify(result).includes('0000000001'));
});

test('computed SHA is not treated as independently pinned or official archive vintage',()=>{
  const row=pinned(sample(1));
  const result=auditStoredSecFactsCoverage({
    issuerCiks:['1'],asOf:'2026-11-17',
    readSource:()=>({bytes:row.bytes}),
  });
  assert.equal(result.sourceFilesFound,1);
  assert.equal(result.contentSha256Computed,1);
  assert.equal(result.providedSha256Matched,0);
  assert.equal(result.status,'PARTIAL_FILES_OR_PROVENANCE_UNVERIFIED');
  assert.equal(result.sourceArchiveShaVerified,false);
});

test('mismatching pinned SHA and invalid JSON fail closed without fictitious coverage',()=>{
  const good=pinned(sample(1));
  const result=auditStoredSecFactsCoverage({
    issuerCiks:['1','2'],asOf:'2026-11-17',
    readSource:cik=>cik==='0000000001'
      ? {...good,expectedSha256:'f'.repeat(64)}
      : {bytes:Buffer.from('{not valid JSON'),expectedSha256:null},
  });
  assert.equal(result.sourceFilesFound,0);
  assert.equal(result.sourceFilesRejected,2);
  assert.equal(result.aggregateContentSha256,null);
  assert.equal(result.metrics.revenue.currentIssuerCount,0);
  assert.equal(result.metrics.revenue.comparableCoverage,0);
});

test('same-filed conflicting SEC facts are missing rather than arbitrarily chosen',()=>{
  const result=auditStoredSecFactsCoverage({
    issuerCiks:['1'],asOf:'2026-11-17',
    readSource:()=>pinned(sample(1,{conflict:true})),
  });
  assert.equal(result.sourceFilesFound,1);
  assert.equal(result.metrics.revenue.currentIssuerCount,0);
  assert.equal(result.metrics.revenue.comparableIssuerCount,0);
  assert.equal(result.metrics.revenue.conflictedIssuerCount,1);
});

test('duplicate issuer keys, invalid input and nonexistent date are rejected',()=>{
  const base={asOf:'2026-11-17',readSource:()=>null};
  assert.throws(()=>auditStoredSecFactsCoverage({...base,issuerCiks:['1','0000000001']}),/DUPLICATE/);
  assert.throws(()=>auditStoredSecFactsCoverage({...base,issuerCiks:['abc']}),/CIK_INVALID/);
  assert.throws(()=>auditStoredSecFactsCoverage({...base,issuerCiks:['1'],asOf:'bad'}),/ARGUMENT_INVALID/);
  assert.throws(()=>auditStoredSecFactsCoverage({...base,issuerCiks:['1'],asOf:'2026-02-30'}),/ARGUMENT_INVALID/);
});

test('older Q2 comparison cannot inflate coverage of latest Q3 unpaired issuer',()=>{
  const current=fact('2026-07-01','2026-09-30','2026-11-01',300);
  const older=fact('2026-04-01','2026-06-30','2026-08-01',200);
  const olderPrior=fact('2025-04-01','2025-06-30','2025-08-01',100);
  const source=sample(1);
  source.facts['us-gaap'].Revenues.units.USD=[current,older,olderPrior];
  const report=auditStoredSecFactsCoverage({
    issuerCiks:['1'],asOf:'2026-11-17',
    readSource:()=>pinned(source),
  });
  assert.equal(report.metrics.revenue.currentIssuerCount,1);
  assert.equal(report.metrics.revenue.comparableIssuerCount,0);
  assert.equal(report.metrics.revenue.currentWithoutAlignedPriorIssuerCount,1);
  assert.equal(report.metrics.revenue.olderPairExcludedIssuerCount,1);
  assert.equal(report.metrics.revenue.currentCoverage,1);
  assert.equal(report.metrics.revenue.comparableCoverage,0);
});

test('latest quarter with an exact prior remains comparable',()=>{
  const report=auditStoredSecFactsCoverage({
    issuerCiks:['1'],asOf:'2026-11-17',readSource:()=>pinned(sample(1)),
  });
  assert.equal(report.metrics.revenue.currentIssuerCount,1);
  assert.equal(report.metrics.revenue.comparableIssuerCount,1);
  assert.equal(report.metrics.revenue.olderPairExcludedIssuerCount,0);
  assert.equal(report.providedSha256Matched,1);
  assert.equal(report.status,'ALL_FILES_PROVIDED_SHA_MATCH_ARCHIVE_UNVERIFIED');
  assert.equal(report.sourceArchiveShaVerified,false);
});
