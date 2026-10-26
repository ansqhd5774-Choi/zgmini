/**
 * R48: topic 01 only. R47 revealed gemma3:4b was answering index=8
 * for one candidate (apparently conflating 8.3% with candidate index).
 * Reuse R45's auditable forecast and constrained string-ID model choice.
 * Keep Google/Bing independent; never retry an HTTP429 engine.
 * Research only, no investment-system side effects.
 */
import {readFile,writeFile,appendFile} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {PUBLISHERS,parseUrlSeeds} from './stage04-four-publisher-r37-readonly.mjs';
import {TARGET,officialReportUrl,searchLinks,getSearch,ranking,
  researchPublisher,summarizeRepeats,inspect} from './stage04-topic01-r45-readonly.mjs';

const BASE=join(dirname(fileURLToPath(import.meta.url)),'..');
const MATRIX=join(BASE,'STAGE04_R35_FOUR_MEDIA_CAGR_MATRIX_20261026.md');
const MODEL='gemma3:4b';
const clean=s=>String(s??'NULL').replace(/[\r\n=|]/g,' ').slice(0,230);
const unique=a=>[...new Set(a)];
const CATALOGS={
  TBRC:'https://www.thebusinessresearchcompany.com/reports/information-technology-market-research',
  BRI:'https://www.businessresearchinsights.com/information-and-technology-market-research',
  SkyQuest:'https://www.skyquestt.com/industries/information-technology',
  Precedence:'https://www.precedenceresearch.com/industry/ict'
};
const ENGINE_TIMEOUT_MS=9000;

/** Candidates are always HTTPS official reports, including embedded catalog links. */
export function catalogLinks(html,base,p){
  const urls=new Set(searchLinks(html,base,p));
  const body=String(html).replace(/\\\//g,'/');
  const rx=p.id==='Precedence'?/\/[a-z0-9-]{4,120}-market\b/gi:
    /\/(?:report|market-reports)\/[a-z0-9][a-z0-9._/-]{3,180}/gi;
  for(const m of body.matchAll(rx)){
    try{const u=new URL(m[0],base);u.search='';u.hash='';
      if(officialReportUrl(u.href,p))urls.add(u.href);
    }catch{/* only literal official URLs are allowed */}
  }
  return [...urls];
}

async function smallHtml(url,p,fetchFn=fetch){
  const response=await fetchFn(url,{redirect:'manual',signal:AbortSignal.timeout(ENGINE_TIMEOUT_MS),
    headers:{accept:'text/html','user-agent':'ZGMINI-public-market-research/1.0'}});
  if(!response.ok)throw Error('CATALOG_HTTP_'+response.status);
  if(response.url&&new URL(response.url).hostname!==new URL(url).hostname)
    throw Error('CATALOG_OFFICIAL_REDIRECT');
  const n=Number(response.headers?.get?.('content-length')||0);
  if(n>1_000_000)throw Error('CATALOG_TOO_LARGE');
  const html=await response.text();
  if(Buffer.byteLength(html)>1_000_000)throw Error('CATALOG_TOO_LARGE');
  return html;
}

export function searchBodyProfile(html,engine){
  const body=String(html);
  const anchors=(body.match(/<a\b/gi)||[]).length;
  const gate=engine==='GOOGLE'&&/\/httpservice\/retry\/enablejs|enable javascript/i.test(body)
    ?'JS_REQUIRED':(/captcha|unusual traffic|verify you are human/i.test(body)
      ?'CHALLENGE_INDICATOR':'NO_EXPLICIT_CHALLENGE');
  return {html_bytes:Buffer.byteLength(body),anchors,gate,
    bing_wrapped_links:(body.match(/\/ck\/a\?/g)||[]).length};
}

/** The 2 original search engines remain diagnostic discovery attempts.
 *  Publisher catalogs add live, first-party coverage. No cached source values.
 */
export async function discoverR48(p,seed,{fetchFn=fetch,searchFn=getSearch,
  blockedCatalogs=new Set(),blockedSearchEngines=new Set()}={}){
  const started=performance.now();const attempts=[],urls=[];
  let catalog_status='NOT_RUN',catalog_total=0,catalog_topic=0;
  const catalog=CATALOGS[p.id];
  try{if(blockedCatalogs.has(p.id))throw Error('CATALOG_SKIPPED_PREVIOUS_HTTP_403');
    const html=await smallHtml(catalog,p,fetchFn);const found=catalogLinks(html,catalog,p);
    catalog_total=found.length;
    const relevant=found.filter(u=>ranking(u)>=8);
    catalog_topic=relevant.length;urls.push(...relevant);
    catalog_status='OK';
    attempts.push({engine:'OFFICIAL_CATALOG',status:'OK',found:relevant.length,
      catalog_total,html_bytes:Buffer.byteLength(html)});
  }catch(err){catalog_status=clean(err.message);
    if(/CATALOG_HTTP_(403|401|429)/.test(catalog_status))blockedCatalogs.add(p.id);
    attempts.push({engine:'OFFICIAL_CATALOG',status:catalog_status,found:0});}
  // Google often returns a JS-required page with HTTP 200. Bing may link to
  // other sites through base64 wrapped /ck/a URLs: inspect the body, do not
  // convert an empty result into a genuine 'no report exists' assertion.
  const query=`site:${p.host} information technology market report`;
  for(const [engine,url] of [
    ['GOOGLE',`https://www.google.com/search?q=${encodeURIComponent(query)}&num=20`],
    ['BING',`https://www.bing.com/search?q=${encodeURIComponent(query)}&count=20`]
  ]){
    if(blockedSearchEngines.has(engine)){
      attempts.push({engine,status:'SKIPPED_PREVIOUS_HTTP_429',found:0});continue;
    }
    try{const html=await searchFn(url,fetchFn);const found=searchLinks(html,url,p);
      urls.push(...found);attempts.push({engine,status:'OK',found:found.length,
        ...searchBodyProfile(html,engine)});
    }catch(err){attempts.push({engine,status:clean(err.message),found:0});
      if(/HTTP_429/.test(err.message))blockedSearchEngines.add(engine);}
  }
  const candidate_urls=unique([...urls,...(seed?[seed]:[])].filter(u=>officialReportUrl(u,p)))
    .sort((a,b)=>ranking(b)-ranking(a)||a.localeCompare(b));
  const liveFound=attempts.filter(x=>x.status==='OK').reduce((n,x)=>n+x.found,0);
  const search_state=liveFound&&catalog_status==='OK'?'CATALOG_AND_SEARCH_ATTEMPTED':
    liveFound?'LIVE_CANDIDATES_PARTIAL':candidate_urls.length?'SEED_ONLY_SEARCH_INCOMPLETE':'SEARCH_INCOMPLETE';
  return {engine:'OFFICIAL_CATALOG_PLUS_PUBLIC_SEARCH',attempts,candidate_urls,
    seed_used:!!seed,search_state,search_ms:Math.round(performance.now()-started),
    catalog_status,catalog_total,catalog_topic,live_discovered_count:liveFound};
}

export function summarizeR48(rounds){
  const speed=summarizeRepeats(rounds);
  const measured=rounds.filter(r=>!r.warmup);
  const publishers=PUBLISHERS.map(p=>{
    const rows=measured.map(r=>r.publishers.find(x=>x.publisher===p.id));
    return {publisher:p.id,states:rows.map(r=>r.state),
      catalog_statuses:rows.map(r=>r.search.catalog_status),
      candidate_counts:rows.map(r=>r.search.candidate_urls.length),
      direct_rates:rows.map(r=>r.selected?.cagr??null),
      catalog_discovered:rows.map(r=>r.search.catalog_topic),
      blocked:rows.some(r=>r.inspections.some(x=>x.state==='SOURCE_BLOCKED')||
        /HTTP_(403|401|429)/.test(r.search.catalog_status))};
  });
  const directCount=publishers.filter(p=>p.direct_rates.every(x=>x!==null)).length;
  const unresolved=publishers.filter(p=>p.direct_rates.some(x=>x===null)||p.blocked);
  // End-to-end research speed only makes sense once source discovery and the
  // correct future-growth selection work. Keep diagnostic timing separate.
  const gate=!speed.speed_stable?'UNSTABLE_DIAGNOSTIC_SPEED':
    unresolved.length?'PARTIAL_SOURCE_AND_DISCOVERY_UNRESOLVED':'REQUIRES_MARKET_SCOPE_APPROVAL';
  return {...speed,gate,diagnostic_speed_only:unresolved.length>0,
    successful_publisher_count:directCount,unresolved_publishers:unresolved.map(x=>x.publisher),
    publisher_coverage:publishers,
    warning:'HTTP 200 or a past URL seed alone is NOT successful live search. Historical CAGR is never a forecast. Exact model-schema and official-source evidence must both pass.'};
}

export async function runR48({fetchFn=fetch,searchFn=getSearch,chooseFn}={}){
  const path=join(BASE,'R48_TOPIC01_INFORMATION_TECHNOLOGY_RESULT');
  const txt=path+'.txt',json=path+'.json';const lines=[];
  const log=async line=>{lines.push(line);await appendFile(txt,line+'\r\n');};
  await writeFile(txt,'REPORT=STAGE04_R48_TOPIC01_CONSTRAINED_MODEL_AND_ENGINE_ISOLATION\r\nSTATUS=RUNNING\r\nPAID_CREDITS_USED=0\r\nDB_SCORE_DEPLOY_CHANGE=NONE\r\n');
  try{
    const matrix=await readFile(MATRIX,'utf8');
    const topic=parseUrlSeeds(matrix).find(t=>t.name===TARGET.name);
    if(!topic)throw Error('TOPIC_01_NOT_FOUND');
    const rounds=[],blockedCatalogs=new Set(),blockedReports=new Set(),blockedSearchEngines=new Set();
    const firstPartyDiscovery=(p,seed,options)=>discoverR48(p,seed,{...options,blockedCatalogs,blockedSearchEngines});
    const firstPartyInspect=async(p,url,options)=>{
      if(blockedReports.has(p.id))return {url,state:'SOURCE_BLOCKED',error:'REPORT_SKIPPED_PREVIOUS_HTTP_403',
        cagr:null,period:null,source_audit:'NOT_AUDITED',report_ms:0,ollama_ms:0};
      const result=await inspect(p,url,options);
      if(result.state==='SOURCE_BLOCKED'&&/HTTP_(401|403|429)/.test(result.error||''))blockedReports.add(p.id);
      return result;
    };
    for(let index=0;index<4;index++){
      const start=performance.now(),publishers=[];
      for(const p of PUBLISHERS){
        const res=await researchPublisher(p,topic.seeds[p.id],{
          fetchFn,searchFn,chooseFn,discoverFn:firstPartyDiscovery,inspectFn:firstPartyInspect,
          model:MODEL,maxReports:8
        });
        publishers.push(res);
        await log(`ROUND=${index+1} MEDIA=${p.id} STATE=${res.state} SEARCH=${res.search.search_state} CATALOG=${res.search.catalog_status} CATALOG_REPORTS=${res.search.catalog_total} TOPIC_REPORTS=${res.search.catalog_topic} CANDIDATES=${res.search.candidate_urls.length} CHECKED=${res.inspections.length} UNINSPECTED=${res.uninspected} CAGR=${res.selected?.cagr??'NULL'} PERIOD=${res.selected?.period??'NULL'} SEARCH_MS=${res.search_ms} REPORT_MS=${res.report_ms} OLLAMA_MS=${res.ollama_ms} TOTAL_MS=${res.total_ms}`);
        for(const attempt of res.search.attempts)await log(`ROUND=${index+1} MEDIA=${p.id} PATH=${attempt.engine} STATUS=${attempt.status} LINKS=${attempt.found} HTML_BYTES=${attempt.html_bytes??'NA'} JS_OR_CHALLENGE=${attempt.gate??'NA'} BING_WRAPPED=${attempt.bing_wrapped_links??'NA'}`);
        for(const s of res.inspections)await log(`ROUND=${index+1} MEDIA=${p.id} REPORT=${clean(s.url)} STATE=${s.state} PCT=${s.cagr??'NULL'} PERIOD=${s.period??'NULL'} AUDIT=${s.source_audit} ERROR=${clean(s.error)} MODEL_ID=${clean(s.model_candidate_id)} MODEL_SCOPE=${clean(s.model_scope)} MODEL_TIME_MS=${s.ollama_ms??0} EVIDENCE=${clean(s.source_excerpt)}`);
      }
      const round={index:index+1,warmup:index===0,at:new Date().toISOString(),
        total_ms:Math.round(performance.now()-start),publishers};
      rounds.push(round);
      await writeFile(json,JSON.stringify({status:'RUNNING',rounds},null,2));
      await log(`ROUND_FINISHED=${index+1} WARMUP=${round.warmup} TOTAL_MS=${round.total_ms}`);
    }
    const summary=summarizeR48(rounds);
    await writeFile(json,JSON.stringify({status:'FINISHED_RESEARCH_ONLY',topic:TARGET,summary,rounds},null,2));
    await log(`SUMMARY_GATE=${summary.gate}`);
    await log(`DIAGNOSTIC_SPEED_MEDIAN_MS=${summary.median_ms} DEVIATION=${summary.deviation_ratio} SPEED_STABLE=${summary.speed_stable}`);
    await log(`VALIDATED_DIRECT_PUBLISHERS=${summary.successful_publisher_count}/4 UNRESOLVED=${summary.unresolved_publishers.join(',')||'NONE'}`);
    await log('STATUS=FINISHED_RESEARCH_ONLY');
    await log('SEND_TXT=R48_TOPIC01_INFORMATION_TECHNOLOGY_RESULT.txt');
    return summary;
  }catch(err){await log('STATUS=FAILED');await log('ERROR='+clean(err.message));throw err;}
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1])
  runR48().catch(err=>{console.error('R48_FATAL='+clean(err.message));process.exitCode=1;});
