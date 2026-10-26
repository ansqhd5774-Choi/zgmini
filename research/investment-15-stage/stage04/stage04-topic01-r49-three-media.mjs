/**
 * R49 Stage04 topic 01. User-approved 403 policy:
 * BRI is a recorded SOURCE_BLOCKED exclusion, never contacted in this run.
 * The three remaining publishers retain live, independent investigation.
 * This is read-only research; no score/DB/order/deployment effects.
 */
import {readFile,writeFile,appendFile} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {PUBLISHERS,parseUrlSeeds} from './stage04-four-publisher-r37-readonly.mjs';
import {TARGET,researchPublisher,inspect} from './stage04-topic01-r45-readonly.mjs';
import {discoverR48,summarizeR48} from './stage04-topic01-r48-repeat.mjs';

const BASE=join(dirname(fileURLToPath(import.meta.url)),'..');
const MATRIX=join(BASE,'STAGE04_R35_FOUR_MEDIA_CAGR_MATRIX_20261026.md');
const MODEL='gemma3:4b';
export const EXCLUDED_PUBLISHERS=Object.freeze(['BRI']);
export const ACTIVE_PUBLISHERS=Object.freeze(PUBLISHERS.filter(p=>!EXCLUDED_PUBLISHERS.includes(p.id)).map(p=>p.id));
const clean=s=>String(s??'NULL').replace(/[\r\n=|]/g,' ').slice(0,240);

export function excludedBri(){
  return {publisher:'BRI',state:'SOURCE_BLOCKED_EXCLUDED',selected:null,
    search:{engine:'NO_NETWORK_REQUEST',search_state:'EXCLUDED_PRIOR_HTTP_403',
      catalog_status:'EXCLUDED_PRIOR_HTTP_403',catalog_total:0,catalog_topic:0,
      candidate_urls:[],attempts:[{engine:'BRI',status:'USER_APPROVED_EXCLUSION_AFTER_R48_403',found:0}],
      search_ms:0},
    inspections:[],uninspected:0,search_ms:0,report_ms:0,ollama_ms:0,total_ms:0};
}

/** Missing sources must not become 0 or an eligible mean input. */
export function comparableMean(entries){
  const eligible=entries.filter(x=>x.eligible===true&&Number.isFinite(x.rate)&&
    typeof x.market_basis==='string'&&x.market_basis&&
    typeof x.period==='string'&&x.period);
  if(!eligible.length)return {status:'NO_COMPARABLE_SOURCES',mean:null,count:0};
  if(new Set(eligible.map(x=>`${x.market_basis}|${x.period}`)).size!==1)
    return {status:'INCOMPATIBLE_MARKET_OR_PERIOD',mean:null,count:eligible.length};
  return {status:'RESEARCH_MEAN_ONLY',mean:eligible.reduce((s,x)=>s+x.rate,0)/eligible.length,
    count:eligible.length,market_basis:eligible[0].market_basis,period:eligible[0].period};
}

export function summarizeR49(rounds){
  const diagnostic=summarizeR48(rounds);
  const measured=rounds.filter(x=>!x.warmup);
  const active_coverage=diagnostic.publisher_coverage.filter(x=>ACTIVE_PUBLISHERS.includes(x.publisher));
  const active_attempted=measured.length===3&&measured.every(round=>
    ACTIVE_PUBLISHERS.every(id=>round.publishers.some(x=>x.publisher===id&&x.search.engine!=='NO_NETWORK_REQUEST')));
  const bri_uncontacted=rounds.every(round=>round.publishers.find(x=>x.publisher==='BRI')?.state===
    'SOURCE_BLOCKED_EXCLUDED');
  const unresolved=active_coverage.filter(x=>x.direct_rates.some(x=>x===null)||x.blocked);
  const gate=!bri_uncontacted?'EXCLUDED_SOURCE_POLICY_VIOLATION':
    !active_attempted?'ACTIVE_SOURCE_ATTEMPT_INCOMPLETE':
    !diagnostic.speed_stable?'UNSTABLE_DIAGNOSTIC_SPEED':
    !diagnostic.provider_results_consistent?'UNSTABLE_RESULTS':
    unresolved.length?'PARTIAL_ACTIVE_SOURCES_UNRESOLVED':'REQUIRES_MARKET_SCOPE_APPROVAL';
  return {...diagnostic,gate,all_four_attempted:false,active_attempted,
    active_publishers:ACTIVE_PUBLISHERS,excluded_publishers:EXCLUDED_PUBLISHERS,
    excluded_bri_uncontacted:bri_uncontacted,active_source_count:ACTIVE_PUBLISHERS.length,
    successful_active_publisher_count:active_coverage.filter(x=>x.direct_rates.every(v=>v!==null)).length,
    unresolved_active_publishers:unresolved.map(x=>x.publisher),
    warning:'BRI is EXCLUDED after documented HTTP403; only three active publishers. Missing rates are NULL, not 0. GICS/market mismatch and reuse rights remain unresolved.'};
}

export async function runR49({fetchFn=fetch,searchFn,researchFn=researchPublisher,
  outputPrefix=join(BASE,'R49_TOPIC01_INFORMATION_TECHNOLOGY_RESULT')}={}){
  const txt=outputPrefix+'.txt',json=outputPrefix+'.json';
  await writeFile(txt,'REPORT=STAGE04_R49_TOPIC01_THREE_ACTIVE_SOURCES\r\n'+
    'ACTIVE_MEDIA=TBRC,SkyQuest,Precedence\r\n'+
    'EXCLUDED_MEDIA=BRI\r\nEXCLUSION_REASON=PRIOR_R48_HTTP_403_USER_APPROVED\r\n'+
    'PAID_CREDITS_USED=0\r\nDB_SCORE_DEPLOY_CHANGE=NONE\r\nSTATUS=RUNNING\r\n');
  const log=line=>appendFile(txt,`${line}\r\n`);
  try{
    const matrix=await readFile(MATRIX,'utf8');
    const topic=parseUrlSeeds(matrix).find(t=>t.name===TARGET.name);
    if(!topic)throw Error('TOPIC_01_NOT_FOUND');
    const blockedCatalogs=new Set(),blockedReports=new Set(),blockedSearchEngines=new Set();
    const firstPartyDiscovery=(p,seed,options)=>discoverR48(p,seed,{...options,
      blockedCatalogs,blockedSearchEngines});
    const firstPartyInspect=async(p,url,options)=>{
      if(blockedReports.has(p.id))return {url,state:'SOURCE_BLOCKED',
        error:'REPORT_SKIPPED_PREVIOUS_HTTP_403',cagr:null,period:null,
        source_audit:'NOT_AUDITED',report_ms:0,ollama_ms:0};
      const result=await inspect(p,url,options);
      if(result.state==='SOURCE_BLOCKED'&&/HTTP_(401|403|429)/.test(result.error||''))
        blockedReports.add(p.id);
      return result;
    };
    const rounds=[];
    for(let i=0;i<4;i++){
      const start=performance.now(),publishers=[];
      for(const p of PUBLISHERS){
        // Before even invoking any discovery callback: no BRI network request.
        const res=p.id==='BRI'?excludedBri():await researchFn(p,topic.seeds[p.id],{
          fetchFn,searchFn,discoverFn:firstPartyDiscovery,inspectFn:firstPartyInspect,
          model:MODEL,maxReports:8});
        publishers.push(res);
        await log(`ROUND=${i+1} MEDIA=${p.id} STATE=${res.state} SEARCH=${res.search.search_state} CATALOG=${res.search.catalog_status} CATALOG_REPORTS=${res.search.catalog_total??0} TOPIC_REPORTS=${res.search.catalog_topic??0} CANDIDATES=${res.search.candidate_urls.length} CHECKED=${res.inspections.length} UNINSPECTED=${res.uninspected??0} CAGR=${res.selected?.cagr??'NULL'} PERIOD=${res.selected?.period??'NULL'} SEARCH_MS=${res.search_ms} REPORT_MS=${res.report_ms} OLLAMA_MS=${res.ollama_ms} TOTAL_MS=${res.total_ms}`);
        for(const item of res.inspections||[])await log(`ROUND=${i+1} MEDIA=${p.id} REPORT=${clean(item.url)} STATE=${item.state} PCT=${item.cagr??'NULL'} PERIOD=${item.period??'NULL'} AUDIT=${item.source_audit} MODEL_ID=${clean(item.model_candidate_id)} MODEL_SCOPE=${clean(item.model_scope)} MODEL_TIME_MS=${item.ollama_ms??0} EVIDENCE=${clean(item.source_excerpt)} ERROR=${clean(item.error)}`);
        for(const attempt of res.search.attempts||[])await log(`ROUND=${i+1} MEDIA=${p.id} PATH=${attempt.engine} STATUS=${clean(attempt.status)} LINKS=${attempt.found??0} HTML_BYTES=${attempt.html_bytes??'NA'} JS_OR_CHALLENGE=${attempt.gate??'NA'} BING_WRAPPED=${attempt.bing_wrapped_links??'NA'}`);
      }
      const round={index:i+1,warmup:i===0,at:new Date().toISOString(),total_ms:Math.round(performance.now()-start),
        publishers};rounds.push(round);
      await writeFile(json,JSON.stringify({status:'RUNNING',rounds},null,2));
      await log(`ROUND_FINISHED=${i+1} WARMUP=${round.warmup} TOTAL_MS=${round.total_ms}`);
    }
    const summary=summarizeR49(rounds);
    // A provisional publisher-wide CAGR is NOT automatically a GICS sector CAGR.
    // Inputs remain visible, but none is mean-eligible until comparable scope
    // and forecast periods are explicitly established.
    const averageInputs=rounds.at(-1).publishers.map(res=>({
      publisher:res.publisher,rate:res.selected?.cagr??null,
      period:res.selected?.period??null,
      market_basis:null,eligible:false,
      reason:res.publisher==='BRI'?'HTTP_403_EXCLUDED':'SCOPE_COMPARABILITY_NOT_APPROVED'}));
    const mean=comparableMean(averageInputs);
    await writeFile(json,JSON.stringify({status:'FINISHED_RESEARCH_ONLY',topic:TARGET,
      exclusion_evidence:'R48 BRI CATALOG_HTTP_403 and REPORT_HTTP_403',summary,
      averageInputs,mean,rounds},null,2));
    await log(`SUMMARY_GATE=${summary.gate}`);
    await log(`DIAGNOSTIC_SPEED_MEDIAN_MS=${summary.median_ms} DEVIATION=${summary.deviation_ratio} SPEED_STABLE=${summary.speed_stable}`);
    await log(`ACTIVE_SOURCE_COUNT=${summary.active_source_count} EXCLUDED_SOURCE_COUNT=1 BRI_NETWORK_REQUESTS=0`);
    await log(`VALIDATED_ACTIVE_PUBLISHERS=${summary.successful_active_publisher_count}/3 UNRESOLVED=${summary.unresolved_active_publishers.join(',')||'NONE'}`);
    await log(`RESEARCH_AVERAGE=${mean.mean??'NULL'} RESEARCH_AVERAGE_STATUS=${mean.status}`);
    await log('STATUS=FINISHED_RESEARCH_ONLY');
    await log('SEND_TXT=R49_TOPIC01_INFORMATION_TECHNOLOGY_RESULT.txt');
    return {summary,mean,rounds};
  }catch(err){await log('STATUS=FAILED');await log('ERROR='+clean(err.message));throw err;}
}

if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1])
  runR49().catch(err=>{console.error('R49_FATAL='+clean(err.message));process.exitCode=1;});
