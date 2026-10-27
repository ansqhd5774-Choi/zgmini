import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {auditUtilitiesMetadataR57} from './forecast-utilities-metadata-r57-readonly.mjs';
import {inspectR57,runR57,summarizeR57} from './stage04-topic06-r57-utilities-recheck.mjs';

// Synthetic fixture based on the publisher's visible labels; never used as
// research input or hardcoded into the production audit / live PC runner.
const fixture=`<html><title>Utilities Market Report 2026</title>
<h1>Utilities Market Report 2026</h1>
<h2>What Is The Utilities Market Size and Share 2026?</h2>
<p>The utilities market size has grown strongly in recent years. It will grow from $7022.7 billion in 2025 to $7411.11 billion in 2026 at a compound annual growth rate (CAGR) of 5.5%.</p>
<h2>What Is The Utilities Market Growth Forecast?</h2>
<p>The utilities market size is expected to see strong growth in the next few years. It will grow to $9392.75 billion in 2030 at a compound annual growth rate (CAGR) of 6.1%.</p>
<h3>Utilities Market Report Forecast Analysis</h3>
<table><tr><th>Report Attribute</th><th>Details</th></tr>
<tr><td>Market Size Value In 2026</td><td>$7411.11 billion</td></tr>
<tr><td>Revenue Forecast In 2035</td><td>$9392.75 billion</td></tr>
<tr><td>Growth Rate</td><td>CAGR of 5.5% from 2026 to 2035</td></tr>
<tr><td>Forecast Period</td><td>2026 - 2030 - 2035</td></tr></table></html>`;

test('R57 separates verified 2026-2030 body from conflicting 2035 metadata',()=>{
  const a=auditUtilitiesMetadataR57(fixture);
  assert.equal(a.source_audit,'NARRATIVE_VERIFIED_METADATA_CONFLICT');
  assert.equal(a.forecast_narrative_pct,6.1);
  assert.equal(a.forecast_table_pct,5.5);
  assert.equal(a.forecast_math_pct,6.103);
  assert.equal(a.historic_math_pct,5.531);
  assert.equal(a.metadata_reported_end_year,2035);
  assert.equal(a.forecast_end_year,2030);
  assert.equal(a.metadata_conflict_preserved,true);
  assert.ok(a.forecast_excerpt.includes('6.1%'));
});

test('R57 rejects unproven publisher contradictions',()=>{
  const edits=[
    ['forecast-size-changed',s=>s.replace('grow to $9392.75','grow to $9592.75')],
    ['table-size-changed',s=>s.replace('Forecast In 2035</td><td>$9392.75','Forecast In 2035</td><td>$9492.75')],
    ['historic-size-changed',s=>s.replace('from $7022.7','from $7422.7')],
    ['forecast-pct-changed',s=>s.replace('of 6.1%.','of 8.1%.')],
    ['metadata-pct-unrelated',s=>s.replace('CAGR of 5.5% from 2026 to 2035','CAGR of 8.5% from 2026 to 2035')],
    ['metadata-year-before-body',s=>s.replaceAll('2035','2029')],
    ['different-heading',s=>s.replaceAll('Utilities Market','Electricity Market')],
    ['forecast-period-disagrees',s=>s.replace('2026 - 2030 - 2035','2026 - 2031 - 2035')],
    ['body-2035-not-2030',s=>s.replace('billion in 2030 at','billion in 2035 at')],
  ];
  for(const [name,change] of edits){
    const a=auditUtilitiesMetadataR57(change(fixture));
    assert.notEqual(a.source_audit,'NARRATIVE_VERIFIED_METADATA_CONFLICT',name);
  }
});

test('R57 inspects only official TBRC URL; broad scope remains review',async()=>{
  const seen=[];
  const result=await inspectR57({
    fetchFn:async url=>{seen.push(url);return {
      ok:true,status:200,url,headers:{get:()=>null},text:async()=>fixture};},
    chooseFn:async(_t,_p,_title,candidates)=>({candidate_id:'C0',scope:'DIRECT',
      index:candidates.findIndex(x=>x.pct===6.1),elapsed_ms:1}),
    modelQueue:fn=>fn(),
  });
  assert.equal(seen.length,1);
  assert.deepEqual(seen,['https://www.thebusinessresearchcompany.com/report/utilities-global-market-report']);
  assert.equal(result.state,'BROAD_SCOPE_REVIEW_REQUIRED');
  assert.equal(result.observed_cagr,6.1);
  assert.equal(result.period,'2026-2030');
  assert.equal(result.sector_cagr,null);
  assert.equal(result.metadata_conflict_preserved,true);
});

test('R57 produces 1 warm-up and 3 measured, without fetching other R56 sources',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'zg-r57-test-'));
  let count=0;
  const got=await runR57({outputPrefix:join(dir,'R57_TEST'),
    inspectFn:async()=>{count++;return {
      url:'https://www.thebusinessresearchcompany.com/report/utilities-global-market-report',
      market_scope:'BROAD_UTILITIES_REVIEW',state:'BROAD_SCOPE_REVIEW_REQUIRED',
      source_audit:'NARRATIVE_VERIFIED_METADATA_CONFLICT',observed_cagr:6.1,
      period:'2026-2030',metadata_conflict_preserved:true,
      source_evidence:{forecast_math_pct:6.103},sector_cagr:null};}});
  assert.equal(count,4);
  assert.equal(got.summary.gate,'UTILITIES_SINGLE_SOURCE_REPEATABLE_REVIEW');
  assert.equal(got.summary.other_r56_sources_refetched,0);
  assert.equal(got.summary.sector_cagr,null);
  const saved=JSON.parse(await readFile(join(dir,'R57_TEST.json'),'utf8'));
  assert.equal(saved.status,'FINISHED_RESEARCH_ONLY');
  assert.equal(saved.rounds.length,4);
});

test('R57 does not turn repeated failures into success',()=>{
  const rounds=[1,2,3,4].map(i=>({round:i,warmup:i===1,total_ms:500,
    result:{observed_cagr:null,source_audit:'INCOMPLETE',period:null,
      metadata_conflict_preserved:true,state:'SOURCE_AUDIT_INCOMPLETE'}}));
  assert.equal(summarizeR57(rounds).gate,'UTILITIES_SINGLE_SOURCE_INCOMPLETE_REVIEW');
  assert.equal(summarizeR57(rounds).observed_cagr,null);
});
