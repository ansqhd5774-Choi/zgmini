/**
 * R47: ONE official TBRC GET + ONE unmodified R46 Ollama request.
 * Capture the actual model response schema and timing to diagnose the
 * four reproducible R46 OLLAMA_SCHEMA_INVALID failures.
 * Research-only. No DB/score/order/deploy writes. Never changes models.
 */
import {writeFile,appendFile} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {PUBLISHERS,extractCagrCandidates} from './stage04-four-publisher-r37-readonly.mjs';
import {auditForecastSource} from './forecast-source-audit-r29-readonly.mjs';
import {getOfficial,ollamaChoose,classifyTitle,titleOf} from './stage04-topic01-r45-readonly.mjs';

const BASE=join(dirname(fileURLToPath(import.meta.url)),'..');
const FILE=join(BASE,'R47_TOPIC01_OLLAMA_DIAG_RESULT.txt');
const REPORT='https://www.thebusinessresearchcompany.com/report/information-technology-global-market-report';
const MODEL='gemma3:4b';
const clean=s=>String(s??'NULL').replace(/[\r\n|=]/g,' ').slice(0,950);
const safeJSON=x=>{try{return JSON.stringify(x)}catch{return 'NOT_SERIALIZABLE'}};

export function explainModelResponse(response,candidateCount){
  if(!response||typeof response!=='object')return {status:'NO_JSON_BODY'};
  const raw=response.response;
  const info={status:'RESPONSE_PRESENT',body_keys:Object.keys(response).sort(),
    response_type:typeof raw,response_length:typeof raw==='string'?raw.length:null,
    response_sample:typeof raw==='string'?raw.slice(0,450):safeJSON(raw).slice(0,450),
    done_reason:response.done_reason??null,
    model_total_ms:Math.round((response.total_duration||0)/1e6),
    model_load_ms:Math.round((response.load_duration||0)/1e6),
    model_eval_ms:Math.round((response.eval_duration||0)/1e6)};
  try{
    const answer=JSON.parse(raw);
    info.answer_keys=answer&&typeof answer==='object'?Object.keys(answer).sort():[];
    info.index=answer?.index??null;
    info.index_type=typeof answer?.index;
    info.scope=answer?.scope??null;
    info.scope_type=typeof answer?.scope;
    info.index_integer=Number.isInteger(answer?.index);
    info.index_in_range=Number.isInteger(answer?.index)&&answer.index>=-1&&answer.index<candidateCount;
    info.scope_allowed=['DIRECT','PROXY','UNRELATED','UNCLEAR'].includes(answer?.scope);
    info.keys_exact=info.answer_keys.join()==='index,scope';
    info.status='JSON_PARSED';
  }catch(err){info.status='JSON_PARSE_ERROR';info.parse_error=String(err.message).slice(0,160);}
  return info;
}

export async function runR47({fetchFn=fetch,outputFile=FILE}={}){
  await writeFile(outputFile,'REPORT=STAGE04_R47_OLLAMA_SCHEMA_DIAGNOSTIC\r\n'+
    'SCOPE=TOPIC_01_TBRC_ONE_SOURCE_ONE_MODEL_CALL\r\n'+
    'PAID_CREDITS_USED=0\r\nDB_SCORE_DEPLOY_CHANGE=NONE\r\nSTATUS=RUNNING\r\n');
  const log=async(key,value)=>appendFile(outputFile,`${key}=${clean(value)}\r\n`);
  try{
    const publisher=PUBLISHERS.find(p=>p.id==='TBRC');
    const start=performance.now();
    const html=await getOfficial(REPORT,publisher,fetchFn);
    await log('REPORT_GET_MS',Math.round(performance.now()-start));
    await log('REPORT_BYTES',Buffer.byteLength(html));
    const audit=auditForecastSource(html);
    await log('SOURCE_AUDIT',audit.source_audit);
    await log('SOURCE_CONFLICT',audit.source_conflict_reason);
    await log('FORECAST_PERIOD',`${audit.forecast_base_year??'NULL'}-${audit.forecast_end_year??'NULL'}`);
    await log('FORECAST_NARRATIVE_PCT',audit.forecast_narrative_pct);
    await log('FORECAST_TABLE_PCT',audit.forecast_table_pct);
    await log('FORECAST_MATH_PCT',audit.forecast_math_pct);
    const title=titleOf(html);
    await log('REPORT_TITLE',title);
    await log('TITLE_SCOPE',classifyTitle(REPORT,title,publisher));
    if(audit.source_audit!=='CONSISTENT'||!audit.forecast_excerpt)
      throw Error('SOURCE_AUDIT_INCOMPLETE_DIAGNOSTIC_ABORT');
    const candidates=extractCagrCandidates(audit.forecast_excerpt);
    await log('CANDIDATE_COUNT',candidates.length);
    await log('CANDIDATE_RATES',candidates.map(c=>c.pct).join(',')||'NONE');
    if(!candidates.length)throw Error('FORECAST_CANDIDATE_ABSENT');

    let capture=null,modelCalls=0;
    const observingFetch=async(url,options)=>{
      if(url!=='http://127.0.0.1:11434/api/generate')throw Error('UNEXPECTED_MODEL_URL');
      modelCalls++;
      const response=await fetchFn(url,options);
      try{capture=await response.clone().json();}
      catch(err){capture={response:`CLONE_OR_RESPONSE_FAILED:${String(err.message).slice(0,90)}`};}
      await log('MODEL_HTTP_STATUS',response.status);
      return response;
    };
    const modelStart=performance.now();let modelResult=null,modelError=null;
    try{modelResult=await ollamaChoose(publisher,title,candidates,MODEL,{fetchFn:observingFetch});}
    catch(err){modelError=String(err.message).slice(0,150);}
    await log('MODEL_CALLS',modelCalls);
    await log('MODEL_WALL_MS',Math.round(performance.now()-modelStart));
    const findings=explainModelResponse(capture,candidates.length);
    for(const [key,value] of Object.entries(findings))
      await log('MODEL_'+key.toUpperCase(),Array.isArray(value)?value.join(','):value);
    await log('MODEL_ERROR',modelError||'NONE');
    await log('MODEL_RESULT_INDEX',modelResult?.index??'NULL');
    await log('MODEL_RESULT_SCOPE',modelResult?.scope??'NULL');
    await log('STATUS','DIAGNOSTIC_COMPLETE');
    await log('SEND_TXT','R47_TOPIC01_OLLAMA_DIAG_RESULT.txt');
    return {audit,candidates:candidates.length,modelCalls,findings,modelError,modelResult};
  }catch(err){await log('STATUS','DIAGNOSTIC_FAILED');await log('ERROR',String(err.message));throw err;}
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1])
  runR47().catch(err=>{console.error('R47_FATAL='+clean(err.message));process.exitCode=1;});
