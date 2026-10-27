/**
 * R58: the one remaining TBRC Utilities issue is model TOPIC classification,
 * not lack of literal CAGR evidence. Keep these two channels independent.
 * Fresh public GETs only; no DB, site, scheduler, BRI, search or other sources.
 */
import {writeFile,appendFile} from 'node:fs/promises';
import {basename,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {PUBLISHERS,pagePlainText,extractCagrCandidates} from './stage04-four-publisher-r37-readonly.mjs';
import {getOfficial,titleOf,candidateChoiceSchema} from './stage04-topic01-r45-readonly.mjs';
import {headlineForecastConflict} from './stage04-topic02-r50-three-media.mjs';
import {serialModelQueue} from './stage04-topic03-04-r53-parallel.mjs';
import {TOPICS_R56,verifiedR56Anchor,scopeR56} from './stage04-topic05-07-r56-triple.mjs';
import {auditUtilitiesMetadataR57} from './forecast-utilities-metadata-r57-readonly.mjs';

const BASE=join(dirname(fileURLToPath(import.meta.url)),'..');
const TOPIC=TOPICS_R56.find(x=>x.index===6);
const PUBLISHER=PUBLISHERS.find(x=>x.id==='TBRC');
const URL=verifiedR56Anchor(TOPIC,PUBLISHER);
const clean=x=>String(x??'NULL').replace(/[\r\n=|]/g,' ').slice(0,300);
const auditPass=new Set(['CONSISTENT','RESOLVED_HISTORIC_RATE_MISLABEL',
  'NARRATIVE_VERIFIED_METADATA_CONFLICT']);

/**
 * v2 instructions explicitly separate TOPICAL relation from GICS-wide match.
 * An unrelated output remains fully visible; it never converts to a pass.
 */
export async function chooseR58(topic,p,title,candidates,{fetchFn=fetch}={}){
  const schema=candidateChoiceSchema(candidates.length);
  const prompt='Classify ONE publisher report using ONLY the literal excerpts. No web browsing, '
    +'cached rates, invented numbers or investments.\n'
    +`TOPIC=${topic.english}, REPORT_TITLE=${title}, PUBLISHER=${p.id}.\n`
    +'FIRST choose candidate_id for FUTURE worldwide CAGR (C0/C1/etc or NONE). '
    +'Never choose a historic, regional or subsector CAGR instead of the report forecast.\n'
    +'SECOND determine scope as follows:\n'
    +'DIRECT: exact report market demonstrably equals the entire GICS Utilities sector.\n'
    +'PROXY: report is ABOUT utilities, electric/gas/water utilities or related submarkets, '
    +'but equivalence to whole GICS is unknown or narrower/broader.\n'
    +'UNCLEAR: insufficient publisher evidence to judge topical relation.\n'
    +'UNRELATED: report title/contents concern a DIFFERENT industry, not utilities. '
    +'Do NOT use UNRELATED merely because a related report is not identical to GICS.\n'
    +'A publisher report with utilities in its actual report title is topically related '
    +'even when it is not GICS-equivalent: prefer PROXY to UNRELATED in that case.\n'
    +candidates.map((x,i)=>`C${i}: ${x.pct}% ${x.excerpt.slice(0,390)}`).join('\n')
    +'\nReturn exact JSON keys candidate_id and scope only.';
  const start=performance.now();
  const res=await fetchFn('http://127.0.0.1:11434/api/generate',{
    method:'POST',signal:AbortSignal.timeout(90000),
    headers:{'content-type':'application/json'},
    body:JSON.stringify({model:'gemma3:4b',prompt,stream:false,think:false,
      format:schema,options:{temperature:0,seed:58,num_predict:70}})});
  if(!res.ok)throw Error('OLLAMA_HTTP_'+res.status);
  let answer;
  try{answer=JSON.parse((await res.json()).response);}catch{throw Error('OLLAMA_JSON_INVALID');}
  if(!schema.properties.candidate_id.enum.includes(answer?.candidate_id)||
    !['DIRECT','PROXY','UNCLEAR','UNRELATED'].includes(answer.scope)||
    Object.keys(answer).sort().join()!=='candidate_id,scope')
    throw Error('OLLAMA_SCHEMA_INVALID');
  return {candidate_id:answer.candidate_id,scope:answer.scope,
    index:answer.candidate_id==='NONE'?-1:Number(answer.candidate_id.slice(1)),
    elapsed_ms:Math.round(performance.now()-start)};
}

export async function inspectR58({fetchFn=fetch,auditFn=auditUtilitiesMetadataR57,
  chooseFn=chooseR58,modelQueue=serialModelQueue()}={}){
  const out={url:URL,market_scope:scopeR56(TOPIC,PUBLISHER,URL),
    state:'REPORT_FAILED',source_audit:'NOT_AUDITED',
    source_observed_cagr:null,source_period:null,
    model_selected_cagr:null,model_candidate_id:null,model_scope:null,
    sector_cagr:null,sector_eligible:false,
    metadata_conflict_preserved:null,source_evidence:null,
    report_ms:0,ollama_ms:0,error:null};
  let html;const fetchStart=performance.now();
  try{html=await getOfficial(URL,PUBLISHER,fetchFn);}catch(e){
    out.report_ms=Math.round(performance.now()-fetchStart);
    out.error=clean(e.message);
    out.state=/HTTP_(401|403|429)/.test(out.error)?'SOURCE_BLOCKED':'REPORT_FAILED';
    return out;
  }
  out.report_ms=Math.round(performance.now()-fetchStart);
  const conflict=headlineForecastConflict(titleOf(html),html);
  if(conflict){out.state='SOURCE_CONFLICT';out.error=conflict;return out;}
  const a=auditFn(html);
  out.source_audit=a.source_audit;
  out.metadata_conflict_preserved=a.metadata_conflict_preserved;
  out.source_evidence={narrative_pct:a.forecast_narrative_pct,
    table_pct:a.forecast_table_pct,forecast_math_pct:a.forecast_math_pct,
    historic_narrative_pct:a.historic_narrative_pct,historic_math_pct:a.historic_math_pct,
    forecast_base_year:a.forecast_base_year,forecast_end_year:a.forecast_end_year,
    forecast_base_value:a.forecast_base_value,forecast_end_value:a.forecast_end_value,
    metadata_reported_end_year:a.metadata_reported_end_year??null,
    source_conflict_reason:a.source_conflict_reason};
  if(!auditPass.has(a.source_audit)){
    out.state='SOURCE_AUDIT_INCOMPLETE';out.error=a.source_conflict_reason;return out;}
  // Literal publication and arithmetic evidence exists, regardless of whether
  // an independent model agrees with the semantic GICS scope.
  out.source_observed_cagr=a.forecast_narrative_pct;
  out.source_period=`${a.forecast_base_year}-${a.forecast_end_year}`;
  const candidates=extractCagrCandidates(a.forecast_excerpt||pagePlainText(html));
  if(!candidates.length){out.state='SOURCE_VERIFIED_MODEL_CANDIDATES_MISSING';return out;}
  const modelStart=performance.now();
  try{
    const model=await modelQueue(()=>chooseFn(TOPIC,PUBLISHER,titleOf(html),candidates,{fetchFn}));
    out.ollama_ms=model.elapsed_ms??Math.round(performance.now()-modelStart);
    out.model_candidate_id=model.candidate_id;out.model_scope=model.scope;
    const selected=candidates[model.index];
    if(!selected||Math.abs(selected.pct-a.forecast_narrative_pct)>0.05){
      out.state='SOURCE_VERIFIED_MODEL_SELECTION_DISPUTED';return out;}
    out.model_selected_cagr=selected.pct;
    if(['DIRECT','PROXY'].includes(model.scope)){
      out.state='BROAD_SCOPE_REVIEW_REQUIRED';return out;
    }
    out.state='SOURCE_VERIFIED_MODEL_SCOPE_DISPUTED';
  }catch(e){out.ollama_ms=Math.round(performance.now()-modelStart);
    out.error=clean(e.message);out.state='SOURCE_VERIFIED_MODEL_FAILED';}
  return out;
}

export function summarizeR58(rounds){
  const data=rounds.filter(x=>!x.warmup);
  const times=data.map(x=>x.total_ms).sort((a,b)=>a-b),median=times[1]??null;
  const sourceRepeatable=data.length===3&&data.every(x=>
    x.result.source_observed_cagr!==null&&x.result.source_observed_cagr===data[0].result.source_observed_cagr&&
    x.result.source_period==='2026-2030'&&
    x.result.source_audit===data[0].result.source_audit&&
    auditPass.has(x.result.source_audit));
  const modelRepeatable=sourceRepeatable&&data.every(x=>
    x.result.model_selected_cagr!==null&&
    x.result.model_selected_cagr===x.result.source_observed_cagr&&
    ['DIRECT','PROXY'].includes(x.result.model_scope)&&
    x.result.state==='BROAD_SCOPE_REVIEW_REQUIRED');
  return {gate:!sourceRepeatable?'SOURCE_RECHECK_REQUIRED':
      modelRepeatable?'SOURCE_AND_MODEL_REPEATABLE_SCOPE_REVIEW':
        'SOURCE_REPEATABLE_MODEL_SCOPE_REVIEW',
    source_repeatable:sourceRepeatable,model_repeatable:modelRepeatable,
    source_cagr:sourceRepeatable?data[0].result.source_observed_cagr:null,
    model_cagr:modelRepeatable?data[0].result.model_selected_cagr:null,
    median_ms:median,deviation_ratio:median?Number((Math.max(...times.map(x=>Math.abs(x-median)))/median).toFixed(3)):null,
    scope:'BROAD_UTILITIES_REVIEW',sector_cagr:null,
    other_r56_sources_refetched:0,bri_requests:0,search_requests:0,project_writes:0};
}

export async function runR58({inspectFn=inspectR58,
  outputPrefix=join(BASE,'R58_TOPIC06_SCOPE_DIAG_RESULT')}={}){
  const txt=outputPrefix+'.txt',json=outputPrefix+'.json',history=outputPrefix+'_HISTORY.ndjson';
  await writeFile(txt,'REPORT=R58_TOPIC06_UTILITIES_SOURCE_VS_MODEL_SCOPE\r\n'+
    'SOURCE='+URL+'\r\nRESEARCH_ONLY=YES\r\nBRI_REQUESTS=0\r\n'+
    'SEARCH_REQUESTS=0\r\nPROJECT_WRITES=0\r\nSECTOR_CAGR=NULL\r\nSTATUS=RUNNING\r\n');
  const log=x=>appendFile(txt,x+'\r\n');
  const rounds=[],modelQueue=serialModelQueue();
  try{
    for(let i=0;i<4;i++){
      const start=performance.now();const result=await inspectFn({modelQueue});
      const row={round:i+1,warmup:i===0,total_ms:Math.round(performance.now()-start),
        at:new Date().toISOString(),result};
      rounds.push(row);
      await log('ROUND='+row.round+' WARMUP='+row.warmup+' TOTAL_MS='+row.total_ms+
        ' SOURCE_AUDIT='+clean(result.source_audit)+
        ' SOURCE_CAGR='+(result.source_observed_cagr??'NULL')+
        ' MODEL_CAGR='+(result.model_selected_cagr??'NULL')+
        ' MODEL_SCOPE='+clean(result.model_scope)+
        ' MODEL_ID='+clean(result.model_candidate_id)+
        ' STATE='+clean(result.state)+' PERIOD='+clean(result.source_period)+
        ' ERROR='+clean(result.error));
      if(result.source_evidence)await log('EVIDENCE='+JSON.stringify(result.source_evidence));
      await writeFile(json,JSON.stringify({status:'RUNNING',rounds},null,2));
      if(result.state==='SOURCE_BLOCKED')break;
    }
    const summary=summarizeR58(rounds);
    const out={report:'R58',status:'FINISHED_RESEARCH_ONLY',
      source_url:URL,summary,rounds};
    await writeFile(json,JSON.stringify(out,null,2));
    await appendFile(history,JSON.stringify({at:new Date().toISOString(),...out})+'\n');
    await log('SUMMARY_GATE='+summary.gate+' SOURCE_CAGR='+(summary.source_cagr??'NULL')+
      ' MODEL_CAGR='+(summary.model_cagr??'NULL')+' SECTOR_CAGR=NULL');
    await log('STATUS=FINISHED_RESEARCH_ONLY');
    await log('SEND_TXT='+basename(txt));return out;
  }catch(e){await log('STATUS=FAILED');await log('ERROR='+clean(e.message));throw e;}
}

if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1])
  runR58().catch(e=>{console.error('R58_FATAL='+clean(e.message));process.exitCode=1;});
