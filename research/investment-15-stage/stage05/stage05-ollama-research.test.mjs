import test from 'node:test';
import assert from 'node:assert/strict';
import {readStage05Candidates,runStage05OllamaResearch} from './stage05-ollama-research.mjs';

const url='https://example.org/official-report';
const fixture=()=>({
  version:'STAGE05_USER_CONFIRMED_HANDOFF_R89',
  status:'READY_FOR_OLLAMA_RESEARCH',asOfDate:'2026-10-29',
  coverage:{approvedThemes:9,userConfirmed:1},
  ollamaInput:{stage01MarketRisk:'CAUTION',candidates:[{
    themeId:'approved-12',theme:'로봇·자동화',
    stage02Score:50,stage03Score:60}]},
});
const report=link=>({themes:[{
  themeId:'approved-12',risks:['출처 한계'],sources:[link],
  technologies:[{name:'핵심 기술',demand:'공식 문서 근거',
    commercialization:'초기',alternatives:'대체 가능',
    sources:[link]}],companies:[{name:'관련 기업',exposure:'사업 노출',
    sources:[link]}]}],limitations:[]});

function mocks({fakeCitation=false}={}){
  let round=0;
  const calls={chat:0,search:0,fetch:0};
  const chat=async request=>{
    calls.chat++;
    if(request.tools){
      round++;
      if(round===1)return {message:{content:'',tool_calls:[
        {function:{name:'web_search',arguments:{query:'공식 로봇 자료'}}}]}};
      if(round===2)return {message:{content:'',tool_calls:[
        {function:{name:'web_fetch',arguments:{url}}}]}};
      return {message:{content:'완료',tool_calls:[]}};
    }
    return {message:{content:JSON.stringify(report(fakeCitation
      ?'https://fabricated.example/not-read':url))}};
  };
  return {calls,chat,
    webSearch:async()=>{calls.search++;return {results:[{title:'공식 보고서',
      url,content:'근거'}]};},
    webFetch:async()=>{calls.fetch++;return {title:'보고서',content:'공식 원문'};}};
}

test('user confirmation absent: no model or web call',async()=>{
  const d=fixture();d.status='BLOCKED_USER_CONFIRMATION_OR_PRIOR_RESULTS';
  d.ollamaInput=null;
  const m=mocks();
  const r=await runStage05OllamaResearch({input:d,model:'mock',...m});
  assert.equal(r.status,'BLOCKED_INPUT_NOT_READY');
  assert.deepEqual(m.calls,{chat:0,search:0,fetch:0});
});
test('user-confirmed themes proceed to technology research without auto selection or M4/S5',async()=>{
  const d=fixture(),m=mocks();
  const r=await runStage05OllamaResearch({input:d,model:'mock',...m});
  assert.equal(r.status,'RESEARCH_OUTPUT_WITH_FETCHED_URLS');
  assert.deepEqual(r.selectedThemes.map(x=>x.themeId),['approved-12']);
  assert.equal(m.calls.chat,4);
  assert.equal(m.calls.search,1);
  assert.equal(m.calls.fetch,1);
  assert.equal('S5'in r.selectedThemes[0],false);
});
test('duplicate or nonnumeric candidate inputs are rejected',()=>{
  const d=fixture();d.ollamaInput.candidates.push({...d.ollamaInput.candidates[0]});
  assert.throws(()=>readStage05Candidates(d),/CANDIDATES_CONTRACT_INVALID/);
  d.ollamaInput.candidates.pop();
  d.ollamaInput.candidates[0].stage02Score=null;
  assert.throws(()=>readStage05Candidates(d),/CANDIDATES_CONTRACT_INVALID/);
});
test('fabricated URL without fetched primary evidence is rejected',async()=>{
  const m=mocks({fakeCitation:true});
  await assert.rejects(runStage05OllamaResearch({
    input:fixture(),model:'mock',...m}),/OLLAMA_EVIDENCE_URL_NOT_FETCHED/);
});
test('tool budget still stops overbroad research',async()=>{
  const m=mocks();
  await assert.rejects(runStage05OllamaResearch({
    input:fixture(),model:'mock',...m,maxToolCalls:1}),/TOOL_BUDGET_EXCEEDED/);
});
