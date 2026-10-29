import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {compareR85Runs,auditOneR82Run,auditR85ConsoleFiles} from './stage04-r85-repeat-audit.mjs';

const hosts = {
  TBRC:'www.thebusinessresearchcompany.com',
  SkyQuest:'www.skyquestt.com',
  Precedence:'www.precedenceresearch.com'
};

function fixture(delta=0){
  const results=Array.from({length:21},(_,i)=>{
    const publishers=Object.keys(hosts).map((publisher,j)=>({
      publisher, state:'PASS', growth_pct:5+i*0.1+j+delta,
      metric:'FORECAST_CAGR', observed_at:'2026-10-29T00:00:00Z',
      report_url:`https://${hosts[publisher]}/report/example-${i}`,
      report_requests:1,ollama_generations:1
    }));
    return {topic_id:`topic-${i+1}`,keyword:`topic ${i+1}`,
      state:'RESEARCH_MEAN_CALCULABLE',metric:'FORECAST_CAGR',
      publishers,required_source_count:2,source_count:3,mean_pct:6+i*0.1+delta,warnings:[]};
  });
  return {run_state:'COMPLETED',started_at:'2026-10-29T00:00:00Z',
    topics_total:21,topics_done:21,means_calculable:21,
    historical_cagr_used:false,score_or_trade:'NONE',results};
}

test('3 fresh valid 21-topic reports pass; repeated publisher calls never count as additional sources',()=>{
  const result=compareR85Runs([fixture(),at(1),at(2)]);
  assert.equal(result.result,'PASS_THREE_21_TOPIC_RUNS');
  assert.equal(result.runs.length,3);
  assert.ok(result.runs.every(r=>r.average_ready===21 && r.verified_cells===63));
  assert.equal(result.between_run_mean_changes.length,0);
});

test('one missing publisher per theme still calculates a valid 2-source average',()=>{
  const x=fixture();
  for(const row of x.results){
    const p=row.publishers[2];p.state='SOURCE_OR_MODEL_FAILED';p.growth_pct=null;
    row.source_count=2;row.mean_pct-=0.5;
  }
  const result=auditOneR82Run(x,1);
  assert.equal(result.pass,true);
  assert.equal(result.two_publisher_means,21);
  assert.equal(result.failed_cells,21);
});

test('a theme with only one publisher stays incomplete and never becomes zero',()=>{
  const x=fixture();
  for (const p of x.results[0].publishers.slice(1)){p.state='FAILED';p.growth_pct=null;}
  x.results[0].source_count=1;x.results[0].mean_pct=null;
  x.results[0].state='INSUFFICIENT_INDEPENDENT_PUBLISHERS';x.means_calculable=20;
  const result=compareR85Runs([fixture(),Object.assign(x,{started_at:'2026-10-29T00:01:00Z'}),at(2)]);
  assert.equal(result.result,'INCOMPLETE_REVIEW_REQUIRED');
  assert.ok(result.failures.some(x=>x.includes('LESS_THAN_TWO_VERIFIED_PUBLISHERS')));
});

test('different fresh forecast values are recorded as drift but not rejected or averaged across runs',()=>{
  const result=compareR85Runs([fixture(),at(1,0.5),at(2,1)]);
  assert.equal(result.result,'PASS_THREE_21_TOPIC_RUNS');
  assert.equal(result.between_run_mean_changes.length,21);
  assert.deepEqual(result.between_run_mean_changes[0].means_pct,[6,6.5,7]);
  assert.equal(result.between_run_mean_changes[0].range_pct_points,1);
});

test('duplicate publisher and historical CAGR import are independently blocked',()=>{
  const x=fixture();
  x.results[0].publishers[1].publisher='TBRC';
  x.historical_cagr_used=true;
  const report=auditOneR82Run(x,1);
  assert.equal(report.pass,false);
  assert.ok(report.failures.includes('HISTORICAL_CAGR_IMPORT_NOT_DISABLED'));
  assert.ok(report.failures.some(x=>x.includes('PUBLISHER_ROSTER_INVALID')));
});

test('R85 reads three real console paths and preserves individual JSON/TXT audit outputs',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'zgmini-r85-audit-'));
  try {
    const logs=[];
    for(let i=1;i<=3;i++){
      const j=join(dir,`run-${i}.json`),l=join(dir,`run-${i}.txt`);
      await writeFile(j,JSON.stringify(at(i)),'utf8');
      await writeFile(l,`REPORT=STAGE04_R82\r\nR82_REGRESSION_TESTS=PASS\r\nSEND_RESULT_JSON=${j}\r\nEXIT_CODE=0\r\n`,'utf8');
      logs.push(l);
    }
    const prefix=join(dir,'R85');
    const result=await auditR85ConsoleFiles(logs,prefix);
    assert.equal(result.result,'PASS_THREE_21_TOPIC_RUNS');
    assert.equal(JSON.parse(await readFile(prefix+'_RESULT.json','utf8')).verified_all_runs,true);
    assert.match(await readFile(prefix+'_RESULT.txt','utf8'),/ALL_RUNS_VERIFIED=true/);
  } finally {await rm(dir,{recursive:true,force:true});}
});

function at(minutes,delta=0){
  const x=fixture(delta);
  x.started_at=new Date(Date.parse(x.started_at)+minutes*60000).toISOString();
  return x;
}

test('three identical timestamps or output copies cannot masquerade as independent runs',()=>{
  const result=compareR85Runs([fixture(),fixture(),fixture()]);
  assert.equal(result.result,'INCOMPLETE_REVIEW_REQUIRED');
  assert.ok(result.failures.includes('INDEPENDENT_EXECUTION_TIMESTAMPS_NOT_DISTINCT'));
});
