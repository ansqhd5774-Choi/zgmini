import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PUBLISHERS,parseUrlSeeds} from './stage04-four-publisher-r37-readonly.mjs';
import {TARGET,officialReportUrl,searchLinks,classifyTitle,discover,inspect,researchPublisher,summarizeRepeats} from './stage04-topic01-r45-readonly.mjs';

const p=id=>PUBLISHERS.find(x=>x.id===id);
const response=(text,status=200,url='')=>({ok:status>=200&&status<300,status,url,
  headers:{get:()=>null},text:async()=>text});
const TBRC='https://www.thebusinessresearchcompany.com/report/information-technology-global-market-report';
const BRI='https://www.businessresearchinsights.com/market-reports/information-technology-it-market-108885';
const BRI_OTHER='https://www.businessresearchinsights.com/market-reports/healthcare-information-technology-market-127777';
const SKY='https://www.skyquestt.com/report/it-services-market';

test('known official report URLs, with BRI market-id suffix, are accepted',()=>{
  assert.equal(officialReportUrl(TBRC,p('TBRC')),true);
  assert.equal(officialReportUrl(BRI,p('BRI')),true);
  assert.equal(officialReportUrl(SKY,p('SkyQuest')),true);
  assert.equal(officialReportUrl('https://evil.example/report/information-technology-market',p('SkyQuest')),false);
  assert.equal(officialReportUrl('http://www.precedenceresearch.com/it-services-market',p('Precedence')),false);
});
test('Google-style wrapped URL and official direct link can be parsed',()=>{
  const q=encodeURIComponent(BRI);
  const html=`<a href="/url?q=${q}&amp;sa=U">A</a><a href="${BRI_OTHER}">B</a>`;
  const found=searchLinks(html,'https://www.google.com/search?q=it',p('BRI'));
  assert.deepEqual(found,[BRI,BRI_OTHER]);
});
test('whole market is distinct from narrow IT services/health IT',()=>{
  assert.equal(classifyTitle(TBRC,'Global Information Technology Market Report 2026',p('TBRC')),'DIRECT_MARKET_SCOPE_CANDIDATE');
  assert.equal(classifyTitle(BRI,'Information Technology (IT) Market Size 2026',p('BRI')),'DIRECT_MARKET_SCOPE_CANDIDATE');
  assert.equal(classifyTitle(BRI_OTHER,'Healthcare Information Technology Market',p('BRI')),'PROXY_OR_DIFFERENT_SCOPE');
  assert.equal(classifyTitle(SKY,'IT Services Market',p('SkyQuest')),'PROXY_OR_DIFFERENT_SCOPE');
});
test('search falls back when first engine finds only a submarket',async()=>{
  const urls=[];
  const out=await discover(p('BRI'),null,{searchFn:async url=>{
    urls.push(url);return url.includes('google')?`<a href="${BRI_OTHER}">Narrow</a>`:`<a href="${BRI}">Whole</a>`;
  }});
  assert.equal(urls.length,2);
  assert.equal(out.search_state,'DISCOVERED');
  assert.equal(out.candidate_urls[0],BRI);
});
test('seeds supplement live search but do not count as search discovery',async()=>{
  const out=await discover(p('TBRC'),TBRC,{searchFn:async()=>'<html>No official results</html>'});
  assert.equal(out.search_state,'SEED_ONLY_SEARCH_INCOMPLETE');
  assert.deepEqual(out.candidate_urls,[TBRC]);
});
test('the source matrix supplies URLs but not any cached growth rates',async()=>{
  const markdown=await readFile(new URL('../STAGE04_R35_FOUR_MEDIA_CAGR_MATRIX_20261026.md',import.meta.url),'utf8');
  const topic=parseUrlSeeds(markdown).find(x=>x.name===TARGET.name);
  assert.equal(topic.seeds.TBRC,TBRC);assert.equal(topic.seeds.BRI,BRI);
  assert.equal('rates' in topic,false);
  assert.ok(!JSON.stringify(topic).includes('8.30'));
});
test('no literal source CAGR: never invoke model or invent zero',async()=>{
  let called=0;
  const out=await inspect(p('BRI'),BRI,{fetchFn:async()=>response('<h1>Information Technology IT Market</h1><p>No projections.</p>'),
    chooseFn:async()=>{called++;return {index:0,scope:'DIRECT'};}});
  assert.equal(out.state,'FAILED');assert.equal(out.cagr,null);assert.equal(called,0);
});
test('correct article and model agree: published direct market candidate only',async()=>{
  const out=await inspect(p('BRI'),BRI,{fetchFn:async()=>response('<h1>Information Technology IT Market</h1><p>The Information Technology IT Market CAGR of 11% during 2026 to 2035.</p>'),
    chooseFn:async()=>({index:0,scope:'DIRECT',elapsed_ms:38})});
  assert.equal(out.state,'DIRECT_PROVISIONAL');assert.equal(out.cagr,11);assert.equal(out.period,'2026-2035');
  assert.equal(out.ollama_ms,38);
});
test('a narrow report remains a proxy even if Ollama calls it DIRECT',async()=>{
  const out=await inspect(p('SkyQuest'),SKY,{fetchFn:async()=>response('<h1>IT Services Market</h1><p>IT Services Market CAGR of 9.6% from 2026 to 2033.</p>'),
    chooseFn:async()=>({index:0,scope:'DIRECT'})});
  assert.equal(out.state,'PROXY_ONLY');assert.equal(out.cagr,null);
});
test('Ollama disagreeing with exact title requires review, not forced success',async()=>{
  const out=await inspect(p('BRI'),BRI,{fetchFn:async()=>response('<h1>Information Technology IT Market</h1><p>Information Technology IT Market CAGR of 11% from 2026 to 2035.</p>'),
    chooseFn:async()=>({index:0,scope:'PROXY'})});
  assert.equal(out.state,'SCOPE_REVIEW');assert.equal(out.cagr,null);
});
test('publisher HTTP 403 is a source access issue, not no report',async()=>{
  const out=await researchPublisher(p('BRI'),BRI,{searchFn:async()=>'<html>No results</html>',
    fetchFn:async()=>response('Forbidden',403)});
  assert.equal(out.state,'SOURCE_PARTIAL_BLOCKED');
  assert.equal(out.inspections[0].state,'SOURCE_BLOCKED');
});
test('two different direct market reports at the same publisher never silently pick one',async()=>{
  const other='https://www.businessresearchinsights.com/market-reports/information-technology-market-125062';
  const out=await researchPublisher(p('BRI'),BRI,{
    searchFn:async()=>`<a href="${BRI}">A</a><a href="${other}">B</a>`,
    fetchFn:async url=>response(`<h1>Information Technology Market</h1><p>Information Technology Market CAGR of ${url===BRI?11:4.08}% from 2026 to 2035.</p>`),
    chooseFn:async()=>({index:0,scope:'DIRECT'})
  });
  assert.equal(out.inspections.length,2);
  assert.equal(out.state,'MULTIPLE_DIRECT_REPORTS_REVIEW');
  assert.equal(out.selected,null);
});
function makeRound(i,t,states){return {index:i,warmup:i===1,total_ms:t,
  publishers:PUBLISHERS.map(p=>({publisher:p.id,state:states[p.id],total_ms:Math.round(t/4),
    selected:states[p.id]==='DIRECT_PROVISIONAL'?{url:TBRC,cagr:8.3,period:'2026-2030'}:null}))};}
test('three stable measured runs still require explicit scope review',()=>{
  const states={TBRC:'DIRECT_PROVISIONAL',BRI:'SOURCE_PARTIAL_BLOCKED',SkyQuest:'NO_DIRECT_VERIFIED',Precedence:'NO_DIRECT_VERIFIED'};
  const x=summarizeRepeats([makeRound(1,2000,states),makeRound(2,1800,states),makeRound(3,2000,states),makeRound(4,2100,states)]);
  assert.equal(x.gate,'PARTIAL_SCOPE_REVIEW_REQUIRED');assert.equal(x.median_ms,2000);assert.equal(x.speed_stable,true);
});
test('inconsistent results or large speed deviation cannot advance topic',()=>{
  const states={TBRC:'DIRECT_PROVISIONAL',BRI:'SOURCE_PARTIAL_BLOCKED',SkyQuest:'NO_DIRECT_VERIFIED',Precedence:'NO_DIRECT_VERIFIED'};
  const x=summarizeRepeats([makeRound(1,2000,states),makeRound(2,1000,states),makeRound(3,2000,states),makeRound(4,4000,states)]);
  assert.equal(x.gate,'UNSTABLE_SPEED');
  const changed={...states,TBRC:'NO_DIRECT_VERIFIED'};
  const y=summarizeRepeats([makeRound(1,2000,states),makeRound(2,1900,states),makeRound(3,2000,states),makeRound(4,2100,changed)]);
  assert.equal(y.gate,'UNSTABLE_RESULTS');
});
