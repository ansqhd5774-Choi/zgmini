/**
 * Stage04 R56: topics 05, 06 and 07 run concurrently (one warmup + three
 * measured rounds), retaining independent first-party publisher evidence.
 *
 * This is research only. No scores, provider-side writes, DB, deploy or
 * scheduled jobs. BRI is expressly excluded after the user's HTTP403 decision.
 * Report CAGR values are ALWAYS read fresh from publishers at PC run time.
 */
import {writeFile,appendFile} from 'node:fs/promises';
import {basename,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {PUBLISHERS,pagePlainText,extractCagrCandidates} from './stage04-four-publisher-r37-readonly.mjs';
import {officialReportUrl,getOfficial,titleOf,candidateChoiceSchema} from './stage04-topic01-r45-readonly.mjs';
import {excludedBri} from './stage04-topic01-r49-three-media.mjs';
import {candidatePeriod,headlineForecastConflict} from './stage04-topic02-r50-three-media.mjs';
import {auditForecastSource} from './forecast-source-audit-r29-readonly.mjs';
import {serialModelQueue} from './stage04-topic03-04-r53-parallel.mjs';

const BASE=join(dirname(fileURLToPath(import.meta.url)),'..');
const MODEL_URL='http://127.0.0.1:11434/api/generate';
const clean=s=>String(s??'NULL').replace(/[\r\n=|]/g,' ').slice(0,340);
const fixed=(n)=>n==null?'NULL':String(n);

export const TOPICS_R56=Object.freeze([
  Object.freeze({index:5,name:'금융',english:'Financials',
    comparison:'FINANCIAL_SERVICES_VS_RETAIL_BANKING',
    urls:Object.freeze({
      TBRC:'https://www.thebusinessresearchcompany.com/report/financial-services-global-market-report',
      SkyQuest:'https://www.skyquestt.com/report/retail-banking-market',
      Precedence:'https://www.precedenceresearch.com/retail-banking-market'})}),
  Object.freeze({index:6,name:'유틸리티',english:'Utilities',
    comparison:'UTILITIES_VS_ELECTRICITY_TRANSMISSION_DISTRIBUTION',
    urls:Object.freeze({
      TBRC:'https://www.thebusinessresearchcompany.com/report/utilities-global-market-report',
      SkyQuest:'https://www.skyquestt.com/report/electricity-transmission-and-distribution-market',
      Precedence:'https://www.precedenceresearch.com/power-transmission-and-distribution-market'})}),
  Object.freeze({index:7,name:'헬스케어',english:'Health Care',
    comparison:'HEALTHCARE_SERVICES_VS_HOSPITAL_SERVICES',
    urls:Object.freeze({
      TBRC:'https://www.thebusinessresearchcompany.com/report/healthcare-service-global-market-report',
      SkyQuest:'https://www.skyquestt.com/report/healthcare-services-market',
      Precedence:'https://www.precedenceresearch.com/hospital-services-market'})}),
]);

const MARKET_SCOPES=Object.freeze({
  '5_TBRC':'BROAD_FINANCIAL_SERVICES_REVIEW',
  '5_SkyQuest':'RETAIL_BANKING_SUBMARKET_PROXY',
  '5_Precedence':'RETAIL_BANKING_SUBMARKET_PROXY',
  '6_TBRC':'BROAD_UTILITIES_REVIEW',
  '6_SkyQuest':'ELECTRICITY_TRANSMISSION_DISTRIBUTION_PROXY',
  '6_Precedence':'ELECTRICITY_TRANSMISSION_DISTRIBUTION_PROXY',
  '7_TBRC':'HEALTHCARE_SERVICES_SUBMARKET_PROXY',
  '7_SkyQuest':'HEALTHCARE_SERVICES_SUBMARKET_PROXY',
  '7_Precedence':'HOSPITAL_SERVICES_SUBMARKET_PROXY',
});

export function verifiedR56Anchor(topic,p){
  const url=topic.urls?.[p.id];
  if(!url)return null;
  if(!officialReportUrl(url,p) || !MARKET_SCOPES[topic.index+'_'+p.id])
    throw Error('R56_OFFICIAL_URL_OR_SCOPE_INVALID_'+topic.index+'_'+p.id);
  return url;
}

export function scopeR56(topic,p,url){
  if(!verifiedR56Anchor(topic,p)||verifiedR56Anchor(topic,p)!==url)
    return 'UNRELATED_MARKET';
  return MARKET_SCOPES[topic.index+'_'+p.id];
}

export async function chooseR56(topic,p,title,candidates,{fetchFn=fetch}={}){
  const schema=candidateChoiceSchema(candidates.length);
  const prompt='Audit ONLY provided literal publisher report evidence. Do not browse or invent values.\n'+
    'TOPIC='+topic.index+' GICS '+topic.english+'; PUBLISHER='+p.id+'; REPORT='+title+'\n'+
    'Select one current FUTURE worldwide report-market CAGR. NEVER historical, regional, '+
    'individual segment, fastest-growing subgroup or alternative CAGR.\n'+
    'candidate_id must be exact C0/C1/etc or NONE, never a rate itself.\n'+
    'DIRECT only when the report matches the entire GICS sector, not a retail banking, '+
    'electricity transmission, healthcare service or hospital service subset. '+
    'Use PROXY for such subsets.\n'+
    candidates.map((x,i)=>'C'+i+': '+x.pct+'% '+x.excerpt.slice(0,390)).join('\n')+
    '\nOutput JSON object keys candidate_id and scope only.';
  const started=performance.now();
  const r=await fetchFn(MODEL_URL,{method:'POST',signal:AbortSignal.timeout(90000),
    headers:{'content-type':'application/json'},body:JSON.stringify({
      model:'gemma3:4b',prompt,stream:false,think:false,format:schema,
      options:{temperature:0,seed:56,num_predict:70}})});
  if(!r.ok)throw Error('OLLAMA_HTTP_'+r.status);
  const data=await r.json();let output;
  try{output=JSON.parse(data.response);}catch{throw Error('OLLAMA_JSON_INVALID');}
  if(!schema.properties.candidate_id.enum.includes(output?.candidate_id)||
    !['DIRECT','PROXY','UNCLEAR','UNRELATED'].includes(output.scope)||
    Object.keys(output).sort().join()!=='candidate_id,scope')
    throw Error('OLLAMA_SCHEMA_INVALID');
  return {candidate_id:output.candidate_id,scope:output.scope,
    index:output.candidate_id==='NONE'?-1:Number(output.candidate_id.slice(1)),
    elapsed_ms:Math.round(performance.now()-started)};
}

/** Market-wide labels are review candidates only: no auto GICS CAGR. */
export async function inspectR56(topic,p,url,{fetchFn=fetch,
  modelQueue=serialModelQueue(),chooseFn=chooseR56}={}){
  const out={url,state:'REPORT_FAILED',title:null,market_scope:scopeR56(topic,p,url),
    source_audit:'NOT_AUDITED',observed_cagr:null,period:null,sector_eligible:false,
    model_scope:null,model_candidate_id:null,scope_warning:null,
    source_evidence:null,error:null,excerpt:null,report_ms:0,ollama_ms:0};
  if(out.market_scope==='UNRELATED_MARKET'){out.state='OUT_OF_SCOPE';return out;}
  let html;const reportStart=performance.now();
  try{html=await getOfficial(url,p,fetchFn);}catch(e){
    out.report_ms=Math.round(performance.now()-reportStart);
    out.error=clean(e.message);
    out.state=/HTTP_(401|403|429)/.test(out.error)?'SOURCE_BLOCKED':'REPORT_FAILED';
    return out;
  }
  out.report_ms=Math.round(performance.now()-reportStart);
  out.title=titleOf(html);
  const body=pagePlainText(html);
  const headlineConflict=headlineForecastConflict(out.title,html);
  if(headlineConflict){out.source_audit='SOURCE_CONFLICT';out.state='SOURCE_CONFLICT';
    out.error=headlineConflict;return out;}
  let audit=null;
  if(p.id==='TBRC'){
    audit=auditForecastSource(html,{resolveHistoricTableMislabel:true});
    out.source_audit=audit.source_audit;
    out.source_evidence={forecast_narrative_pct:audit.forecast_narrative_pct,
      forecast_table_pct:audit.forecast_table_pct,forecast_math_pct:audit.forecast_math_pct,
      historic_narrative_pct:audit.historic_narrative_pct,
      historic_math_pct:audit.historic_math_pct,
      source_conflict_reason:audit.source_conflict_reason};
    if(audit.source_audit==='SOURCE_CONFLICT'){
      out.state='SOURCE_CONFLICT';out.error=audit.source_conflict_reason;return out;}
    if(!['CONSISTENT','RESOLVED_HISTORIC_RATE_MISLABEL'].includes(audit.source_audit)){
      out.state='SOURCE_AUDIT_INCOMPLETE';
      out.error=audit.source_conflict_reason||'FORECAST_SECTION_NOT_VERIFIED';
      return out;
    }
  }
  const candidates=extractCagrCandidates(audit?.forecast_excerpt||body);
  if(!candidates.length){out.state='NO_LITERAL_CAGR';return out;}
  const modelStart=performance.now();
  try{
    const model=await modelQueue(()=>chooseFn(topic,p,out.title,candidates,{fetchFn}));
    out.ollama_ms=model.elapsed_ms??Math.round(performance.now()-modelStart);
    out.model_scope=model.scope;out.model_candidate_id=model.candidate_id;
    if(model.index<0||['UNCLEAR','UNRELATED'].includes(model.scope)){
      out.state='MODEL_UNCONFIRMED';return out;}
    const chosen=candidates[model.index];
    if(!chosen){out.state='MODEL_UNCONFIRMED';return out;}
    out.excerpt=chosen.excerpt.slice(0,320);
    out.period=audit?`${audit.forecast_base_year}-${audit.forecast_end_year}`:
      candidatePeriod(chosen.excerpt,body,out.title);
    if(!out.period){out.state='FORECAST_PERIOD_UNVERIFIED';return out;}
    if(audit&&Math.abs(chosen.pct-audit.forecast_narrative_pct)>0.05){
      out.state='FORECAST_SELECTION_MISMATCH';return out;}
    if(model.scope==='DIRECT')out.scope_warning='DIRECT_MODEL_NOT_GICS_APPROVED';
    out.observed_cagr=chosen.pct;
    out.state=out.market_scope.startsWith('BROAD_')?
      'BROAD_SCOPE_REVIEW_REQUIRED':'PUBLISHER_PROXY_OBSERVED';
  }catch(e){out.state='OLLAMA_FAILED';out.error=clean(e.message);
    out.ollama_ms=Math.round(performance.now()-modelStart);}
  return out;
}

async function topicResearchR56(topic,{fetchFn,inspectFn,modelQueue,blocked}){
  const started=performance.now(),startedEpoch=Date.now(),publishers=[];
  for(const p of PUBLISHERS){
    if(p.id==='BRI'){
      const ex=excludedBri();
      publishers.push({...ex,search:{search_state:'USER_EXCLUDED',candidate_urls:[],attempts:[],
        verified_anchor_count:0},inspections:[],selected:null,report_ms:0,ollama_ms:0});
      continue;
    }
    const url=verifiedR56Anchor(topic,p),key=topic.index+'_'+p.id;
    const start=performance.now(),isBlocked=blocked.has(key);
    const inspected=isBlocked?{url,state:'SOURCE_BLOCKED',observed_cagr:null,
      market_scope:scopeR56(topic,p,url),period:null,source_audit:'NOT_REPEATED',
      error:'SKIPPED_PREVIOUS_SOURCE_BLOCK',report_ms:0,ollama_ms:0}:
      await inspectFn(topic,p,url,{fetchFn,modelQueue});
    if(inspected.state==='SOURCE_BLOCKED')blocked.add(key);
    const selected=inspected.observed_cagr!==null?inspected:null;
    publishers.push({publisher:p.id,state:inspected.state,
      search:{search_state:'VERIFIED_STATIC_ANCHOR_NOT_LIVE_SEARCH',
        candidate_urls:[url],verified_anchor_count:1,attempts:[],
        live_discovered_count:0},
      inspections:[inspected],selected,
      report_ms:inspected.report_ms||0,ollama_ms:inspected.ollama_ms||0,
      total_ms:Math.round(performance.now()-start)});
  }
  return {topic_index:topic.index,topic:topic.name,comparison:topic.comparison,
    started_epoch_ms:startedEpoch,ended_epoch_ms:Date.now(),
    total_ms:Math.round(performance.now()-started),publishers,sector_cagr:null};
}

const median3=values=>[...values].sort((a,b)=>a-b)[1];
export function summarizeR56(rounds){
  const measured=rounds.filter(r=>!r.warmup);
  const topics=TOPICS_R56.map(t=>{
    const rows=measured.map(r=>r.topics.find(x=>x.topic_index===t.index));
    const times=rows.map(x=>x.total_ms),median=median3(times);
    const deviation_ratio=median?Number((Math.max(...times.map(x=>Math.abs(x-median)))/median).toFixed(3)):null;
    const publishers=['TBRC','SkyQuest','Precedence'].map(id=>{
      const samples=rows.map(x=>x.publishers.find(p=>p.publisher===id));
      const signature=p=>[p.state,p.selected?.observed_cagr??'NULL',
        p.selected?.period??'NULL',p.selected?.market_scope??'NULL',
        p.inspections[0]?.source_audit??'NULL'].join('|');
      return {publisher:id,stable:new Set(samples.map(signature)).size===1,
        states:samples.map(s=>s.state),observations:samples.map(s=>s.selected?.observed_cagr??null),
        periods:samples.map(s=>s.selected?.period??null),
        market_scopes:samples.map(s=>s.inspections[0]?.market_scope??null)};
    });
    const results_stable=publishers.every(p=>p.stable);
    const speed_stable=deviation_ratio!==null&&deviation_ratio<=.25;
    const latest=rows.at(-1);
    const observed_publishers=latest.publishers
      .filter(p=>p.publisher!=='BRI'&&(p.selected?.observed_cagr??null)!==null).length;
    return {index:t.index,name:t.name,comparison:t.comparison,
      median_ms:median,deviation_ratio,speed_stable,results_stable,
      observed_publishers,publishers,
      gate:!results_stable?'UNSTABLE_RESULTS':
        !speed_stable?'SPEED_VARIATION_REVIEW':'PUBLISHER_OBSERVATIONS_REPEATABLE',
      sector_cagr:null};
  });
  const overlaps=rounds.map(r=>Math.max(0,
    Math.min(...r.topics.map(t=>t.ended_epoch_ms))-
    Math.max(...r.topics.map(t=>t.started_epoch_ms))));
  const bri_uncontacted=rounds.every(r=>r.topics.every(t=>
    t.publishers.find(p=>p.publisher==='BRI')?.state==='SOURCE_BLOCKED_EXCLUDED'));
  return {topics,parallel_overlap_ms:overlaps,
    parallel_observed:overlaps.some(x=>x>0),bri_uncontacted,
    gate:!bri_uncontacted?'BRI_POLICY_VIOLATION':
      !overlaps.some(x=>x>0)?'NO_PARALLEL_OVERLAP':
      topics.every(t=>t.results_stable&&t.observed_publishers===3)?
        'TRIPLE_PARALLEL_REPEATABLE_PROXIES_REVIEW':
      topics.every(t=>t.results_stable&&t.observed_publishers>0)?
        'TRIPLE_PARALLEL_PARTIAL_COVERAGE_REVIEW':
        'TRIPLE_PARALLEL_DIAGNOSTIC_REVIEW'};
}

export async function runR56({fetchFn=fetch,inspectFn=inspectR56,
  outputPrefix=join(BASE,'R56_TOPICS05_06_07_TRIPLE_RESULT')}={}){
  const txt=outputPrefix+'.txt',json=outputPrefix+'.json',history=outputPrefix+'_HISTORY.ndjson';
  await writeFile(txt,'REPORT=R56_STAGE04_TOPICS05_06_07_TRIPLE_PARALLEL\r\n'+
    'TOPICS=05_FINANCIALS,06_UTILITIES,07_HEALTH_CARE\r\n'+
    'PARALLEL_TOPICS=THREE\r\nOLLAMA_SHARED_SERIAL_QUEUE=YES\r\n'+
    'LIVE_FIRST_PARTY_FETCH=EVERY_ROUND\r\n'+
    'BRI_NETWORK_REQUESTS=0\r\nSEARCH_ENGINE_REQUESTS=0\r\n'+
    'PROJECT_WRITES=NONE\r\nSECTOR_CAGR=NULL\r\nSTATUS=RUNNING\r\n');
  const log=s=>appendFile(txt,s+'\r\n');
  try{
    const rounds=[],modelQueue=serialModelQueue(),blocked=new Set();
    for(let index=0;index<4;index++){
      const started=performance.now();
      const topics=await Promise.all(TOPICS_R56.map(topic=>
        topicResearchR56(topic,{fetchFn,inspectFn,modelQueue,blocked})));
      const round={index:index+1,warmup:index===0,
        total_ms:Math.round(performance.now()-started),at:new Date().toISOString(),topics};
      rounds.push(round);
      const overlap=Math.max(0,Math.min(...topics.map(x=>x.ended_epoch_ms))-
        Math.max(...topics.map(x=>x.started_epoch_ms)));
      await log('ROUND='+round.index+' WARMUP='+round.warmup+
        ' TOTAL_MS='+round.total_ms+' TRIPLE_OVERLAP_MS='+overlap);
      for(const t of topics){
        await log('TOPIC='+t.topic_index+' NAME='+t.topic+' TOTAL_MS='+t.total_ms+
          ' COMPARISON='+t.comparison+' SECTOR_CAGR=NULL');
        for(const p of t.publishers){
          if(p.publisher==='BRI'){
            await log('ROUND='+round.index+' TOPIC='+t.topic_index+
              ' MEDIA=BRI STATE=SOURCE_BLOCKED_EXCLUDED');continue;
          }
          const x=p.inspections[0];
          await log('ROUND='+round.index+' TOPIC='+t.topic_index+' MEDIA='+p.publisher+
            ' STATE='+p.state+' OBSERVED_CAGR='+fixed(p.selected?.observed_cagr)+
            ' PERIOD='+fixed(p.selected?.period)+' SCOPE='+fixed(x.market_scope)+
            ' AUDIT='+fixed(x.source_audit)+' REPORT_MS='+fixed(x.report_ms)+
            ' OLLAMA_MS='+fixed(x.ollama_ms)+' PUBLISHER_TOTAL_MS='+fixed(p.total_ms)+
            ' ERROR='+clean(x.error));
          await log('SOURCE='+x.url+' TOPIC='+t.topic_index+' MEDIA='+p.publisher+
            ' MODEL_SCOPE='+fixed(x.model_scope)+' WARNING='+fixed(x.scope_warning));
          if(x.source_evidence)await log('EVIDENCE='+JSON.stringify(x.source_evidence));
        }
      }
      await writeFile(json,JSON.stringify({status:'RUNNING',rounds},null,2));
    }
    const summary=summarizeR56(rounds);
    const rows=rounds.at(-1).topics.map(t=>({topic:t.topic,index:t.topic_index,
      comparison:t.comparison,sector_cagr:null,publishers:t.publishers
        .filter(p=>p.publisher!=='BRI').map(p=>({publisher:p.publisher,
          url:p.inspections[0]?.url??null,observed_cagr:p.selected?.observed_cagr??null,
          period:p.selected?.period??null,market_scope:p.inspections[0]?.market_scope??null,
          sector_eligible:false}))}));
    const out={status:'FINISHED_RESEARCH_ONLY',report:'R56',
      concurrent_topics:TOPICS_R56,summary,rows,rounds};
    await writeFile(json,JSON.stringify(out,null,2));
    await appendFile(history,JSON.stringify({at:new Date().toISOString(),
      report:'R56',gate:summary.gate,
      parallel_overlap_ms:summary.parallel_overlap_ms,
      summary:summary.topics,measured_rounds:rounds.filter(r=>!r.warmup)
        .map(r=>({index:r.index,total_ms:r.total_ms,
          topics:r.topics.map(t=>({index:t.topic_index,total_ms:t.total_ms,
            publishers:t.publishers.filter(p=>p.publisher!=='BRI')
              .map(p=>({id:p.publisher,state:p.state,
                observed:p.selected?.observed_cagr??null,
                period:p.selected?.period??null}))}))}))})+'\n');
    await log('SUMMARY_GATE='+summary.gate+' PARALLEL_OBSERVED='+summary.parallel_observed+
      ' BRI_NETWORK_REQUESTS=0 SEARCH_ENGINE_REQUESTS=0');
    for(const t of summary.topics)await log('TOPIC_SUMMARY='+t.index+' NAME='+t.name+
      ' MEDIAN_MS='+t.median_ms+' DEVIATION='+t.deviation_ratio+
      ' SPEED_STABLE='+t.speed_stable+' RESULTS_STABLE='+t.results_stable+
      ' OBSERVED_PUBLISHERS='+t.observed_publishers+'/3'+
      ' SECTOR_CAGR=NULL GATE='+t.gate);
    await log('STATUS=FINISHED_RESEARCH_ONLY');
    await log('SEND_TXT='+basename(txt));
    return out;
  }catch(e){await log('STATUS=FAILED');await log('ERROR='+clean(e.message));throw e;}
}

if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1])
  runR56().catch(e=>{console.error('R56_FATAL='+clean(e.message));process.exitCode=1;});
