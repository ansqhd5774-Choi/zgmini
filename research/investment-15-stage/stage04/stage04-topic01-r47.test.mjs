import test from 'node:test';
import assert from 'node:assert/strict';
import {PUBLISHERS} from './stage04-four-publisher-r37-readonly.mjs';
import {ollamaChoose} from './stage04-topic01-r45-readonly.mjs';
import {explainModelResponse,runR47} from './stage04-topic01-r47-ollama-diagnostic.mjs';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const candidate=[{pct:8.3,excerpt:'Information technology market forecast CAGR of 8.3% from 2026 to 2030.'}];

test('schema diagnostics distinguishes a valid response',()=>{
  const x=explainModelResponse({response:'{"index":0,"scope":"DIRECT"}',
    total_duration:1_800_000_000,done_reason:'stop'},1);
  assert.equal(x.status,'JSON_PARSED');
  assert.equal(x.index_in_range,true);assert.equal(x.scope_allowed,true);
  assert.equal(x.keys_exact,true);assert.equal(x.model_total_ms,1800);
});

test('schema diagnostics exposes a one-based index without silently choosing',()=>{
  const x=explainModelResponse({response:'{"index":1,"scope":"DIRECT"}'},1);
  assert.equal(x.index,1);assert.equal(x.index_in_range,false);
});

test('schema diagnostics catches extra properties and incorrect types',()=>{
  const x=explainModelResponse({response:'{"index":"0","scope":"direct","rate":8.3}'},1);
  assert.equal(x.index_integer,false);assert.equal(x.scope_allowed,false);
  assert.equal(x.keys_exact,false);
});

test('malformed JSON reports parse error and limited raw excerpt',()=>{
  const x=explainModelResponse({response:'not json'},1);
  assert.equal(x.status,'JSON_PARSE_ERROR');assert.equal(x.response_sample,'not json');
});

test('R46 exact Ollama request is reproduced; out-of-range index remains rejected',async()=>{
  const p=PUBLISHERS.find(x=>x.id==='TBRC');let calls=0;
  const fetchFn=async (_url,options)=>{
    calls++;
    const request=JSON.parse(options.body);
    assert.equal(request.model,'gemma3:4b');
    assert.equal(request.stream,false);
    assert.equal(request.format.required.join(','),'index,scope');
    return {ok:true,status:200,json:async()=>({response:'{"index":1,"scope":"DIRECT"}'})};
  };
  await assert.rejects(ollamaChoose(p,'Information Technology Market',candidate,'gemma3:4b',{fetchFn}),
    /OLLAMA_SCHEMA_INVALID/);
  assert.equal(calls,1);
});

test('one-shot diagnosis records raw model result without converting failure to CAGR success',async()=>{
  const html=`<h1>Information Technology Market</h1>
   <h2>What Is The Information Technology Market Growth Forecast?</h2>
   <p>The information technology market will grow to $13806.6 billion in 2030 at a compound annual growth rate (CAGR) of 8.3%.</p>
   <h2>Information Technology Market Report Forecast Analysis</h2>
   <p>Market Size Value In 2026 $10045.24 billion Revenue Forecast In 2030 $13806.6 billion Growth Rate CAGR of 8.3% from 2026 to 2030</p>`;
  let report=0,ollama=0;
  const fakeFetch=async url=>{
    if(url.includes('thebusinessresearchcompany.com')){
      report++;return new Response(html,{status:200,headers:{'content-type':'text/html'}});
    }
    if(url==='http://127.0.0.1:11434/api/generate'){
      ollama++;return new Response(JSON.stringify({response:'{"index":1,"scope":"DIRECT"}',
        total_duration:1_200_000_000}),{status:200,headers:{'content-type':'application/json'}});
    }
    throw Error('UNEXPECTED_URL');
  };
  const dir=await mkdtemp(join(tmpdir(),'zgmini-r47-'));
  try{
    const file=join(dir,'R47_RESULT.txt');const result=await runR47({fetchFn:fakeFetch,outputFile:file});
    const log=await readFile(file,'utf8');
    assert.equal(report,1);assert.equal(ollama,1);
    assert.equal(result.modelError,'OLLAMA_SCHEMA_INVALID');
    assert.ok(log.includes('MODEL_INDEX_IN_RANGE=false'));
    assert.ok(log.includes('STATUS=DIAGNOSTIC_COMPLETE'));
    assert.ok(log.includes('FORECAST_NARRATIVE_PCT=8.3'));
  }finally{await rm(dir,{recursive:true,force:true});}
});
