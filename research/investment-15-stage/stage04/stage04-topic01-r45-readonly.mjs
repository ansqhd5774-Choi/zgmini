/**
 * R45 Stage04 topic 01/21. Research-only; no DB/score/order/deploy writes.
 * Every run searches all four publishers independently, re-reads official pages,
 * and measures a warm-up + three repeated passes. R35 supplies URLs only.
 */
import {readFile, writeFile, appendFile} from 'node:fs/promises';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {PUBLISHERS, parseUrlSeeds, pagePlainText, extractCagrCandidates} from './stage04-four-publisher-r37-readonly.mjs';
import {auditForecastSource} from './forecast-source-audit-r29-readonly.mjs';

const HERE=dirname(fileURLToPath(import.meta.url));
const BASE=join(HERE,'..');
const MATRIX=join(BASE,'STAGE04_R35_FOUR_MEDIA_CAGR_MATRIX_20261026.md');
const MODEL_URL='http://127.0.0.1:11434/api/generate';
const REPORT_MAX=2_000_000, SEARCH_MAX=750_000, BUDGET_MS=18000;
const now=()=>performance.now();
const unique=a=>[...new Set(a)];
const clean=s=>String(s??'NULL').replace(/[\r\n=|]/g,' ').slice(0,400);
// Never make the language model express a CAGR as an integer candidate index.
// A constrained C0/C1 token maps to the position after strict validation.
export function candidateChoiceSchema(count){
  if(!Number.isInteger(count)||count<1||count>16)throw Error('CANDIDATE_COUNT_OUT_OF_BOUNDS');
  return {type:'object',properties:{candidate_id:{type:'string',
    enum:['NONE',...Array.from({length:count},(_,i)=>`C${i}`)]},
    scope:{type:'string',enum:['DIRECT','PROXY','UNRELATED','UNCLEAR']}},
    required:['candidate_id','scope'],additionalProperties:false};
}
export const TARGET={kind:'섹터',name:'정보기술',english:'information technology',
  aliases:['information technology market','IT industry market','information technology (IT) market'],
  scope:'PUBLISHER_MARKET_ONLY_NOT_VERIFIED_AS_GICS_INFORMATION_TECHNOLOGY'};

function htmlDecode(s){return String(s).replace(/&amp;/gi,'&').replace(/&quot;/gi,'"')
  .replace(/&#39;|&apos;/gi,"'").replace(/&lt;/gi,'<').replace(/&gt;/gi,'>')
  .replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n)));}
export function officialReportUrl(raw,p){
  try{const u=new URL(raw);if(u.protocol!=='https:'||u.username||u.password||u.port)return false;
    if(u.hostname.replace(/^www\./,'')!==p.host.replace(/^www\./,''))return false;
    const segments=u.pathname.toLowerCase().split('/').filter(Boolean);
    if(p.id==='Precedence')return segments.length===1 && segments[0].endsWith('-market');
    return segments.length===2 && ('/'+segments[0]+'/')===p.path && /^[a-z0-9][a-z0-9._-]+$/.test(segments[1]);
  }catch{return false;}
}
function normalizedUrl(raw){try{const u=new URL(raw);u.hash='';u.search='';return u.href;}catch{return null;}}
function unwrapSearch(raw,base){
  try{let u=new URL(htmlDecode(raw),base);
    if(u.hostname.endsWith('google.com') && u.pathname==='/url' && u.searchParams.get('q'))u=new URL(u.searchParams.get('q'));
    if(u.hostname.endsWith('bing.com')&&u.pathname==='/ck/a'&&u.searchParams.get('u')){
      const value=u.searchParams.get('u');
      if(/^a1[A-Za-z0-9_-]+$/.test(value)){
        const target=Buffer.from(value.slice(2),'base64url').toString('utf8');
        if(/^https:\/\//i.test(target))u=new URL(target);
      }
    }
    if(u.hostname.endsWith('duckduckgo.com') && u.searchParams.get('uddg'))u=new URL(u.searchParams.get('uddg'));
    return normalizedUrl(u.href);
  }catch{return null;}
}
export function searchLinks(html,base,p){
  const links=[];
  for(const m of String(html).matchAll(/\bhref\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/gi)){
    const url=unwrapSearch(m[1]||m[2]||m[3],base);
    if(url && officialReportUrl(url,p))links.push(url);
  }
  // Plain URL snippets are candidates only; the publisher page still needs a live GET.
  for(const m of String(html).matchAll(/https?:\/\/(?:www\.)?(?:thebusinessresearchcompany\.com|businessresearchinsights\.com|skyquestt\.com|precedenceresearch\.com)\/[a-z0-9/_-]+/gi)){
    const url=normalizedUrl(m[0]);if(url && officialReportUrl(url,p))links.push(url);
  }
  return unique(links);
}
export function ranking(url){
  const segment=new URL(url).pathname.split('/').filter(Boolean).at(-1)?.toLowerCase()||'';
  if(/^(information-technology|information-technology-it)(?:-global-market-report|-market-report|-market(?:-[0-9]{4,8})?|-[0-9]+)?$/.test(segment))return 1000;
  if(/^(information-and-technology)(?:-market|-[0-9]+)?$/.test(segment))return 100;
  if(segment.includes('information-technology') || segment.includes('information-and-technology'))return 20;
  if(/(^|-)it-services(-|$)/.test(segment))return 8;
  return 1;
}
export function classifyTitle(url,title,p){
  if(!officialReportUrl(url,p))return 'OFFICIAL_URL_INVALID';
  const slug=new URL(url).pathname.split('/').filter(Boolean).at(-1).toLowerCase();
  const cleanTitle=String(title||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim()
    .replace(/^(global|worldwide|us|united states)\s+/,'');
  const fullSlug=/^(information-technology|information-technology-it)(?:-global-market-report|-market-report|-market(?:-[0-9]{4,8})?|-[0-9]+)?$/.test(slug);
  const fullTitle=/^information technology(?: it)?\s+(?:market|industry)(?:\s|$)/.test(cleanTitle) ||
    /^information technology it market(?:\s|$)/.test(cleanTitle);
  return fullSlug && fullTitle ? 'DIRECT_MARKET_SCOPE_CANDIDATE' : 'PROXY_OR_DIFFERENT_SCOPE';
}
async function cappedText(response,max){
  const len=Number(response.headers?.get?.('content-length')||0);
  if(len>max)throw Error('BODY_TOO_LARGE');
  if(response.body?.getReader){const reader=response.body.getReader();let size=0;const pieces=[];
    try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;
      if(size>max)throw Error('BODY_TOO_LARGE');pieces.push(Buffer.from(value));}}
    finally{await reader.cancel().catch(()=>{});}return Buffer.concat(pieces).toString('utf8');}
  const body=await response.text();if(Buffer.byteLength(body)>max)throw Error('BODY_TOO_LARGE');return body;
}
export async function getOfficial(url,p,fetchFn=fetch){
  if(!officialReportUrl(url,p))throw Error('UNAPPROVED_REPORT_URL');
  let current=url;
  for(let redirects=0;redirects<3;redirects++){
    const r=await fetchFn(current,{redirect:'manual',signal:AbortSignal.timeout(BUDGET_MS),
      headers:{accept:'text/html','user-agent':'ZGMINI independent market research (public report)'}});
    if(r.status>=300&&r.status<400){const dest=normalizedUrl(new URL(r.headers?.get?.('location'),current).href);
      if(!officialReportUrl(dest,p))throw Error('REDIRECT_OUTSIDE_PUBLISHER');current=dest;continue;}
    if(!r.ok)throw Error('REPORT_HTTP_'+r.status);
    if(r.url && !officialReportUrl(r.url,p))throw Error('REPORT_REDIRECT_OUTSIDE_PUBLISHER');
    return cappedText(r,REPORT_MAX);
  }throw Error('TOO_MANY_REDIRECTS');
}
export async function getSearch(url,fetchFn=fetch){
  const r=await fetchFn(url,{signal:AbortSignal.timeout(9000),headers:{accept:'text/html',
    'user-agent':'Mozilla/5.0 (compatible; ZGMINI-public-research/1.0)'}});
  if(!r.ok)throw Error('SEARCH_HTTP_'+r.status);
  const u=new URL(r.url||url);if(!['google.com','www.google.com','bing.com','www.bing.com'].includes(u.hostname))
    throw Error('SEARCH_REDIRECT_OUTSIDE_ENGINE');
  return cappedText(r,SEARCH_MAX);
}
export async function discover(p,seed,{fetchFn=fetch,searchFn=getSearch}={}){
  const started=now();const out={engine:null,attempts:[],candidate_urls:[],seed_used:!!seed,
    search_state:'SEARCH_INCOMPLETE',search_ms:0};
  const query=`site:${p.host} "information technology" "market" "CAGR"`;
  for(const [engine,url] of [
    ['GOOGLE',`https://www.google.com/search?q=${encodeURIComponent(query)}&num=20`],
    ['BING',`https://www.bing.com/search?q=${encodeURIComponent(query)}&count=20`]]){
    try{const html=await searchFn(url,fetchFn);const urls=searchLinks(html,url,p);
      out.attempts.push({engine,status:'OK',found:urls.length});out.candidate_urls.push(...urls);
      out.engine=engine;if(urls.some(x=>ranking(x)>=100)){
        out.search_state='DISCOVERED';break;}}
    catch(err){out.attempts.push({engine,status:clean(err.message),found:0});
      // A publisher remains independently attempted. Never retry HTTP 429 on the same service.
      if(/HTTP_429/.test(err.message))break;}
  }
  out.candidate_urls=unique([...out.candidate_urls,...(seed?[seed]:[])].filter(u=>officialReportUrl(u,p)))
    .sort((a,b)=>ranking(b)-ranking(a)||a.localeCompare(b));
  if(out.search_state!=='DISCOVERED')out.search_state=out.attempts.some(x=>x.found>0)?
    'PARTIAL_NON_DIRECT_DISCOVERY':out.candidate_urls.length?'SEED_ONLY_SEARCH_INCOMPLETE':'SEARCH_INCOMPLETE';
  out.search_ms=Math.round(now()-started);return out;
}
export function titleOf(html){const m=html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)||
  html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);return pagePlainText(m?.[1]||'').slice(0,200);}
function periodOf(text){const m=String(text).match(/\b(20\d{2})\s*(?:-|–|—|to|through)\s*(20\d{2})\b/i);
  return m&&Number(m[2])>Number(m[1])?`${m[1]}-${m[2]}`:null;}
export async function ollamaChoose(p,title,candidates,model,{fetchFn=fetch}={}){
  const schema=candidateChoiceSchema(candidates.length);
  const prompt=`You are checking LITERAL MARKET RESEARCH REPORT text. No web browsing or invented facts.\n`+
    `Target: global information technology market as a publisher-defined entire market; NOT IT services, management, software-only, telecom-only, regional, or fastest growing segment.\n`+
    `Publisher ${p.id}; official REPORT HEADING: ${title}.\n`+
    `Select the *future market forecast* excerpt, never historical CAGR.\n`+
    `The candidate_id is a LABEL, not a number, percentage or growth rate.\n`+
    `The ONLY valid candidate IDs are ${schema.properties.candidate_id.enum.join(', ')}.\n`+
    `Report scope DIRECT means the report is about the whole global information technology market.\n`+
    `A report specifically on IT services, software, telecom or a submarket is PROXY.\n`+
    candidates.map((c,i)=>`C${i}: FORECAST_CAGR=${c.pct}% EXCERPT=${c.excerpt}`).join('\n')+
    '\nRespond only JSON candidate_id and scope. Do NOT write a percentage into candidate_id.';
  const started=now();const r=await fetchFn(MODEL_URL,{method:'POST',signal:AbortSignal.timeout(90000),
    headers:{'content-type':'application/json'},body:JSON.stringify({model,prompt,stream:false,think:false,
      format:schema,options:{temperature:0,seed:45,num_predict:70}})});
  if(!r.ok)throw Error('OLLAMA_HTTP_'+r.status);
  const body=await r.json();let answer;try{answer=JSON.parse(body.response)}catch{throw Error('OLLAMA_JSON_INVALID')}
  if(!schema.properties.candidate_id.enum.includes(answer?.candidate_id)||
    !['DIRECT','PROXY','UNRELATED','UNCLEAR'].includes(answer.scope)||
    Object.keys(answer).sort().join()!=='candidate_id,scope')throw Error('OLLAMA_SCHEMA_INVALID');
  const index=answer.candidate_id==='NONE'?-1:Number(answer.candidate_id.slice(1));
  return {index,scope:answer.scope,candidate_id:answer.candidate_id,
    elapsed_ms:Math.round(now()-started),model_total_ms:Math.round((body.total_duration||0)/1e6),
    model_load_ms:Math.round((body.load_duration||0)/1e6),
    model_eval_ms:Math.round((body.eval_duration||0)/1e6)};
}
export async function inspect(p,url,{fetchFn=fetch,chooseFn=ollamaChoose,model='gemma3:4b'}={}){
  const out={url,title:null,state:'FAILED',error:null,cagr:null,period:null,model_scope:null,
    model_candidate_id:null,
    report_ms:0,ollama_ms:0,model_total_ms:null,model_load_ms:null,model_eval_ms:null,
    source_audit:'NOT_AUDITED',source_conflict:null,source_excerpt:null,scope_guard:null};
  const start=now();let html;
  try{html=await getOfficial(url,p,fetchFn)}catch(e){out.error=clean(e.message);out.state=/HTTP_(401|403|429)/.test(e.message)?'SOURCE_BLOCKED':'REPORT_FAILED';
    out.report_ms=Math.round(now()-start);return out;}
  out.report_ms=Math.round(now()-start);out.title=titleOf(html);out.scope_guard=classifyTitle(url,out.title,p);
  // Validate the literal report's market boundary BEFORE spending model time.
  if(out.scope_guard!=='DIRECT_MARKET_SCOPE_CANDIDATE'){
    out.state='PROXY_ONLY';out.error='REPORT_NOT_WHOLE_INFORMATION_TECHNOLOGY_MARKET';return out;
  }
  // R45 PC evidence selected TBRC 2025->2026 historical 7.5% instead of its
  // 2026->2030 forecast 8.3%. Reuse the existing R29 source arithmetic audit
  // and show Ollama ONLY the report's isolated forecast evidence. Never insert
  // either percentage as a hard-coded or cached research value.
  let audit=null;
  if(p.id==='TBRC'){
    audit=auditForecastSource(html);out.source_audit=audit.source_audit;
    out.source_conflict=audit.source_conflict_reason;
    if(audit.source_audit!=='CONSISTENT'){
      out.state=audit.source_audit==='SOURCE_CONFLICT'?'SOURCE_CONFLICT':'SOURCE_AUDIT_INCOMPLETE';
      out.error=audit.source_conflict_reason||'FORECAST_AUDIT_NOT_CONSISTENT';return out;
    }
  }
  const candidates=extractCagrCandidates(audit?.forecast_excerpt||pagePlainText(html));
  if(!candidates.length){out.error='NO_LITERAL_CAGR';return out;}
  const modelStart=now();
  try{const ans=await chooseFn(p,out.title,candidates,model,{fetchFn});out.ollama_ms=ans.elapsed_ms??Math.round(now()-modelStart);
    out.model_total_ms=ans.model_total_ms??null;out.model_load_ms=ans.model_load_ms??null;
    out.model_eval_ms=ans.model_eval_ms??null;out.model_scope=ans.scope;
    out.model_candidate_id=ans.candidate_id??null;
    if(ans.index<0||['UNCLEAR','UNRELATED'].includes(ans.scope)){out.error='NO_MODEL_CONFIRMED_FORECAST';return out;}
    const chosen=candidates[ans.index];out.period=periodOf(chosen.excerpt);out.source_excerpt=chosen.excerpt.slice(0,250);
    if(ans.scope!=='DIRECT'){out.state='SCOPE_REVIEW';out.error='MODEL_SCOPE_DISAGREES_WITH_TITLE';return out;}
    if(!/information technology(?: \(it\)| it)? market/i.test(chosen.excerpt)){
      out.state='EVIDENCE_SCOPE_REVIEW';out.error='CAGR_EXCERPT_LACKS_TARGET_MARKET';return out;}
    if(audit){
      if(Math.abs(chosen.pct-audit.forecast_narrative_pct)>0.05){
        out.state='FORECAST_SELECTION_MISMATCH';out.error='SELECTED_RATE_DIFFERS_FROM_AUDITED_FORECAST';return out;
      }
      out.period=`${audit.forecast_base_year}-${audit.forecast_end_year}`;
    }
    out.cagr=chosen.pct;out.state='DIRECT_PROVISIONAL';
  }catch(err){out.ollama_ms=Math.round(now()-modelStart);out.error=clean(err.message);out.state='OLLAMA_FAILED';}
  return out;
}
export async function researchPublisher(p,seed,{fetchFn=fetch,searchFn=getSearch,chooseFn=ollamaChoose,
  model='gemma3:4b',maxReports=12,discoverFn=discover,inspectFn=inspect}={}){
  const started=now();const discovery=await discoverFn(p,seed,{fetchFn,searchFn});
  const inspections=[];let state='NO_DIRECT_VERIFIED',chosen=null;
  const ranked=discovery.candidate_urls.slice(0,maxReports);
  const directCandidates=[];
  for(const url of ranked){
    // If at least one whole-market candidate is observed, inspect all other
    // exact-scope URLs but avoid hundreds of adjacent service-sector reports.
    if(directCandidates.length && ranking(url)<1000)break;
    const item=await inspectFn(p,url,{fetchFn,chooseFn,model});inspections.push(item);
    if(item.state==='DIRECT_PROVISIONAL')directCandidates.push(item);
    if(item.state==='SOURCE_BLOCKED' && /HTTP_429/.test(item.error||'')){state='RATE_LIMITED';break;}
  }
  if(directCandidates.length>1)state='MULTIPLE_DIRECT_REPORTS_REVIEW';
  else if(directCandidates.length===1){chosen=directCandidates[0];state='DIRECT_PROVISIONAL';}
  else{state=state==='RATE_LIMITED'?'RATE_LIMITED':
    inspections.some(x=>x.state==='SOURCE_BLOCKED')?'SOURCE_PARTIAL_BLOCKED':
    discovery.candidate_urls.length>maxReports?'SEARCH_INCOMPLETE_LIMIT':
    discovery.search_state==='SEED_ONLY_SEARCH_INCOMPLETE'?'SEARCH_INCOMPLETE_SEED_ONLY':
    discovery.search_state==='PARTIAL_NON_DIRECT_DISCOVERY'?'SEARCH_INCOMPLETE_NON_DIRECT':'NO_DIRECT_VERIFIED';}
  return {publisher:p.id,search:discovery,inspections,selected:chosen?{
    url:chosen.url,cagr:chosen.cagr,period:chosen.period,title:chosen.title,source_audit:chosen.source_audit}:null,
    uninspected:Math.max(0,discovery.candidate_urls.length-inspections.length),state,
    search_ms:discovery.search_ms,report_ms:inspections.reduce((s,x)=>s+x.report_ms,0),
    ollama_ms:inspections.reduce((s,x)=>s+x.ollama_ms,0),total_ms:Math.round(now()-started)};
}
export function summarizeRepeats(rounds){
  const measured=rounds.filter(x=>!x.warmup);
  if(measured.length!==3)return {gate:'NOT_MEASURED',reason:'NEED_THREE_MEASURED_RUNS'};
  const times=measured.map(x=>x.total_ms).sort((a,b)=>a-b),median=times[1];
  const spread=median?Math.max(Math.abs(times[0]-median),Math.abs(times[2]-median))/median:null;
  const providerConsistency=PUBLISHERS.map(p=>{
    const seq=measured.map(x=>x.publishers.find(z=>z.publisher===p.id));
    const signatures=seq.map(x=>[x?.state,x?.selected?.url||'NULL',x?.selected?.cagr??'NULL',x?.selected?.period||'NULL'].join('|'));
    return {publisher:p.id,stable:unique(signatures).length===1,states:seq.map(x=>x.state),
      durations_ms:seq.map(x=>x.total_ms),sig_count:unique(signatures).length};
  });
  const allFourAttempted=measured.every(x=>x.publishers.length===4);
  const directSeen=providerConsistency.some(x=>x.states.some(s=>s==='DIRECT_PROVISIONAL'));
  const consistent=providerConsistency.every(x=>x.stable);
  const speedStable=spread!==null&&spread<=0.25;
  const gate=!allFourAttempted?'FAILED_INCOMPLETE':!consistent?'UNSTABLE_RESULTS':
    !speedStable?'UNSTABLE_SPEED':!directSeen?'PARTIAL_NO_DIRECT':'PARTIAL_SCOPE_REVIEW_REQUIRED';
  return {gate,median_ms:median,min_ms:times[0],max_ms:times[2],
    deviation_ratio:spread===null?null:Number(spread.toFixed(3)),speed_stable:speedStable,
    provider_results_consistent:consistent,all_four_attempted:allFourAttempted,direct_seen:directSeen,
    provider_consistency:providerConsistency,
    comment:'R45 is research only. Even stable rates require GICS/scope and source rights verification.'};
}
function roundLines(round){const z=[`ROUND=${round.index} WARMUP=${round.warmup} TOTAL_MS=${round.total_ms}`];
  for(const x of round.publishers){const n='MEDIA_'+x.publisher.toUpperCase();
    z.push(`${n}_SEARCH_STATE=${x.search.search_state}`,`${n}_SEARCH_MS=${x.search_ms}`,
      `${n}_CANDIDATES=${x.search.candidate_urls.length}`,`${n}_INSPECTED=${x.inspections.length}`,
      `${n}_UNINSPECTED=${x.uninspected}`,`${n}_STATUS=${x.state}`,
      `${n}_CAGR=${x.selected?.cagr??'NULL'}`,`${n}_URL=${clean(x.selected?.url)}`,
      `${n}_REPORT_MS=${x.report_ms}`,`${n}_OLLAMA_MS=${x.ollama_ms}`,`${n}_TOTAL_MS=${x.total_ms}`);
    for(const s of x.search.attempts)z.push(`${n}_SEARCH=${s.engine} ${s.status} FOUND=${s.found}`);
    for(const item of x.inspections)z.push(`${n}_CHECK=${clean(item.state)} CAGR=${item.cagr??'NULL'} AUDIT=${item.source_audit} URL=${clean(item.url)} ERROR=${clean(item.error)}`);
  }return z.join('\r\n')+'\r\n';}
export async function runCli({fetchFn=fetch,searchFn=getSearch,chooseFn=ollamaChoose}={}){
  const file=join(BASE,'R45_TOPIC01_INFORMATION_TECHNOLOGY_RESULT');
  const txt=file+'.txt',json=file+'.json';const model='gemma3:4b';
  await writeFile(txt,`REPORT=STAGE04_R45_TOPIC_01\r\nTOPIC=정보기술\r\nPUBLISHERS=TBRC,BRI,SkyQuest,Precedence\r\nMODEL=${model}\r\nSCOPE=RESEARCH_PUBLISHER_MARKET_NOT_GICS_EQUIVALENT\r\nPAID_CREDITS_USED=0\r\nDB_SCORE_DEPLOY_CHANGE=NONE\r\nSTATUS=RUNNING\r\n`);
  try{const matrix=await readFile(MATRIX,'utf8');const topic=parseUrlSeeds(matrix).find(x=>x.name===TARGET.name);
    if(!topic)throw Error('TOPIC_01_NOT_FOUND');const rounds=[];
    for(let index=0;index<4;index++){
      const start=now();const publishers=[];
      for(const p of PUBLISHERS){const result=await researchPublisher(p,topic.seeds[p.id],{fetchFn,searchFn,chooseFn,model});
        publishers.push(result);await appendFile(txt,`PROGRESS_ROUND=${index+1}/4 MEDIA=${p.id} STATE=${result.state}\r\n`);
      }
      const round={index:index+1,warmup:index===0,started_at:new Date().toISOString(),
        total_ms:Math.round(now()-start),publishers};rounds.push(round);
      await appendFile(txt,roundLines(round));
      await writeFile(json,JSON.stringify({status:'RUNNING',completed_rounds:rounds.length,rounds},null,2));
    }
    const summary=summarizeRepeats(rounds);
    await writeFile(json,JSON.stringify({status:'FINISHED_RESEARCH_ONLY',topic:TARGET,summary,rounds},null,2));
    await appendFile(txt,`SUMMARY_GATE=${summary.gate}\r\nMEDIAN_MS=${summary.median_ms??'NULL'}\r\nMIN_MS=${summary.min_ms??'NULL'}\r\nMAX_MS=${summary.max_ms??'NULL'}\r\nDEVIATION=${summary.deviation_ratio??'NULL'}\r\nSTATUS=FINISHED_RESEARCH_ONLY\r\nSEND_TXT=${txt}\r\n`);
    console.log('STATUS=FINISHED_RESEARCH_ONLY');console.log('SEND_TXT='+txt);return summary;
  }catch(e){await appendFile(txt,`STATUS=FAILED\r\nERROR=${clean(e.message)}\r\n`);throw e;}
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1])runCli().catch(e=>{
  console.error('R45_FATAL='+clean(e.message));process.exitCode=1;});
