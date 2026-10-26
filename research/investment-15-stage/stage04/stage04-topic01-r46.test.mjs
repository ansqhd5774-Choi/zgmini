import test from 'node:test';
import assert from 'node:assert/strict';
import {PUBLISHERS} from './stage04-four-publisher-r37-readonly.mjs';
import {inspect,searchLinks} from './stage04-topic01-r45-readonly.mjs';
import {catalogLinks,searchBodyProfile,discoverR46,summarizeR46} from './stage04-topic01-r46-catalog-repeat.mjs';

const p=id=>PUBLISHERS.find(x=>x.id===id);
const TBRC='https://www.thebusinessresearchcompany.com/report/information-technology-global-market-report';
const BRI='https://www.businessresearchinsights.com/market-reports/information-technology-it-market-108885';
const response=(html,status=200,url='')=>({ok:status>=200&&status<300,status,url,
  headers:{get:()=>null},text:async()=>html});

function fullReport(){return `<h1>Information Technology Market</h1>
  <h2>What Is The Information Technology Market Size and Share 2026?</h2>
  <p>The information technology market size will grow from $9348.7 billion in 2025 to $10045.24 billion in 2026 at a compound annual growth rate (CAGR) of 7.5%. This is the historic period.</p>
  <h2>What Is The Information Technology Market Growth Forecast?</h2>
  <p>The information technology market will grow to $13806.6 billion in 2030 at a compound annual growth rate (CAGR) of 8.3%. This is the forecast period.</p>
  <h2>Information Technology Market Report Forecast Analysis</h2>
  <table><tr><td>Market Size Value In 2026</td><td>$10045.24 billion</td></tr>
  <tr><td>Revenue Forecast In 2030</td><td>$13806.6 billion</td></tr>
  <tr><td>Growth Rate</td><td>CAGR of 8.3% from 2026 to 2030</td></tr></table>`;}

test('R46: historical 7.5 must not be chosen instead of live audited 8.3 forecast',async()=>{
  let presented=[];
  const x=await inspect(p('TBRC'),TBRC,{fetchFn:async()=>response(fullReport()),
    chooseFn:async(_p,_title,candidates)=>{presented=candidates;
      return {index:0,scope:'DIRECT',elapsed_ms:12};}});
  assert.equal(x.state,'DIRECT_PROVISIONAL');
  assert.equal(x.cagr,8.3);assert.equal(x.period,'2026-2030');
  assert.equal(x.source_audit,'CONSISTENT');
  assert.deepEqual(presented.map(y=>y.pct),[8.3]);
  assert.ok(presented.every(y=>!y.excerpt.includes('7.5%')));
});

test('R46: arithmetic source conflict prevents Ollama from overwriting it',async()=>{
  let called=false;
  const x=await inspect(p('TBRC'),TBRC,{fetchFn:async()=>response(fullReport().replaceAll('13806.6','24000')),
    chooseFn:async()=>{called=true;return {index:0,scope:'DIRECT'};}});
  assert.equal(x.state,'SOURCE_CONFLICT');assert.equal(called,false);
});

test('R46: proxy never wastes Ollama request or creates a whole-IT CAGR',async()=>{
  let called=false;
  const sky='https://www.skyquestt.com/report/it-services-market';
  const x=await inspect(p('SkyQuest'),sky,{fetchFn:async()=>response('<h1>IT Services Market</h1><p>CAGR of 9.6%</p>'),
    chooseFn:async()=>{called=true;return {index:0,scope:'DIRECT'};}});
  assert.equal(x.state,'PROXY_ONLY');assert.equal(x.cagr,null);assert.equal(called,false);
});

test('R46: Bing base64 redirect unwraps only official domain report URLs',()=>{
  const encoded='a1'+Buffer.from(BRI).toString('base64url');
  const other='a1'+Buffer.from('https://malicious.example/report/information-technology-it-market-108885').toString('base64url');
  const html=`<a href="https://www.bing.com/ck/a?!&amp;u=${encoded}&amp;ntb=1">it</a><a href="https://www.bing.com/ck/a?u=${other}">spam</a>`;
  assert.deepEqual(searchLinks(html,'https://www.bing.com/search?q=it',p('BRI')),[BRI]);
});

test('R46: official catalog extracts topical reports from links and embedded script paths',()=>{
  const html='<a href="/report/information-technology-global-market-report">IT</a>'+
    '<script>data="\\/report\\/information-technology-management-market-report"</script>'+
    '<a href="https://evil.example/report/information-technology-market">not official</a>';
  const links=catalogLinks(html,'https://www.thebusinessresearchcompany.com/reports/information-technology-market-research',p('TBRC'));
  assert.ok(links.includes(TBRC));
  assert.ok(links.includes('https://www.thebusinessresearchcompany.com/report/information-technology-management-market-report'));
  assert.ok(links.every(x=>x.startsWith('https://www.thebusinessresearchcompany.com/report/')));
});

test('R46: successful HTTP 200 with Google enablejs page is explicitly classified',()=>{
  const x=searchBodyProfile('<a href="/httpservice/retry/enablejs">Enable JS</a>','GOOGLE');
  assert.equal(x.gate,'JS_REQUIRED');assert.equal(x.anchors,1);
});

test('R46: catalog 403 is recorded, next round does not retry that catalog',async()=>{
  const blocked=new Set();let attempts=0;
  const fetchFn=async()=>{attempts++;return response('Forbidden',403);};
  const fn=async()=>'<a href="/httpservice/retry/enablejs">js</a>';
  const a=await discoverR46(p('BRI'),BRI,{fetchFn,searchFn:fn,blockedCatalogs:blocked});
  const b=await discoverR46(p('BRI'),BRI,{fetchFn,searchFn:fn,blockedCatalogs:blocked});
  assert.equal(attempts,1);
  assert.equal(a.catalog_status,'CATALOG_HTTP_403');
  assert.equal(b.catalog_status,'CATALOG_SKIPPED_PREVIOUS_HTTP_403');
  assert.deepEqual(a.candidate_urls,[BRI]);
  assert.equal(a.search_state,'SEED_ONLY_SEARCH_INCOMPLETE');
});

test('R46: seeded URL alone cannot pass even with stable diagnostic speed',()=>{
  const rounds=[10000,9900,10200,10050].map((ms,i)=>({warmup:i===0,total_ms:ms,
    publishers:PUBLISHERS.map(z=>({publisher:z.id,total_ms:Math.round(ms/4),
      state:z.id==='TBRC'?'DIRECT_PROVISIONAL':'SOURCE_PARTIAL_BLOCKED',
      selected:z.id==='TBRC'?{url:TBRC,cagr:8.3,period:'2026-2030'}:null,
      search:{catalog_status:'CATALOG_HTTP_403',candidate_urls:[],catalog_topic:0},
      inspections:[{state:'SOURCE_BLOCKED',error:'REPORT_HTTP_403'}]}))}));
  const s=summarizeR46(rounds);
  assert.equal(s.speed_stable,true);
  assert.equal(s.successful_publisher_count,1);
  assert.equal(s.gate,'PARTIAL_SOURCE_AND_DISCOVERY_UNRESOLVED');
  assert.equal(s.diagnostic_speed_only,true);
});
