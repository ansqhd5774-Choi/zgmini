/**
 * R50: Stage04 sector 02 Communication Services; Windows PC research only.
 * R49 topic 01 is retained as approved partial with NULL, not recalculated.
 * BRI 403 is user-approved excluded. Three other publishers are independent.
 * Publisher telecommunications-market forecasts are reported but NOT passed
 * off as GICS Communication Services (telecom + media & entertainment).
 */
import {readFile,writeFile,appendFile} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {PUBLISHERS,parseUrlSeeds,pagePlainText,extractCagrCandidates} from './stage04-four-publisher-r37-readonly.mjs';
import {officialReportUrl,getOfficial,getSearch,searchLinks,titleOf,candidateChoiceSchema} from './stage04-topic01-r45-readonly.mjs';
import {catalogLinks,searchBodyProfile} from './stage04-topic01-r48-repeat.mjs';
import {excludedBri,comparableMean,ACTIVE_PUBLISHERS} from './stage04-topic01-r49-three-media.mjs';
import {auditForecastSource} from './forecast-source-audit-r29-readonly.mjs';

const BASE=join(dirname(fileURLToPath(import.meta.url)),'..');
const MATRIX=join(BASE,'STAGE04_R35_FOUR_MEDIA_CAGR_MATRIX_20261026.md');
const MODEL='gemma3:4b';
const MODEL_URL='http://127.0.0.1:11434/api/generate';
const MAX_REPORTS=8;
const CATALOGS={
  TBRC:'https://www.thebusinessresearchcompany.com/global-market-reports',
  SkyQuest:'https://www.skyquestt.com/industries/information-technology',
  Precedence:'https://www.precedenceresearch.com/industry/ict'
};
const clean=s=>String(s??'NULL').replace(/[\r\n=|]/g,' ').slice(0,320);
const unique=a=>[...new Set(a)];
export const TARGET=Object.freeze({index:2,kind:'섹터',name:'커뮤니케이션',english:'Communication Services',
  scope:'GICS_TELECOMMUNICATION_SERVICES_PLUS_MEDIA_AND_ENTERTAINMENT',
  keywords:['telecommunications market','telecom market','communication services market','media entertainment market']});

export function topicRank(url){
  const slug=new URL(url).pathname.split('/').filter(Boolean).at(-1)?.toLowerCase()||'';
  if(/^(telecom|telecommunication|telecommunications)(?:-global-market-report|-market-report|-market)?$/.test(slug))return 1000;
  if(/^(communication-services|communications-services)(?:-market|-global-market-report)?$/.test(slug))return 500;
  if(/^(media-and-entertainment|media-entertainment)(?:-market|-global-market-report)?$/.test(slug))return 250;
  if(/(?:telecom|communication|media-and-entertainment)/.test(slug))return 15;
  return 0;
}

export function classifyScope(url,title,bodyText=''){
  const slug=new URL(url).pathname.split('/').filter(Boolean).at(-1).toLowerCase();
  const heading=String(title).toLowerCase();
  if(/(^|[-])(telecom|telecommunication|telecommunications)([-]|$)/.test(slug) &&
      /telecom/i.test(heading))return 'TELECOM_SUBMARKET';
  if(/media-and-entertainment|media-entertainment/.test(slug))return 'MEDIA_ENTERTAINMENT_SUBMARKET';
  // The label alone is insufficient: the sector must also cover media &
  // entertainment. Full-market eligibility still requires explicit review.
  if(/communication[s]?-services/.test(slug) && /telecom/i.test(bodyText) &&
      /media.{0,15}entertainment/i.test(bodyText))return 'BROAD_SCOPE_REVIEW';
  return 'OTHER_OR_UNRELATED_MARKET';
}

/** Explicit same-year, same-market headline/body forecasts must not conflict. */
export function headlineForecastConflict(title,html){
  const headline=String(title).match(/(?:USD|\$)\s*([\d,.]+)\s*(tn|trillion|bn|billion)\s+by\s+(20\d{2})/i);
  if(!headline)return null;
  const body=pagePlainText(String(html).replace(/<h1\b[^>]*>[\s\S]*?<\/h1>/i,' '));
  const targetYear=headline[3];
  const text=body.slice(0,4500);
  const match=text.match(/(?:global|worldwide)\s+.{0,65}?\s+market\s+size.{0,260}?(?:to|approximately|around)\s+(?:USD|\$)\s*([\d,.]+)\s*(tn|trillion|bn|billion)\s+by\s+(20\d{2})/i);
  if(!match||match[3]!==targetYear)return null;
  const scale=u=>/^(tn|trillion)$/i.test(u)?1e12:1e9;
  const fromTitle=Number(headline[1].replaceAll(',',''))*scale(headline[2]);
  const fromBody=Number(match[1].replaceAll(',',''))*scale(match[2]);
  if(!(fromTitle>0&&fromBody>0))return null;
  return Math.abs(fromTitle/fromBody-1)>0.005?
    `HEADLINE_BODY_SAME_YEAR_SIZE_CONFLICT:${targetYear}`:null;
}

function candidatePeriod(excerpt){
  const periods=[...String(excerpt).matchAll(/\b(20\d{2})\s*(?:-|–|—|to|through)\s*(20\d{2})\b/gi)]
    .filter(m=>Number(m[2])>Number(m[1])&&Number(m[2])-Number(m[1])<=20);
  if(!periods.length)return null;
  const near=periods.find(m=>/forecast|project|CAGR/i.test(excerpt.slice(Math.max(0,m.index-120),m.index+65)));
  const m=near||periods[0];return `${m[1]}-${m[2]}`;
}

export async function chooseForecast(p,title,candidates,{fetchFn=fetch,model=MODEL}={}){
  const schema=candidateChoiceSchema(candidates.length);
  const prompt='Audit only the literal public publisher text; no web browsing or invented rates.\n'+
    `Official publisher ${p.id}; report heading ${title}.\n`+
    'Choose one CURRENT FUTURE global market forecast CAGR (not historic, regional, subsegment, or alternate scenario).\n'+
    'candidate_id is a literal C0/C1 label, NEVER the percent value. Choose NONE when uncertain.\n'+
    'scope DIRECT only for GICS Communication Services including BOTH telecom and media & entertainment.\n'+
    'Telecommunications-only, media-only, or entertainment-only reports are PROXY, even with valid forecasts.\n'+
    candidates.map((x,i)=>`C${i}: CAGR=${x.pct}% TEXT=${x.excerpt.slice(0,430)}`).join('\n')+
    '\nJSON candidate_id and scope only.';
  const started=performance.now();
  const response=await fetchFn(MODEL_URL,{method:'POST',signal:AbortSignal.timeout(90000),
    headers:{'content-type':'application/json'},body:JSON.stringify({model,prompt,stream:false,think:false,
      format:schema,options:{temperature:0,seed:50,num_predict:70}})});
  if(!response.ok)throw Error('OLLAMA_HTTP_'+response.status);
  const body=await response.json();let parsed;
  try{parsed=JSON.parse(body.response)}catch{throw Error('OLLAMA_JSON_INVALID')}
  if(!schema.properties.candidate_id.enum.includes(parsed?.candidate_id) ||
      !['DIRECT','PROXY','UNRELATED','UNCLEAR'].includes(parsed.scope) ||
      Object.keys(parsed).sort().join()!=='candidate_id,scope')throw Error('OLLAMA_SCHEMA_INVALID');
  return {candidate_id:parsed.candidate_id,scope:parsed.scope,
    index:parsed.candidate_id==='NONE'?-1:Number(parsed.candidate_id.slice(1)),
    elapsed_ms:Math.round(performance.now()-started)};
}

export async function inspectR50(p,url,{fetchFn=fetch,chooseFn=chooseForecast}={}){
  const out={url,state:'FAILED',title:null,scope:null,source_audit:'NOT_AUDITED',
    observed_cagr:null,period:null,eligible:false,evidence:null,
    model_candidate_id:null,model_scope:null,error:null,report_ms:0,ollama_ms:0};
  const started=performance.now();let html;
  try{html=await getOfficial(url,p,fetchFn)}catch(err){out.report_ms=Math.round(performance.now()-started);
    out.error=clean(err.message);out.state=/HTTP_(401|403|429)/.test(err.message)?'SOURCE_BLOCKED':'REPORT_FAILED';return out;}
  out.report_ms=Math.round(performance.now()-started);
  out.title=titleOf(html);const body=pagePlainText(html);
  out.scope=classifyScope(url,out.title,body);
  const headlineConflict=headlineForecastConflict(out.title,html);
  if(headlineConflict){out.state='SOURCE_CONFLICT';out.source_audit='SOURCE_CONFLICT';
    out.error=headlineConflict;return out;}
  if(out.scope==='OTHER_OR_UNRELATED_MARKET'){
    out.state='OUT_OF_SCOPE';out.error='UNRELATED_REPORT';return out;
  }
  let audit=null;
  if(p.id==='TBRC'){
    audit=auditForecastSource(html);out.source_audit=audit.source_audit;
    if(audit.source_audit!=='CONSISTENT'){
      out.state=audit.source_audit==='SOURCE_CONFLICT'?'SOURCE_CONFLICT':'SOURCE_AUDIT_INCOMPLETE';
      out.error=audit.source_conflict_reason;return out;
    }
  }
  const candidates=extractCagrCandidates(audit?.forecast_excerpt||body);
  if(!candidates.length){out.state='NO_LITERAL_CAGR';return out;}
  const modelStart=performance.now();
  try{
    const model=await chooseFn(p,out.title,candidates,{fetchFn});
    out.ollama_ms=model.elapsed_ms??Math.round(performance.now()-modelStart);
    out.model_candidate_id=model.candidate_id;out.model_scope=model.scope;
    if(model.index<0||model.scope==='UNRELATED'||model.scope==='UNCLEAR'){
      out.state='MODEL_UNCONFIRMED';return out;
    }
    const chosen=candidates[model.index];
    if(!chosen){out.state='MODEL_UNCONFIRMED';return out;}
    out.evidence=chosen.excerpt.slice(0,320);
    out.period=audit?`${audit.forecast_base_year}-${audit.forecast_end_year}`:candidatePeriod(chosen.excerpt);
    if(audit&&Math.abs(chosen.pct-audit.forecast_narrative_pct)>0.05){
      out.state='FORECAST_SELECTION_MISMATCH';return out;
    }
    if(!out.period){out.state='FORECAST_PERIOD_UNVERIFIED';return out;}
    // Numeric evidence is recorded separately from an approved GICS rate.
    out.observed_cagr=chosen.pct;
    out.state=out.scope==='BROAD_SCOPE_REVIEW'?'SCOPE_REVIEW':'PUBLISHER_PROXY_OBSERVED';
  }catch(err){out.ollama_ms=Math.round(performance.now()-modelStart);
    out.state='OLLAMA_FAILED';out.error=clean(err.message);}
  return out;
}

async function smallCatalog(url,p,fetchFn){
  const started=performance.now();
  const response=await fetchFn(url,{redirect:'manual',signal:AbortSignal.timeout(9000),
    headers:{accept:'text/html','user-agent':'ZGMINI public market research'}});
  if(!response.ok)throw Error('CATALOG_HTTP_'+response.status);
  if(response.url&&new URL(response.url).hostname!==new URL(url).hostname)
    throw Error('CATALOG_REDIRECT_OUTSIDE_PUBLISHER');
  if(Number(response.headers?.get?.('content-length')||0)>1_000_000)throw Error('CATALOG_TOO_LARGE');
  const html=await response.text();if(Buffer.byteLength(html)>1_000_000)throw Error('CATALOG_TOO_LARGE');
  return {html,ms:Math.round(performance.now()-started)};
}

export async function discoverR50(p,seed,{fetchFn=fetch,searchFn=getSearch,
  blockedCatalogs=new Set(),blockedSearchEngines=new Set()}={}){
  const started=performance.now(),attempts=[],liveUrls=[];
  let catalog_status='NOT_RUN',catalog_total=0,catalog_topic=0;
  const catalog=CATALOGS[p.id];
  if(blockedCatalogs.has(p.id))catalog_status='SKIPPED_PREVIOUS_HTTP_403';
  else{
    try{const page=await smallCatalog(catalog,p,fetchFn);const urls=catalogLinks(page.html,catalog,p);
      catalog_total=urls.length;const relevant=urls.filter(u=>topicRank(u)>0);
      catalog_topic=relevant.length;liveUrls.push(...relevant);catalog_status='OK';
      attempts.push({engine:'OFFICIAL_CATALOG',status:'OK',found:relevant.length,
        catalog_total,ms:page.ms});
    }catch(err){catalog_status=clean(err.message);
      if(/CATALOG_HTTP_(403|401|429)/.test(catalog_status))blockedCatalogs.add(p.id);
      attempts.push({engine:'OFFICIAL_CATALOG',status:catalog_status,found:0});}}
  // Two synonyms across independent, public search engines; cache no results.
  for(const keyword of ['telecommunication market','communication services market']){
    const query=`site:${p.host} ${keyword} report`;
    for(const [engine,url] of [
      ['GOOGLE',`https://www.google.com/search?q=${encodeURIComponent(query)}&num=20`],
      ['BING',`https://www.bing.com/search?q=${encodeURIComponent(query)}&count=20`]]){
      if(blockedSearchEngines.has(engine)){
        attempts.push({engine,keyword,status:'SKIPPED_PREVIOUS_HTTP_429',found:0});continue;
      }
      try{const html=await searchFn(url,fetchFn);const urls=searchLinks(html,url,p).filter(u=>topicRank(u)>0);
        liveUrls.push(...urls);attempts.push({engine,keyword,status:'OK',found:urls.length,
          ...searchBodyProfile(html,engine)});
      }catch(err){attempts.push({engine,keyword,status:clean(err.message),found:0});
        if(/HTTP_429/.test(err.message))blockedSearchEngines.add(engine);}
    }
  }
  const candidate_urls=unique([...liveUrls,...(seed?[seed]:[])]
    .filter(u=>officialReportUrl(u,p)&&topicRank(u)>0))
    .sort((a,b)=>topicRank(b)-topicRank(a)||a.localeCompare(b));
  const liveCount=unique(liveUrls).length;
  return {engine:'OFFICIAL_CATALOG_GOOGLE_BING',search_state:liveCount?'LIVE_REPORT_CANDIDATES':
    candidate_urls.length?'SEED_ONLY_SEARCH_INCOMPLETE':'SEARCH_INCOMPLETE',
    catalog_status,catalog_total,catalog_topic,candidate_urls,
    live_discovered_count:liveCount,seed_used:!!seed,attempts,
    search_ms:Math.round(performance.now()-started)};
}

export async function researchR50(p,seed,{fetchFn=fetch,searchFn=getSearch,
  discoverFn=discoverR50,inspectFn=inspectR50,blockedCatalogs,blockedSearchEngines,
  blockedReports}={}){
  const started=performance.now();
  const search=await discoverFn(p,seed,{fetchFn,searchFn,blockedCatalogs,blockedSearchEngines});
  const inspections=[];
  for(const url of search.candidate_urls.slice(0,MAX_REPORTS)){
    if(blockedReports?.has(p.id)){
      inspections.push({url,state:'SOURCE_BLOCKED',error:'SKIPPED_PREVIOUS_HTTP_403',
        observed_cagr:null,eligible:false,report_ms:0,ollama_ms:0});break;
    }
    const result=await inspectFn(p,url,{fetchFn});inspections.push(result);
    if(result.state==='SOURCE_BLOCKED'&&/HTTP_(401|403|429)/.test(result.error||'')){
      blockedReports?.add(p.id);break;
    }
    if(result.observed_cagr!==null)break;
  }
  const selected=inspections.find(x=>x.observed_cagr!==null)||null;
  return {publisher:p.id,state:selected?selected.state:
    inspections.some(x=>x.state==='SOURCE_BLOCKED')?'SOURCE_PARTIAL_BLOCKED':'NO_FORECAST_OBSERVED',
    search,inspections,selected,uninspected:Math.max(0,search.candidate_urls.length-inspections.length),
    total_ms:Math.round(performance.now()-started),search_ms:search.search_ms,
    report_ms:inspections.reduce((n,x)=>n+(x.report_ms||0),0),
    ollama_ms:inspections.reduce((n,x)=>n+(x.ollama_ms||0),0)};
}

export function summarizeR50(rounds){
  const measured=rounds.filter(x=>!x.warmup),times=measured.map(r=>r.total_ms).sort((a,b)=>a-b);
  if(times.length!==3)return {gate:'NOT_MEASURED',reason:'NEED_1_WARMUP_3_MEASURED'};
  const median=times[1];const deviation=median?
    Math.max(Math.abs(times[0]-median),Math.abs(times[2]-median))/median:null;
  const bri_uncontacted=rounds.every(x=>x.publishers.find(p=>p.publisher==='BRI')?.state==='SOURCE_BLOCKED_EXCLUDED');
  const three_attempted=measured.every(x=>ACTIVE_PUBLISHERS.every(id=>
    x.publishers.some(p=>p.publisher===id&&p.search.engine!=='NO_NETWORK_REQUEST')));
  const consistency=ACTIVE_PUBLISHERS.map(publisher=>{
    const rows=measured.map(r=>r.publishers.find(p=>p.publisher===publisher));
    const signatures=rows.map(x=>[x.state,x.selected?.observed_cagr??'NULL',
      x.selected?.period??'NULL',x.selected?.scope??'NULL',x.selected?.url??'NULL'].join('|'));
    return {publisher,stable:new Set(signatures).size===1,states:rows.map(x=>x.state),
      observations:rows.map(x=>x.selected?.observed_cagr??null)};
  });
  const observations=ACTIVE_PUBLISHERS.map(publisher=>{
    const rows=measured.map(r=>r.publishers.find(p=>p.publisher===publisher));
    return {publisher,values:rows.map(x=>x.selected?.observed_cagr??null),
      scopes:rows.map(x=>x.selected?.scope??null),periods:rows.map(x=>x.selected?.period??null)};
  });
  const speed_stable=deviation!==null&&deviation<=0.25;
  const results_stable=consistency.every(x=>x.stable);
  const gate=!bri_uncontacted?'EXCLUSION_POLICY_VIOLATION':
    !three_attempted?'INCOMPLETE_ACTIVE_ATTEMPTS':
    !results_stable?'UNSTABLE_OBSERVATIONS':
    !speed_stable?'UNSTABLE_DIAGNOSTIC_SPEED':'PARTIAL_RESEARCH_REVIEW_REQUIRED';
  return {gate,median_ms:median,min_ms:times[0],max_ms:times[2],
    deviation_ratio:deviation===null?null:Number(deviation.toFixed(3)),
    speed_stable,results_stable,bri_uncontacted,three_attempted,
    active_publishers:ACTIVE_PUBLISHERS,excluded_publishers:['BRI'],
    consistency,observations,previous_topic01:'PARTIAL_USER_APPROVED_NULL',
    warning:'Telecommunications-only CAGR is not GICS Communication Services CAGR.'};
}

export async function runR50({fetchFn=fetch,searchFn=getSearch,researchFn=researchR50,
  outputPrefix=join(BASE,'R50_TOPIC02_COMMUNICATION_RESULT')}={}){
  const txt=outputPrefix+'.txt',json=outputPrefix+'.json',history=outputPrefix+'_HISTORY.ndjson';
  await writeFile(txt,'REPORT=R50_STAGE04_TOPIC02_COMMUNICATION\r\n'+
    'PRIOR_TOPIC01=PARTIAL_USER_APPROVED_NULL\r\n'+
    'ACTIVE_MEDIA=TBRC,SkyQuest,Precedence\r\nEXCLUDED_MEDIA=BRI_HTTP_403\r\n'+
    'PROJECT_WRITES=NONE\r\nSTATUS=RUNNING\r\n');
  const log=line=>appendFile(txt,line+'\r\n');
  try{
    const matrix=await readFile(MATRIX,'utf8'),topic=parseUrlSeeds(matrix).find(t=>t.name===TARGET.name);
    if(!topic)throw Error('TOPIC02_NOT_FOUND');
    const blockedCatalogs=new Set(),blockedSearchEngines=new Set(),blockedReports=new Set(),rounds=[];
    for(let i=0;i<4;i++){
      const started=performance.now(),publishers=[];
      for(const p of PUBLISHERS){
        const result=p.id==='BRI'?excludedBri():await researchFn(p,topic.seeds[p.id],{
          fetchFn,searchFn,blockedCatalogs,blockedSearchEngines,blockedReports});
        publishers.push(result);
        await log(`ROUND=${i+1} MEDIA=${p.id} STATE=${result.state} SEARCH=${result.search.search_state} CATALOG=${clean(result.search.catalog_status)} LIVE_LINKS=${result.search.live_discovered_count??0} CANDIDATES=${result.search.candidate_urls.length} CHECKED=${result.inspections.length} OBSERVED_CAGR=${result.selected?.observed_cagr??'NULL'} OBSERVED_PERIOD=${result.selected?.period??'NULL'} SCOPE=${result.selected?.scope??'NULL'} SECTOR_CAGR=NULL SEARCH_MS=${result.search_ms} REPORT_MS=${result.report_ms} OLLAMA_MS=${result.ollama_ms} TOTAL_MS=${result.total_ms}`);
        for(const x of result.inspections)await log(`ROUND=${i+1} MEDIA=${p.id} REPORT=${clean(x.url)} STATE=${x.state} SCOPE=${x.scope??'NULL'} OBSERVED=${x.observed_cagr??'NULL'} PERIOD=${x.period??'NULL'} AUDIT=${x.source_audit??'NULL'} MODEL_ID=${x.model_candidate_id??'NULL'} MODEL_SCOPE=${x.model_scope??'NULL'} EVIDENCE=${clean(x.evidence)} ERROR=${clean(x.error)}`);
        for(const x of result.search.attempts)await log(`ROUND=${i+1} MEDIA=${p.id} SEARCH_PATH=${x.engine} QUERY=${clean(x.keyword)} STATUS=${clean(x.status)} FOUND=${x.found??0} JS=${x.gate??'NA'}`);
      }
      const round={index:i+1,warmup:i===0,at:new Date().toISOString(),
        total_ms:Math.round(performance.now()-started),publishers};rounds.push(round);
      await writeFile(json,JSON.stringify({status:'RUNNING',rounds},null,2));
      await log(`ROUND_FINISHED=${i+1} WARMUP=${round.warmup} TOTAL_MS=${round.total_ms}`);
    }
    const summary=summarizeR50(rounds);
    const rows=rounds.at(-1).publishers.map(x=>({publisher:x.publisher,
      observed_cagr:x.selected?.observed_cagr??null,period:x.selected?.period??null,
      market_scope:x.selected?.scope??null,sector_eligible:false,
      reason:x.publisher==='BRI'?'SOURCE_BLOCKED':
        x.selected?'PUBLISHER_MARKET_NOT_GICS_SCOPE_APPROVED':'NO_VERIFIED_REPORT'}));
    const mean=comparableMean(rows.map(x=>({rate:x.observed_cagr,period:x.period,
      market_basis:x.market_scope,eligible:x.sector_eligible})));
    await writeFile(json,JSON.stringify({status:'FINISHED_RESEARCH_ONLY',topic:TARGET,
      prior_topic01_status:'PARTIAL_USER_APPROVED_NULL',summary,rows,mean,rounds},null,2));
    // One bounded record per independent PC invocation. Repeated CMD executions
    // preserve the observation history without copying raw webpages or inventing
    // missing values. No scheduler, DB or live dashboard changes.
    await appendFile(history,JSON.stringify({at:new Date().toISOString(),topic:TARGET.name,
      warmup_count:1,measured_count:3,median_ms:summary.median_ms,
      speed_stable:summary.speed_stable,results_stable:summary.results_stable,
      gate:summary.gate,sector_cagr:mean.mean,observations:rows.map(x=>({
        publisher:x.publisher,cagr:x.observed_cagr,period:x.period,
        scope:x.market_scope,sector_eligible:x.sector_eligible}))})+'\n');
    await log(`SUMMARY_GATE=${summary.gate} SPEED_STABLE=${summary.speed_stable} RESULTS_STABLE=${summary.results_stable}`);
    await log(`MEDIAN_MS=${summary.median_ms} DEVIATION=${summary.deviation_ratio} BRI_NETWORK_REQUESTS=0`);
    await log(`PUBLISHER_OBSERVED_CAGR=${rows.map(x=>`${x.publisher}:${x.observed_cagr??'NULL'}`).join(',')}`);
    await log(`GICS_COMMUNICATION_CAGR=${mean.mean??'NULL'} GICS_MEAN_STATUS=${mean.status}`);
    await log('APPEND_HISTORY=R50_TOPIC02_COMMUNICATION_RESULT_HISTORY.ndjson');
    await log('STATUS=FINISHED_RESEARCH_ONLY');
    await log('SEND_TXT=R50_TOPIC02_COMMUNICATION_RESULT.txt');
    return {summary,rows,mean,rounds};
  }catch(err){await log('STATUS=FAILED');await log('ERROR='+clean(err.message));throw err;}
}

if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1])
  runR50().catch(err=>{console.error('R50_FATAL='+clean(err.message));process.exitCode=1;});
