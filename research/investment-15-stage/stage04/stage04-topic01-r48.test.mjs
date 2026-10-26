import test from 'node:test';
import assert from 'node:assert/strict';
import {PUBLISHERS} from './stage04-four-publisher-r37-readonly.mjs';
import {candidateChoiceSchema,ollamaChoose,inspect} from './stage04-topic01-r45-readonly.mjs';
import {discoverR48,summarizeR48} from './stage04-topic01-r48-repeat.mjs';

const pub=id=>PUBLISHERS.find(x=>x.id===id);
const TBRC='https://www.thebusinessresearchcompany.com/report/information-technology-global-market-report';
const candidate=[{pct:8.3,excerpt:'Information technology market forecast CAGR of 8.3% from 2026 to 2030.'}];
const response=(html,status=200)=>({ok:status>=200&&status<300,status,
  headers:{get:()=>null},text:async()=>html});
const auditHtml=`<h1>Information Technology Market Report 2026</h1>
  <h2>What Is The Information Technology Market Growth Forecast?</h2>
  <p>The information technology market will grow to $13806.6 billion in 2030 at a compound annual growth rate (CAGR) of 8.3%.</p>
  <h2>Information Technology Market Report Forecast Analysis</h2>
  <table><tr><td>Market Size Value In 2026</td><td>$10045.24 billion</td></tr>
  <tr><td>Revenue Forecast In 2030</td><td>$13806.6 billion</td></tr>
  <tr><td>Growth Rate</td><td>CAGR of 8.3% from 2026 to 2030</td></tr></table>`;

test('R48 schema constrains one candidate to C0 or NONE; not CAGR integer 8',()=>{
  const one=candidateChoiceSchema(1);
  assert.deepEqual(one.properties.candidate_id.enum,['NONE','C0']);
  assert.deepEqual(candidateChoiceSchema(3).properties.candidate_id.enum,['NONE','C0','C1','C2']);
  assert.deepEqual(one.required,['candidate_id','scope']);
});

test('R48 model receives audited forecast but must output a literal candidate ID',async()=>{
  let calls=0;
  const choose=await ollamaChoose(pub('TBRC'),'Information Technology Market Report 2026',candidate,'gemma3:4b',{
    fetchFn:async(_url,options)=>{
      calls++;
      const request=JSON.parse(options.body);
      assert.equal(request.model,'gemma3:4b');
      assert.deepEqual(request.format.properties.candidate_id.enum,['NONE','C0']);
      assert.match(request.prompt,/C0: FORECAST_CAGR=8\.3%/);
      assert.match(request.prompt,/LABEL, not a number/);
      return {ok:true,json:async()=>({response:'{"candidate_id":"C0","scope":"DIRECT"}',
        total_duration:1_600_000_000})};
    }
  });
  assert.equal(calls,1);assert.equal(choose.index,0);
  assert.equal(choose.candidate_id,'C0');assert.equal(choose.scope,'DIRECT');
});

test('R47 observed numerical hallucination is rejected without coercion',async()=>{
  const bad=()=>({ok:true,json:async()=>({response:'{"candidate_id":"8","scope":"PROXY"}'})});
  await assert.rejects(ollamaChoose(pub('TBRC'),'Information Technology Market Report 2026',candidate,
    'gemma3:4b',{fetchFn:bad}),/OLLAMA_SCHEMA_INVALID/);
});

test('R48 original report R29 audit gives 8.3 and exact future window',async()=>{
  const fetchFn=async(url)=>url.startsWith('https:')?response(auditHtml):{
    ok:true,json:async()=>({response:'{"candidate_id":"C0","scope":"DIRECT"}',
      total_duration:1_700_000_000})};
  const x=await inspect(pub('TBRC'),TBRC,{fetchFn});
  assert.equal(x.state,'DIRECT_PROVISIONAL');assert.equal(x.cagr,8.3);
  assert.equal(x.period,'2026-2030');assert.equal(x.source_audit,'CONSISTENT');
  assert.equal(x.model_candidate_id,'C0');
  assert.ok(x.ollama_ms>=0);
});

test('R48 reports model scope contradiction for review instead of fabricating approval',async()=>{
  const fetchFn=async(url)=>url.startsWith('https:')?response(auditHtml):{
    ok:true,json:async()=>({response:'{"candidate_id":"C0","scope":"PROXY"}'})};
  const x=await inspect(pub('TBRC'),TBRC,{fetchFn});
  assert.equal(x.state,'SCOPE_REVIEW');assert.equal(x.cagr,null);
  assert.equal(x.model_scope,'PROXY');
});

test('Google 429 does not prevent independent Bing search; no subsequent 429 retries',async()=>{
  const engines=[],blocked=new Set();
  const searchFn=async url=>{
    const engine=url.includes('google.com')?'GOOGLE':'BING';engines.push(engine);
    if(engine==='GOOGLE')throw Error('SEARCH_HTTP_429');
    return `<a href="${TBRC}">Official report</a>`;
  };
  const options={fetchFn:async()=>response('catalog unavailable',404),searchFn,blockedSearchEngines:blocked};
  const first=await discoverR48(pub('TBRC'),null,options);
  const second=await discoverR48(pub('TBRC'),null,options);
  assert.deepEqual(engines,['GOOGLE','BING','BING']);
  assert.equal(first.attempts.find(x=>x.engine==='GOOGLE').status,'SEARCH_HTTP_429');
  assert.equal(second.attempts.find(x=>x.engine==='GOOGLE').status,'SKIPPED_PREVIOUS_HTTP_429');
  assert.equal(second.attempts.find(x=>x.engine==='BING').found,1);
  assert.ok(first.candidate_urls.includes(TBRC));
});

test('Speed stability is diagnostic only until four sources resolved',()=>{
  const rounds=[10000,9900,10300,10100].map((total_ms,i)=>({warmup:i===0,total_ms,
    publishers:PUBLISHERS.map(p=>({publisher:p.id,state:p.id==='TBRC'?'DIRECT_PROVISIONAL':'NO_DIRECT_VERIFIED',
      selected:p.id==='TBRC'?{cagr:8.3,url:TBRC,period:'2026-2030'}:null,
      total_ms:Math.round(total_ms/4),search:{catalog_status:'OK',candidate_urls:[],catalog_topic:0},
      inspections:[]}))}));
  const gate=summarizeR48(rounds);
  assert.equal(gate.speed_stable,true);
  assert.equal(gate.successful_publisher_count,1);
  assert.equal(gate.gate,'PARTIAL_SOURCE_AND_DISCOVERY_UNRESOLVED');
});
