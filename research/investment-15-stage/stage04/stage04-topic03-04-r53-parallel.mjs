/**
 * Stage04 R53: topics 03 and 04 concurrently, each with independent verdicts.
 * Only first-party publisher pages and public search, research-only.
 * BRI remains user-excluded after HTTP403. Never alter scores or a DB.
 */
import {readFile,writeFile,appendFile} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {PUBLISHERS,parseUrlSeeds,pagePlainText,extractCagrCandidates} from './stage04-four-publisher-r37-readonly.mjs';
import {officialReportUrl,getOfficial,getSearch,searchLinks,titleOf,candidateChoiceSchema} from './stage04-topic01-r45-readonly.mjs';
import {catalogLinks,searchBodyProfile} from './stage04-topic01-r48-repeat.mjs';
import {excludedBri,ACTIVE_PUBLISHERS} from './stage04-topic01-r49-three-media.mjs';
import {candidatePeriod,headlineForecastConflict} from './stage04-topic02-r50-three-media.mjs';
import {auditForecastSource} from './forecast-source-audit-r29-readonly.mjs';

const BASE=join(dirname(fileURLToPath(import.meta.url)),'..');
const MATRIX=join(BASE,'STAGE04_R35_FOUR_MEDIA_CAGR_MATRIX_20261026.md');
const MODEL_URL='http://127.0.0.1:11434/api/generate';
const MAX_REPORTS=5;
const clean=s=>String(s??'NULL').replace(/[\r\n=|]/g,' ').slice(0,300);
const unique=a=>[...new Set(a)];
export const TOPICS=Object.freeze([
  {index:3,name:'임의소비재(경기소비재)',english:'Consumer Discretionary',
    keywords:['consumer discretionary market','consumer cyclicals market','consumer durables market'],
    guard:'AUTO_RETAIL_DURABLES_APPAREL_LEISURE_NOT_STAPLES'},
  {index:4,name:'산업재',english:'Industrials',
    keywords:['industrials sector market','industrial machinery market','industrial goods market'],
    guard:'CAPITAL_GOODS_COMMERCIAL_SERVICES_TRANSPORTATION'}
]);
const CATALOGS={
  '3':{TBRC:'https://www.thebusinessresearchcompany.com/global-market-reports',
    SkyQuest:'https://www.skyquestt.com/industries/consumer-discretionary'},
  '4':{TBRC:'https://www.thebusinessresearchcompany.com/global-market-reports'}
};
const isMarketSlug=s=>/(?:-market|-global-market-report)$/.test(s);
export function rankReport(topic,url){
  let slug;
  try{slug=new URL(url).pathname.split('/').filter(Boolean).at(-1).toLowerCase();}
  catch{return 0;}
  if(!isMarketSlug(slug))return 0;
  if(topic.index===3){
    if(/^(consumer-discretionary|consumer-cyclicals)(?:-market|-global-market-report)$/.test(slug))return 1000;
    if(/(?:consumer-discretionary|consumer-cyclicals|discretionary-consumer)/.test(slug))return 450;
    if(/(?:consumer-durables|automotive|automobiles|apparel|luxury|leisure|hotels|restaurants|retail)/.test(slug) &&
        !/(?:consumer-staples|food-retail)/.test(slug))return 20;
    return 0;
  }
  if(/^(industrials|industrial-goods|industrial-sector)(?:-market|-global-market-report)$/.test(slug))return 1000;
  if(/(?:industrial-machinery|machinery-and-industrial|industrial-equipment)/.test(slug))return 250;
  if(/(?:machinery|aerospace-and-defense|commercial-services|transportation|construction-equipment)/.test(slug))return 15;
  return 0;
}

export function marketScope(topic,url,title,body=''){
  const slug=new URL(url).pathname.split('/').filter(Boolean).at(-1).toLowerCase();
  const heading=String(title).toLowerCase();
  if(topic.index===3){
    if(/consumer-staples|food-retail/.test(slug))return 'UNRELATED_MARKET';
    if(/consumer-discretionary|consumer-cyclicals/.test(slug) &&
       /consumer discretionary|consumer cyclicals/i.test(heading)){
      // Whole-sector scope is only a review candidate, never auto-approved.
      return 'BROAD_SCOPE_REVIEW';
    }
    return rankReport(topic,url)>0?'DISCRETIONARY_SUBMARKET_PROXY':'UNRELATED_MARKET';
  }
  if(/^(industrials|industrial-sector)(?:-market|-global-market-report)$/.test(slug) &&
      /industrials?\s+(?:sector|market)/i.test(heading) &&
      /(?:transportation|logistics)/i.test(body) &&
      /(?:commercial services|professional services)/i.test(body))
    return 'BROAD_SCOPE_REVIEW';
  return rankReport(topic,url)>0?'INDUSTRIALS_SUBMARKET_PROXY':'UNRELATED_MARKET';
}

export function serialModelQueue(){
  let previous=Promise.resolve();
  return work=>{const task=previous.then(work,work);previous=task.catch(()=>{});return task;};
}

export async function chooseR53(topic,p,title,candidates,{fetchFn=fetch}={}){
  const schema=candidateChoiceSchema(candidates.length);
  const prompt='Publisher official report numerical audit. No invented CAGR, no browsing.\n'+
    'TOPIC='+topic.index+' '+topic.english+'; REPORT='+title+'; PUBLISHER='+p.id+'\n'+
    'Choose only a FUTURE worldwide report-market CAGR, not historical/region/subsegment growth.\n'+
    'Use ONLY literal candidate IDs NONE/C0/C1 etc, not numeric rates as IDs.\n'+
    'DIRECT requires the ENTIRE GICS '+topic.english+' sector, not just one submarket.\n'+
    'Narrower reports (e.g. industrial machinery, durables) are PROXY.\n'+
    candidates.map((c,i)=>'C'+i+': '+c.pct+'% '+c.excerpt.slice(0,390)).join('\n')+
    '\nJSON object keys: candidate_id and scope.';
  const started=performance.now();
  const r=await fetchFn(MODEL_URL,{method:'POST',signal:AbortSignal.timeout(90000),
    headers:{'content-type':'application/json'},body:JSON.stringify({
      model:'gemma3:4b',prompt,stream:false,think:false,format:schema,
      options:{temperature:0,seed:53,num_predict:70}})});
  if(!r.ok)throw Error('OLLAMA_HTTP_'+r.status);
  const data=await r.json();let out;
  try{out=JSON.parse(data.response);}catch{throw Error('OLLAMA_JSON_INVALID');}
  if(!schema.properties.candidate_id.enum.includes(out?.candidate_id) ||
      !['DIRECT','PROXY','UNCLEAR','UNRELATED'].includes(out.scope) ||
      Object.keys(out).sort().join()!=='candidate_id,scope')throw Error('OLLAMA_SCHEMA_INVALID');
  return {candidate_id:out.candidate_id,scope:out.scope,
    index:out.candidate_id==='NONE'?-1:Number(out.candidate_id.slice(1)),
    elapsed_ms:Math.round(performance.now()-started)};
}

export async function inspectR53(topic,p,url,{fetchFn=fetch,modelQueue=serialModelQueue(),chooseFn=chooseR53}={}){
  const out={url,state:'REPORT_FAILED',title:null,market_scope:null,source_audit:'NOT_AUDITED',
    observed_cagr:null,period:null,sector_eligible:false,model_scope:null,
    model_candidate_id:null,scope_warning:null,error:null,excerpt:null,report_ms:0,ollama_ms:0};
  const start=performance.now();let html;
  try{html=await getOfficial(url,p,fetchFn);}
  catch(e){out.report_ms=Math.round(performance.now()-start);out.error=clean(e.message);
    out.state=/HTTP_(401|403|429)/.test(e.message)?'SOURCE_BLOCKED':'REPORT_FAILED';return out;}
  out.report_ms=Math.round(performance.now()-start);
  out.title=titleOf(html);const body=pagePlainText(html);
  out.market_scope=marketScope(topic,url,out.title,body);
  if(out.market_scope==='UNRELATED_MARKET'){out.state='OUT_OF_SCOPE';return out;}
  const headlineConflict=headlineForecastConflict(out.title,html);
  if(headlineConflict){out.state='SOURCE_CONFLICT';out.error=headlineConflict;out.source_audit='SOURCE_CONFLICT';return out;}
  let audit=null;
  if(p.id==='TBRC'){
    audit=auditForecastSource(html);out.source_audit=audit.source_audit;
    if(audit.source_audit==='SOURCE_CONFLICT'){out.state='SOURCE_CONFLICT';
      out.error=audit.source_conflict_reason;return out;}
    if(audit.source_audit!=='CONSISTENT'){
      // Do not let the model select a historical CAGR from an unaudited
      // TBRC full page. This is missing evidence, not a publisher ban.
      out.state='SOURCE_AUDIT_INCOMPLETE';
      out.error=audit.source_conflict_reason||'FORECAST_SECTION_NOT_VERIFIED';
      return out;
    }
  }
  const candidates=extractCagrCandidates(audit?.forecast_excerpt||body);
  if(!candidates.length){out.state='NO_LITERAL_CAGR';return out;}
  const modelStart=performance.now();
  try{
    const selected=await modelQueue(()=>chooseFn(topic,p,out.title,candidates,{fetchFn}));
    out.ollama_ms=selected.elapsed_ms??Math.round(performance.now()-modelStart);
    out.model_scope=selected.scope;out.model_candidate_id=selected.candidate_id;
    if(selected.index<0||['UNCLEAR','UNRELATED'].includes(selected.scope)){
      out.state='MODEL_UNCONFIRMED';return out;}
    const chosen=candidates[selected.index];
    if(!chosen){out.state='MODEL_UNCONFIRMED';return out;}
    out.excerpt=chosen.excerpt.slice(0,300);
    out.period=audit?.source_audit==='CONSISTENT'?
      audit.forecast_base_year+'-'+audit.forecast_end_year:
      candidatePeriod(chosen.excerpt,body,out.title);
    if(!out.period){out.state='FORECAST_PERIOD_UNVERIFIED';return out;}
    if(audit?.source_audit==='CONSISTENT'&&
       Math.abs(chosen.pct-audit.forecast_narrative_pct)>0.05){
      out.state='FORECAST_SELECTION_MISMATCH';return out;}
    if(selected.scope==='DIRECT'&&out.market_scope!=='BROAD_SCOPE_REVIEW')
      out.scope_warning='MODEL_DIRECT_OVERRIDDEN_BY_DETERMINISTIC_MARKET_SCOPE';
    out.observed_cagr=chosen.pct;
    // Broad market candidates require explicit sector equivalence and
    // comparable basis. Even a DIRECT model answer never makes them eligible.
    out.state=out.market_scope==='BROAD_SCOPE_REVIEW'?
      'BROAD_SCOPE_REVIEW_REQUIRED':'PUBLISHER_PROXY_OBSERVED';
  }catch(e){out.state='OLLAMA_FAILED';out.error=clean(e.message);
    out.ollama_ms=Math.round(performance.now()-modelStart);}
  return out;
}

async function getCatalog(url,p,fetchFn){
  const start=performance.now();
  const r=await fetchFn(url,{redirect:'manual',signal:AbortSignal.timeout(9000),
    headers:{accept:'text/html','user-agent':'ZGMINI public sector research'}});
  if(!r.ok)throw Error('CATALOG_HTTP_'+r.status);
  if(r.url&&new URL(r.url).hostname!==new URL(url).hostname)
    throw Error('CATALOG_REDIRECT_OUTSIDE_PUBLISHER');
  if(Number(r.headers?.get?.('content-length')||0)>1_000_000)throw Error('CATALOG_TOO_LARGE');
  const html=await r.text();if(Buffer.byteLength(html)>1_000_000)throw Error('CATALOG_TOO_LARGE');
  return {html,ms:Math.round(performance.now()-start)};
}

export async function discoverR53(topic,p,seed,{fetchFn=fetch,searchFn=getSearch,
  blockedCatalogs=new Set(),blockedSearchEngines=new Set()}={}){
  const start=performance.now(),attempts=[],live=[];
  const catalog=CATALOGS[String(topic.index)]?.[p.id];
  let catalog_status='NO_VERIFIED_CATALOG_URL',catalog_topic=0;
  const key=topic.index+'_'+p.id;
  if(catalog&&blockedCatalogs.has(key))catalog_status='SKIPPED_PREVIOUS_CATALOG_BLOCK';
  else if(catalog){
    try{const response=await getCatalog(catalog,p,fetchFn);
      const urls=catalogLinks(response.html,catalog,p).filter(u=>rankReport(topic,u)>0);
      live.push(...urls);catalog_topic=urls.length;catalog_status='OK';
      attempts.push({engine:'OFFICIAL_CATALOG',status:'OK',found:urls.length,ms:response.ms});}
    catch(e){catalog_status=clean(e.message);
      if(/CATALOG_HTTP_(401|403|404|429)/.test(catalog_status))blockedCatalogs.add(key);
      attempts.push({engine:'OFFICIAL_CATALOG',status:catalog_status,found:0});}
  }
  // Two independent public search engines, three topic-specific aliases.
  for(const keyword of topic.keywords){
    const query='site:'+p.host+' '+keyword+' CAGR report';
    for(const [engine,url] of [
      ['GOOGLE','https://www.google.com/search?q='+encodeURIComponent(query)+'&num=20'],
      ['BING','https://www.bing.com/search?q='+encodeURIComponent(query)+'&count=20']]){
      if(blockedSearchEngines.has(engine)){
        attempts.push({engine,keyword,status:'SKIPPED_PREVIOUS_HTTP_429',found:0});continue;}
      try{const html=await searchFn(url,fetchFn);
        const urls=searchLinks(html,url,p).filter(u=>rankReport(topic,u)>0);
        live.push(...urls);attempts.push({engine,keyword,status:'OK',found:urls.length,
          ...searchBodyProfile(html,engine)});}
      catch(e){const status=clean(e.message);attempts.push({engine,keyword,status,found:0});
        if(/HTTP_429/.test(status))blockedSearchEngines.add(engine);}
    }
  }
  const liveUrls=unique(live.filter(u=>officialReportUrl(u,p)));
  const candidate_urls=unique([...liveUrls,...(seed?[seed]:[])]
    .filter(u=>officialReportUrl(u,p)&&rankReport(topic,u)>0))
    .sort((a,b)=>rankReport(topic,b)-rankReport(topic,a)||a.localeCompare(b));
  return {engine:'OFFICIAL_CATALOG_GOOGLE_BING',
    search_state:liveUrls.length?'LIVE_REPORT_CANDIDATES':
      candidate_urls.length?'SEED_ONLY_SEARCH_INCOMPLETE':'SEARCH_INCOMPLETE',
    catalog_status,catalog_topic,attempts,candidate_urls,
    live_discovered_count:liveUrls.length,seed_used:!!seed,
    search_ms:Math.round(performance.now()-start)};
}

export async function researchPublisher(topic,p,seed,{fetchFn=fetch,searchFn=getSearch,
  modelQueue,discoverFn=discoverR53,inspectFn=inspectR53,
  blockedCatalogs,blockedSearchEngines,blockedReports}={}){
  const start=performance.now();
  const search=await discoverFn(topic,p,seed,{fetchFn,searchFn,blockedCatalogs,blockedSearchEngines});
  const inspections=[],key=topic.index+'_'+p.id;
  for(const url of search.candidate_urls.slice(0,MAX_REPORTS)){
    if(blockedReports?.has(key)){inspections.push({url,state:'SOURCE_BLOCKED',
      error:'SKIPPED_PREVIOUS_HTTP_403',observed_cagr:null,report_ms:0,ollama_ms:0});break;}
    const r=await inspectFn(topic,p,url,{fetchFn,modelQueue});inspections.push(r);
    if(r.state==='SOURCE_BLOCKED'&&/HTTP_(401|403|429)/.test(r.error||'')){
      blockedReports?.add(key);break;}
    if(r.observed_cagr!==null)break;
  }
  const selected=inspections.find(x=>x.observed_cagr!==null)||null;
  return {publisher:p.id,state:selected?selected.state:
      inspections.some(x=>x.state==='SOURCE_BLOCKED')?'SOURCE_PARTIAL_BLOCKED':
      search.candidate_urls.length?'NO_FORECAST_OBSERVED':'NO_REPORT_DISCOVERED',
    search,inspections,selected,uninspected:Math.max(0,search.candidate_urls.length-inspections.length),
    search_ms:search.search_ms,
    report_ms:inspections.reduce((n,x)=>n+(x.report_ms||0),0),
    ollama_ms:inspections.reduce((n,x)=>n+(x.ollama_ms||0),0),
    total_ms:Math.round(performance.now()-start)};
}

export async function researchTopic(topic,seeds,opts){
  const start=performance.now(),begin=Date.now();
  const publishers=[];
  // Publisher-level order is deterministic for diagnostic comparability.
  for(const p of PUBLISHERS){
    publishers.push(p.id==='BRI'?excludedBri():await opts.researchFn(topic,p,seeds?.[p.id],opts));
  }
  return {topic_index:topic.index,topic:topic.name,started_epoch_ms:begin,
    ended_epoch_ms:Date.now(),total_ms:Math.round(performance.now()-start),publishers};
}

export function summarizeDual(rounds){
  const measured=rounds.filter(x=>!x.warmup);
  const topics=TOPICS.map(topic=>{
    const rows=measured.map(x=>x.topics.find(t=>t.topic_index===topic.index));
    const times=rows.map(x=>x.total_ms).sort((a,b)=>a-b);
    const median=times[1];
    const deviation=median?
      Math.max(Math.abs(times[0]-median),Math.abs(times[2]-median))/median:null;
    const providers=ACTIVE_PUBLISHERS.map(p=>{
      const statuses=rows.map(r=>r.publishers.find(x=>x.publisher===p));
      const keys=statuses.map(r=>[r.state,r.selected?.observed_cagr??'NULL',
        r.selected?.period??'NULL',r.selected?.market_scope??'NULL'].join('|'));
      return {publisher:p,stable:new Set(keys).size===1,
        states:statuses.map(x=>x.state),observations:statuses.map(x=>x.selected?.observed_cagr??null)};
    });
    const speed_stable=deviation!==null&&deviation<=.25;
    const results_stable=providers.every(x=>x.stable);
    const gate=!results_stable?'UNSTABLE_RESULTS':
      !speed_stable?'UNSTABLE_DIAGNOSTIC_SPEED':'PARTIAL_RESEARCH_REVIEW_REQUIRED';
    return {index:topic.index,name:topic.name,median_ms:median,
      deviation_ratio:deviation===null?null:Number(deviation.toFixed(3)),
      speed_stable,results_stable,providers,gate,sector_cagr:null};
  });
  const overlap=rounds.map(r=>Math.max(0,Math.min(...r.topics.map(t=>t.ended_epoch_ms))-
    Math.max(...r.topics.map(t=>t.started_epoch_ms))));
  const bri_uncontacted=rounds.every(r=>r.topics.every(t=>
    t.publishers.find(p=>p.publisher==='BRI')?.state==='SOURCE_BLOCKED_EXCLUDED'));
  return {topics,parallel_overlap_ms:overlap,parallel_observed:overlap.every(n=>n>=0)&&overlap.some(n=>n>0),
    bri_uncontacted,gate:!bri_uncontacted?'BRI_POLICY_VIOLATION':
      topics.every(x=>x.speed_stable&&x.results_stable)?'PARTIAL_DUAL_RESEARCH_REVIEW_REQUIRED':'DIAGNOSTIC_REVIEW'};
}

export async function runR53({fetchFn=fetch,searchFn=getSearch,researchFn=researchPublisher,
  outputPrefix=join(BASE,'R53_TOPIC03_04_PARALLEL_RESULT')}={}){
  const txt=outputPrefix+'.txt',json=outputPrefix+'.json',
    history=outputPrefix+'_HISTORY.ndjson';
  await writeFile(txt,'REPORT=R53_STAGE04_TOPICS03_04_PARALLEL\r\n'+
    'TOPICS=03_CONSUMER_DISCRETIONARY,04_INDUSTRIALS\r\n'+
    'PARALLEL_TOPICS=YES\r\nOLLAMA_SHARED_SERIAL_QUEUE=YES\r\n'+
    'BRI_NETWORK_REQUESTS=0\r\nPROJECT_WRITES=NONE\r\nSTATUS=RUNNING\r\n');
  const log=s=>appendFile(txt,s+'\r\n');
  try{
    const parsed=parseUrlSeeds(await readFile(MATRIX,'utf8'));
    const seeds=TOPICS.map(topic=>{
      const item=parsed.find(x=>x.name===topic.name);
      if(!item)throw Error('TOPIC_MISSING_'+topic.index);
      return item.seeds;
    });
    const blockedCatalogs=new Set(),blockedSearchEngines=new Set(),blockedReports=new Set();
    const modelQueue=serialModelQueue(),rounds=[];
    for(let i=0;i<4;i++){
      const start=performance.now();
      // Critical experiment: begin both independent topic jobs together.
      const topics=await Promise.all(TOPICS.map((topic,j)=>researchTopic(topic,seeds[j],{
        fetchFn,searchFn,researchFn,modelQueue,blockedCatalogs,blockedSearchEngines,blockedReports})));
      const round={index:i+1,warmup:i===0,total_ms:Math.round(performance.now()-start),
        at:new Date().toISOString(),topics};rounds.push(round);
      const overlap=Math.max(0,Math.min(...topics.map(t=>t.ended_epoch_ms))-
        Math.max(...topics.map(t=>t.started_epoch_ms)));
      await log('ROUND='+round.index+' WARMUP='+round.warmup+' TOTAL_MS='+round.total_ms+
        ' TOPIC_OVERLAP_MS='+overlap);
      for(const topic of topics){
        await log('TOPIC='+topic.topic_index+' NAME='+topic.topic+' TOTAL_MS='+topic.total_ms);
        for(const p of topic.publishers){
          await log('ROUND='+round.index+' TOPIC='+topic.topic_index+' MEDIA='+p.publisher+
            ' STATE='+p.state+' SEARCH='+p.search.search_state+
            ' LIVE_LINKS='+(p.search.live_discovered_count??0)+' CANDIDATES='+p.search.candidate_urls.length+
            ' OBSERVED_CAGR='+(p.selected?.observed_cagr??'NULL')+
            ' PERIOD='+(p.selected?.period??'NULL')+
            ' SCOPE='+(p.selected?.market_scope??'NULL')+
            ' SECTOR_CAGR=NULL SEARCH_MS='+p.search_ms+' OLLAMA_MS='+p.ollama_ms);
          for(const x of p.inspections)await log('REPORT='+clean(x.url)+' TOPIC='+topic.topic_index+
            ' MEDIA='+p.publisher+' STATE='+x.state+' OBSERVED='+(x.observed_cagr??'NULL')+
            ' PERIOD='+(x.period??'NULL')+' SCOPE='+(x.market_scope??'NULL')+
            ' AUDIT='+(x.source_audit??'NULL')+' MODEL_SCOPE='+(x.model_scope??'NULL')+
            ' WARNING='+(x.scope_warning??'NULL')+' ERROR='+clean(x.error));
          for(const x of p.search.attempts)await log('SEARCH_PATH='+x.engine+' TOPIC='+topic.topic_index+
            ' MEDIA='+p.publisher+' QUERY='+clean(x.keyword)+
            ' STATUS='+clean(x.status)+' FOUND='+(x.found??0)+' JS='+(x.gate??'NA'));
        }
      }
      await writeFile(json,JSON.stringify({status:'RUNNING',rounds},null,2));
    }
    const summary=summarizeDual(rounds);
    const rows=rounds.at(-1).topics.map(t=>({topic:t.topic,index:t.topic_index,sector_cagr:null,
      publishers:t.publishers.map(p=>({publisher:p.publisher,
        observed_cagr:p.selected?.observed_cagr??null,
        period:p.selected?.period??null,
        market_scope:p.selected?.market_scope??null,sector_eligible:false}))}));
    await writeFile(json,JSON.stringify({status:'FINISHED_RESEARCH_ONLY',
      concurrent_topics:TOPICS,summary,rows,rounds},null,2));
    await appendFile(history,JSON.stringify({at:new Date().toISOString(),
      gate:summary.gate,parallel_observed:summary.parallel_observed,
      overlap_ms:summary.parallel_overlap_ms,
      diagnostics:summary.topics.map(t=>({index:t.index,median_ms:t.median_ms,
        results_stable:t.results_stable,speed_stable:t.speed_stable})),rows})+'\n');
    await log('SUMMARY_GATE='+summary.gate+' PARALLEL_OBSERVED='+summary.parallel_observed+
      ' BRI_NETWORK_REQUESTS=0');
    for(const t of summary.topics)await log('TOPIC_SUMMARY='+t.index+' NAME='+t.name+
      ' MEDIAN_MS='+t.median_ms+' DEVIATION='+t.deviation_ratio+
      ' SPEED_STABLE='+t.speed_stable+' RESULTS_STABLE='+t.results_stable+
      ' SECTOR_CAGR=NULL GATE='+t.gate);
    await log('STATUS=FINISHED_RESEARCH_ONLY');
    await log('SEND_TXT=R53_TOPIC03_04_PARALLEL_RESULT.txt');
    return {summary,rows,rounds};
  }catch(e){await log('STATUS=FAILED');await log('ERROR='+clean(e.message));throw e;}
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1])
  runR53().catch(e=>{console.error('R53_FATAL='+clean(e.message));process.exitCode=1;});
