import test from 'node:test';
import assert from 'node:assert/strict';
import {readStage05Candidates,runStage05OllamaResearch} from './stage05-ollama-research.mjs';

const source='https://example.org/official-technology-report';
const fixture=()=>({
  version:'STAGE05_VERIFIED_RESULTS_HANDOFF_R81',status:'READY_FOR_OLLAMA_RESEARCH',
  asOfDate:'2026-10-28',coverage:{approvedThemes:9},
  ollamaInput:{candidates:Array.from({length:9},(_,i)=>({
    themeId:`approved-${i+12}`,theme:`승인테마-${i+12}`,
    stage04M4:70+i,stage05T:60+i,stage05S5:68+i,
  }))},
});
const selection=ids=>({message:{content:JSON.stringify({
  selectedThemes:ids.map(themeId=>({themeId,reason:'기존 산식과 위험을 함께 고려'})),
  limitations:[],
})}});
const resultJSON=url=>({themes:[{themeId:'approved-12',risks:['시장가격과 산업수요 차이'],
  sources:[url],technologies:[{name:'핵심 기술 예시',demand:'공식 보고서에 수요 언급',
    commercialization:'상용화 근거 추출 필요',alternatives:'대체 기술 비교 필요',sources:[url]}],
  companies:[{name:'관련 기업 예시',exposure:'공식 문서에 사업 노출 정보',sources:[url]}],
}],limitations:[]});

function mocks({selectionIds=['approved-12'],researchUrl=source,badFetchedUrl=false}={}){
  let phase=0;
  const called={select:0,research:0,final:0,search:0,fetch:0};
  const chat=async request=>{
    if(request.tools){
      called.research++;
      phase++;
      if(phase===1)return {message:{content:'',tool_calls:[{
        function:{name:'web_search',arguments:{query:'공식 기술 보고서'}}}]}};
      if(phase===2)return {message:{content:'',tool_calls:[{
        function:{name:'web_fetch',arguments:{url:source}}}]}};
      return {message:{content:'조사 완료',tool_calls:[]}};
    }
    if(request.format?.properties?.selectedThemes){called.select++;return selection(selectionIds);}
    called.final++;
    return {message:{content:JSON.stringify(resultJSON(
      badFetchedUrl?'https://invented.example/not-fetched':researchUrl))}};
  };
  const webSearch=async()=>{called.search++;return {results:[{
    title:'Official source',url:source,content:'공식 보고서 자료 일부'}]};};
  const webFetch=async()=>{called.fetch++;return {title:'Official source',
    content:'선정 테마 수요와 상용화 관련 원문. 인용 가능한 근거.'};};
  return {called,chat,webSearch,webFetch};
}

test('incomplete Stage05 score blocks before any model or web call',async()=>{
  const input=fixture();input.status='BLOCKED_STAGE01_04_SCORES';input.ollamaInput=null;
  const deps=mocks();const r=await runStage05OllamaResearch({input,model:'mock',...deps});
  assert.equal(r.status,'BLOCKED_INPUT_NOT_READY');
  assert.equal(r.research,null);
  assert.deepEqual(Object.values(deps.called),[0,0,0,0,0]);
});

test('computed scores are consumed as-is; Ollama selects then researches only chosen theme',async()=>{
  const deps=mocks();const r=await runStage05OllamaResearch({
    input:fixture(),model:'mock',...deps});
  assert.equal(r.status,'RESEARCH_OUTPUT_WITH_FETCHED_URLS');
  assert.equal(r.selectedThemes.length,1);
  assert.equal(r.selectedThemes[0].themeId,'approved-12');
  assert.equal(r.selectedThemes[0].S5,68);
  assert.equal(r.research.themes[0].companies.length,1);
  assert.equal(r.provenance.fetchedUrlCount,1);
  assert.deepEqual(deps.called,{select:1,research:3,final:1,search:1,fetch:1});
});

test('model cannot insert an unapproved theme',async()=>{
  const deps=mocks({selectionIds:['theme-999']});
  await assert.rejects(runStage05OllamaResearch({input:fixture(),model:'mock',...deps}),
    /OLLAMA_SELECTED_UNAPPROVED_THEME/);
  assert.equal(deps.called.search,0);
});

test('fabricated citation that Ollama never fetched is rejected',async()=>{
  const deps=mocks({badFetchedUrl:true});
  await assert.rejects(runStage05OllamaResearch({input:fixture(),model:'mock',...deps}),
    /OLLAMA_EVIDENCE_URL_NOT_FETCHED/);
});

test('Ollama may decide no theme deserves research without triggering a web call',async()=>{
  const deps=mocks({selectionIds:[]});
  const r=await runStage05OllamaResearch({input:fixture(),model:'mock',...deps});
  assert.equal(r.status,'NO_THEME_SELECTED');
  assert.equal(deps.called.search,0);
  assert.equal(r.selectedThemes.length,0);
});

test('duplicate/missing numeric IDs cannot be accepted as a verified handoff',()=>{
  const x=fixture();x.ollamaInput.candidates[8].themeId='approved-12';
  assert.throws(()=>readStage05Candidates(x),/CANDIDATES_CONTRACT_INVALID/);
  const y=fixture();y.ollamaInput.candidates[0].stage05S5=null;
  assert.throws(()=>readStage05Candidates(y),/CANDIDATES_CONTRACT_INVALID/);
});

test('tool call limit aborts without claiming a finished research report',async()=>{
  const deps=mocks();
  await assert.rejects(runStage05OllamaResearch({
    input:fixture(),model:'mock',...deps,maxToolCalls:1}),/TOOL_BUDGET_EXCEEDED/);
});
