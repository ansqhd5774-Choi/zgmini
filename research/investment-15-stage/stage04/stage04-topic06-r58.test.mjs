import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {chooseR58,inspectR58,runR58,summarizeR58} from './stage04-topic06-r58-scope-diagnostic.mjs';

const fakeHtml=`<html><h1>Utilities Market Report 2026</h1>
<h2>What Is The Utilities Market Size and Share 2026?</h2>
The utilities market size has grown strongly in recent years. It will grow from $7022.7 billion in 2025 to $7411.11 billion in 2026 at a compound annual growth rate (CAGR) of 5.5%.
<h2>What Is The Utilities Market Growth Forecast?</h2>
The utilities market size is expected to see strong growth in the next few years. It will grow to $9392.75 billion in 2030 at a compound annual growth rate (CAGR) of 6.1%.
<h3>Utilities Market Report Forecast Analysis</h3><table>
<tr><td>Market Size Value In 2026</td><td>$7411.11 billion</td></tr>
<tr><td>Revenue Forecast In 2035</td><td>$9392.75 billion</td></tr>
<tr><td>Growth Rate</td><td>CAGR of 5.5% from 2026 to 2035</td></tr>
<tr><td>Forecast Period</td><td>2026 - 2030 - 2035</td></tr></table></html>`;
const request=async url=>({ok:true,status:200,url,headers:{get:()=>null},
  text:async()=>fakeHtml});

test('R58 prompt contrasts related proxy with unrelated, without hardcoding a rate',async()=>{
  let prompt='';const result=await chooseR58({english:'Utilities'},
    {id:'TBRC'},'Utilities Market Report 2026',
    [{pct:6.1,excerpt:'The utilities market will grow at a CAGR of 6.1%.'}],
    {fetchFn:async(url,options)=>{prompt=JSON.parse(options.body).prompt;
      assert.equal(url,'http://127.0.0.1:11434/api/generate');
      return {ok:true,json:async()=>({response:JSON.stringify({candidate_id:'C0',scope:'PROXY'})})};}});
  assert.equal(result.scope,'PROXY');
  assert.ok(prompt.includes('Do NOT use UNRELATED merely because'));
  assert.ok(prompt.includes('REPORT_TITLE=Utilities Market Report 2026'));
});

test('R58 does not hide verified publisher CAGR if model says unrelated',async()=>{
  const seen=[];const got=await inspectR58({fetchFn:async url=>{
    seen.push(url);return request(url);},
    modelQueue:fn=>fn(),
    chooseFn:async()=>({candidate_id:'C0',index:0,scope:'UNRELATED',elapsed_ms:10})});
  assert.equal(got.source_audit,'NARRATIVE_VERIFIED_METADATA_CONFLICT');
  assert.equal(got.source_observed_cagr,6.1);
  assert.equal(got.source_period,'2026-2030');
  assert.equal(got.model_selected_cagr,6.1);
  assert.equal(got.state,'SOURCE_VERIFIED_MODEL_SCOPE_DISPUTED');
  assert.equal(got.sector_cagr,null);
  assert.equal(got.sector_eligible,false);
  assert.deepEqual(seen,['https://www.thebusinessresearchcompany.com/report/utilities-global-market-report']);
});

test('R58 accepted model PROXY still never becomes GICS sector CAGR',async()=>{
  const got=await inspectR58({fetchFn:request,modelQueue:fn=>fn(),
    chooseFn:async()=>({candidate_id:'C0',index:0,scope:'PROXY',elapsed_ms:1})});
  assert.equal(got.state,'BROAD_SCOPE_REVIEW_REQUIRED');
  assert.equal(got.model_selected_cagr,6.1);
  assert.equal(got.sector_cagr,null);
});

test('R58 source conflict cannot receive an observed CAGR',async()=>{
  const got=await inspectR58({fetchFn:async url=>({ok:true,status:200,url,
      headers:{get:()=>null},text:async()=>fakeHtml.replace('grow to $9392.75','grow to $9992.75')}),
    chooseFn:async()=>{throw Error('MODEL_MUST_NOT_RUN');}});
  assert.equal(got.state,'SOURCE_AUDIT_INCOMPLETE');
  assert.equal(got.source_observed_cagr,null);
});

test('R58 3 rounds preserve separated source/model decisions and distinct gate',async()=>{
  const tmp=await mkdtemp(join(tmpdir(),'zg-r58-test-'));
  let count=0;
  const out=await runR58({outputPrefix:join(tmp,'R58_RESULT'),
    inspectFn:async()=>{count++;return {state:'SOURCE_VERIFIED_MODEL_SCOPE_DISPUTED',
      source_audit:'NARRATIVE_VERIFIED_METADATA_CONFLICT',source_observed_cagr:6.1,
      source_period:'2026-2030',model_selected_cagr:6.1,
      model_candidate_id:'C0',model_scope:'UNRELATED',sector_cagr:null,
      metadata_conflict_preserved:true};}});
  assert.equal(count,4);
  assert.equal(out.summary.source_repeatable,true);
  assert.equal(out.summary.model_repeatable,false);
  assert.equal(out.summary.gate,'SOURCE_REPEATABLE_MODEL_SCOPE_REVIEW');
  assert.equal(out.summary.model_cagr,null);
  assert.equal((JSON.parse(await readFile(join(tmp,'R58_RESULT.json'),'utf8'))).rounds.length,4);
});

test('R58 never promotes missing source evidence even if model looks positive',()=>{
  const rows=[1,2,3,4].map(n=>({warmup:n===1,total_ms:1000,result:{
    source_observed_cagr:null,source_period:null,source_audit:'INCOMPLETE',
    model_selected_cagr:6.1,model_scope:'PROXY',state:'BROAD_SCOPE_REVIEW_REQUIRED'}}));
  assert.equal(summarizeR58(rows).gate,'SOURCE_RECHECK_REQUIRED');
  assert.equal(summarizeR58(rows).source_cagr,null);
});
