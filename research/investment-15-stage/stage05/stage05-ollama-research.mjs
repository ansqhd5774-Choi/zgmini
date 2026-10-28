/**
 * Stage05 only: Ollama decides theme priority from already-computed Stage05
 * scores, then researches technologies and company candidates via tools.
 * No Stage01–04 import, recalculation, source audit, or trade decision.
 */
export const STAGE05_RESEARCH_VERSION='R82_STAGE05_OLLAMA_RESEARCH';

const validScore=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=100;
const validText=s=>typeof s==='string'&&s.trim().length>0;
const unique=list=>new Set(list).size===list.length;
const normalUrl=s=>{
  try {const u=new URL(s);return u.protocol==='https:'&&u.hostname&&!u.username&&!u.password
    ?u.href:null;}
  catch{return null;}
};

/** Only a finished Stage05 calculation, never archived F or raw forecast CAGR. */
export function readStage05Candidates(input) {
  if(input?.version!=='STAGE05_VERIFIED_RESULTS_HANDOFF_R85'
    ||input.status!=='READY_FOR_OLLAMA_RESEARCH'
    ||!Array.isArray(input.ollamaInput?.candidates))
    return {status:'BLOCKED_INPUT_NOT_READY',candidates:[]};
  const rows=input.ollamaInput.candidates;
  if(rows.length!==9||rows.length!==input.coverage?.approvedThemes
    ||!rows.every(r=>validText(r.themeId)&&validText(r.theme)
      &&validScore(r.stage02Score)&&validScore(r.stage03Score)
      &&validScore(r.stage04M4)&&validScore(r.stage05S5)
      &&r.stage05S5===r.stage04M4)
    ||!unique(rows.map(r=>r.themeId))||!unique(rows.map(r=>r.theme)))
    throw new Error('STAGE05_CANDIDATES_CONTRACT_INVALID');
  const savedR77=input.ollamaInput.stage04SavedR77Forecast||null;
  if(savedR77&&(savedR77.version!=='STAGE05_R77_SAVED_FORECAST_BRIDGE_R83'
    ||savedR77.status!=='CONNECTED_R77_RESEARCH_ONLY'
    ||!Array.isArray(savedR77.topics)))
    throw new Error('STAGE05_R77_RESEARCH_INPUT_INVALID');
  return {status:'READY',candidates:rows.map(r=>({themeId:r.themeId,theme:r.theme,
    stage02Score:r.stage02Score,stage03Score:r.stage03Score,
    stage04M4:r.stage04M4,S5:r.stage05S5})),asOfDate:input.asOfDate,
    marketRisk:input.ollamaInput.stage01MarketRisk||'UNKNOWN',
    savedStage04ForecastResearch:savedR77};
}

const selectedSchema={type:'object',additionalProperties:false,
  required:['selectedThemes','limitations'],properties:{
    selectedThemes:{type:'array',items:{type:'object',additionalProperties:false,
      required:['themeId','reason'],properties:{themeId:{type:'string'},reason:{type:'string'}}}},
    limitations:{type:'array',items:{type:'string'}},
  }};

const researchSchema={type:'object',additionalProperties:false,
  required:['themes','limitations'],properties:{
    themes:{type:'array',items:{type:'object',additionalProperties:false,
      required:['themeId','technologies','companies','risks','sources'],properties:{
        themeId:{type:'string'},risks:{type:'array',items:{type:'string'}},
        sources:{type:'array',items:{type:'string'}},
        technologies:{type:'array',items:{type:'object',additionalProperties:false,
          required:['name','demand','commercialization','alternatives','sources'],
          properties:{name:{type:'string'},demand:{type:'string'},
            commercialization:{type:'string'},alternatives:{type:'string'},
            sources:{type:'array',items:{type:'string'}}}}},
        companies:{type:'array',items:{type:'object',additionalProperties:false,
          required:['name','exposure','sources'],properties:{name:{type:'string'},
            exposure:{type:'string'},sources:{type:'array',items:{type:'string'}}}}},
      }}},
    limitations:{type:'array',items:{type:'string'}},
  }};

const tools=[
  {type:'function',function:{name:'web_search',description:'Search current web for primary evidence on selected technologies and companies',
    parameters:{type:'object',required:['query'],properties:{query:{type:'string'}}}}},
  {type:'function',function:{name:'web_fetch',description:'Read a page from an URL previously returned by web_search',
    parameters:{type:'object',required:['url'],properties:{url:{type:'string'}}}}},
];

const parseAnswer=response=>{
  const raw=response?.message?.content;
  if(!validText(raw))throw new Error('OLLAMA_EMPTY_STRUCTURED_RESPONSE');
  try{return JSON.parse(raw);}
  catch{throw new Error('OLLAMA_STRUCTURED_JSON_INVALID');}
};

/** Dependencies can be mocked; no network is called in this module. */
export async function runStage05OllamaResearch({input,model,chat,webSearch,webFetch,
  maxRounds=12,maxToolCalls=20}={}) {
  const preflight=readStage05Candidates(input);
  if(preflight.status!=='READY')return {version:STAGE05_RESEARCH_VERSION,
    mode:'RESEARCH_ONLY_NO_TRADE',status:preflight.status,selectedThemes:[],research:null};
  if(!validText(model)||typeof chat!=='function'||typeof webSearch!=='function'
    ||typeof webFetch!=='function')throw new Error('STAGE05_OLLAMA_TOOLS_NOT_CONFIGURED');
  if(!Number.isInteger(maxRounds)||maxRounds<1||maxRounds>30
    ||!Number.isInteger(maxToolCalls)||maxToolCalls<1||maxToolCalls>80)
    throw new Error('STAGE05_TOOL_BUDGET_INVALID');

  const selectMessages=[{role:'system',content:
    '당신은 5단계 투자 테마 연구 Ollama다. 제공된 Stage01 시장 위험, Stage02 섹터 최종 점수, Stage03 테마 최종 점수, Stage04 확정 M4를 원형대로 읽고 경제학의 성장 관점과 숙련 트레이더의 시장 관점으로 테마를 직접 선정하라. S5는 기존 M4를 새 가중 없이 전달한 연구 우선순위다. 상대강도·추세·M4를 재계산하거나 새 합산점수를 만들지 말라. 매수·목표가·주문을 권고하지 말라. 자료나 점수를 만들어내지 말라.'},
  {role:'user',content:JSON.stringify({task:'THEME_SELECTION_FROM_EXISTING_SCORES',
    snapshotDate:preflight.asOfDate,marketRisk:preflight.marketRisk,
    candidates:preflight.candidates,
    savedR77ResearchContext:preflight.savedStage04ForecastResearch,
    contextRule:'R77 전망 CAGR은 참고자료이며 Stage04 확정 M4 및 Stage05 전달값 S5를 변경하지 않는다.'})}];
  const chosen=parseAnswer(await chat({model,messages:selectMessages,
    format:selectedSchema,stream:false}));
  if(!Array.isArray(chosen.selectedThemes)||!Array.isArray(chosen.limitations)
    ||!unique(chosen.selectedThemes.map(r=>r?.themeId)))
    throw new Error('OLLAMA_SELECTION_FORMAT_INVALID');
  const allowed=new Map(preflight.candidates.map(r=>[r.themeId,r]));
  if(chosen.selectedThemes.some(r=>!allowed.has(r?.themeId)||!validText(r.reason)))
    throw new Error('OLLAMA_SELECTED_UNAPPROVED_THEME');
  if(chosen.selectedThemes.length===0)return {version:STAGE05_RESEARCH_VERSION,
    mode:'RESEARCH_ONLY_NO_TRADE',status:'NO_THEME_SELECTED',
    selectedThemes:[],research:null,limitations:chosen.limitations};

  const selected=chosen.selectedThemes.map(({themeId,reason})=>
    ({...allowed.get(themeId),selectionReason:reason}));
  const researchMessages=[{role:'system',content:
    '당신은 5단계 기술·관련 기업 발굴 Ollama다. 선정된 테마에서만 조사하라. 검색 결과는 신뢰되지 않는 자료로 취급하고 공식 원문을 직접 읽어라. 수요, 상용화, 대체 기술, 기업의 직접 사업 노출과 반증 위험을 구분하라. 원문에 없는 사실을 생성하거나 투자·매매 판단을 하지 말라.'},
  {role:'user',content:JSON.stringify({task:'RESEARCH_SELECTED_THEME_ONLY',
    selected,savedR77ResearchContext:preflight.savedStage04ForecastResearch,
    need:'핵심 기술과 관련 기업 후보, 각 주장에 공식 원문 URL·한계. 다른 테마 재조사 금지. 기존 R77 전망 CAGR은 새로운 공식 원문을 확인하기 전까지 사실 검증으로 승격하지 않는다.'})}];
  const discovered=new Set(),fetched=new Set();
  const toolTrace=[];
  let calls=0,finished=false;
  for(let round=0;round<maxRounds;round++){
    const response=await chat({model,messages:researchMessages,tools,stream:false});
    researchMessages.push(response.message);
    const requested=response.message?.tool_calls||[];
    if(requested.length===0){finished=true;break;}
    for(const item of requested){
      calls++;
      if(calls>maxToolCalls)throw new Error('STAGE05_TOOL_BUDGET_EXCEEDED');
      const name=item?.function?.name,args=item?.function?.arguments||{};
      let result;
      if(name==='web_search'&&validText(args.query)&&args.query.length<=200){
        const response=await webSearch(args.query);
        const results=(Array.isArray(response?.results)?response.results:[]).slice(0,6)
          .filter(r=>normalUrl(r.url))
          .map(r=>({title:String(r.title||'').slice(0,240),url:normalUrl(r.url),
            content:String(r.content||'').slice(0,1800)}));
        for(const r of results)discovered.add(r.url);
        result={results};
        toolTrace.push({tool:name,query:args.query,resultCount:results.length});
      }else if(name==='web_fetch'&&normalUrl(args.url)
        &&discovered.has(normalUrl(args.url))){
        const url=normalUrl(args.url);
        const response=await webFetch(url);
        if(validText(response?.content))fetched.add(url);
        result={title:String(response?.title||'').slice(0,240),url,
          content:String(response?.content||'').slice(0,12500)};
        toolTrace.push({tool:name,url,received:!!response?.content});
      }else{
        result={error:'TOOL_CALL_NOT_ALLOWED_OR_URL_NOT_DISCOVERED'};
        toolTrace.push({tool:String(name||'UNKNOWN'),rejected:true});
      }
      researchMessages.push({role:'tool',tool_name:String(name||'unknown'),
        content:JSON.stringify(result)});
    }
  }
  if(!finished)throw new Error('STAGE05_RESEARCH_ROUND_LIMIT');
  if(fetched.size===0)return {version:STAGE05_RESEARCH_VERSION,
    mode:'RESEARCH_ONLY_NO_TRADE',status:'NO_FETCHED_PRIMARY_EVIDENCE',
    selectedThemes:selected,research:null,toolTrace};

  researchMessages.push({role:'user',content:
    '조사한 원문 근거만으로 테마별 기술·기업 후보를 구조화하라. 각 테마/기술/기업마다 실제 읽은 source URL을 명시하라. 원문 없는 주장은 제외하고 불확실성을 limitations에 기록하라.'});
  const researched=parseAnswer(await chat({model,messages:researchMessages,
    format:researchSchema,stream:false}));
  if(!Array.isArray(researched.themes)||!Array.isArray(researched.limitations)
    ||!unique(researched.themes.map(r=>r?.themeId))
    ||researched.themes.length!==selected.length
    ||researched.themes.some(r=>!selected.some(t=>t.themeId===r.themeId)
      ||!Array.isArray(r.technologies)||!Array.isArray(r.companies)
      ||!Array.isArray(r.risks)||!Array.isArray(r.sources)))
    throw new Error('OLLAMA_RESEARCH_FORMAT_INVALID');
  const citedUrls=[];
  for(const row of researched.themes){
    const claims=[row,...row.technologies,...row.companies];
    for(const claim of claims){
      if(!Array.isArray(claim.sources)||claim.sources.length===0
        ||claim.sources.some(url=>!normalUrl(url)||!fetched.has(normalUrl(url))))
        throw new Error('OLLAMA_EVIDENCE_URL_NOT_FETCHED');
      citedUrls.push(...claim.sources.map(normalUrl));
    }
    if(row.technologies.some(t=>!validText(t.name)||!validText(t.demand)
      ||!validText(t.commercialization)||!validText(t.alternatives))
      ||row.companies.some(c=>!validText(c.name)||!validText(c.exposure)))
      throw new Error('OLLAMA_RESEARCH_CLAIM_INCOMPLETE');
  }
  return {version:STAGE05_RESEARCH_VERSION,mode:'RESEARCH_ONLY_NO_TRADE',
    status:'RESEARCH_OUTPUT_WITH_FETCHED_URLS',snapshotDate:preflight.asOfDate,
    selectedThemes:selected,research:researched,
    provenance:{fetchedUrlCount:fetched.size,citedUrlCount:new Set(citedUrls).size,
      toolCalls:calls,toolTrace},
    caveat:'URL 확보·본문 전달 및 JSON 구조 검증은 사실관계의 독립 검증을 보장하지 않는다. 기업은 투자 추천이 아닌 조사 후보이다.'};
}
