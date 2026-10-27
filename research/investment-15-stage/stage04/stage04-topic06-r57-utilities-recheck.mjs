/**
 * R57: one TBRC Utilities report only, 1 fresh warm-up + 3 fresh measurements.
 * Does not rerun the eight already-observed R56 publisher/topic combinations.
 * Read-only publisher GETs, locally serialized Ollama model, no deployment.
 */
import {writeFile,appendFile} from 'node:fs/promises';
import {basename,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {PUBLISHERS,pagePlainText,extractCagrCandidates} from './stage04-four-publisher-r37-readonly.mjs';
import {getOfficial,titleOf} from './stage04-topic01-r45-readonly.mjs';
import {headlineForecastConflict} from './stage04-topic02-r50-three-media.mjs';
import {serialModelQueue} from './stage04-topic03-04-r53-parallel.mjs';
import {TOPICS_R56,verifiedR56Anchor,scopeR56,chooseR56} from './stage04-topic05-07-r56-triple.mjs';
import {auditUtilitiesMetadataR57} from './forecast-utilities-metadata-r57-readonly.mjs';

const BASE=join(dirname(fileURLToPath(import.meta.url)),'..');
const topic=TOPICS_R56.find(t=>t.index===6);
const publisher=PUBLISHERS.find(p=>p.id==='TBRC');
const URL=verifiedR56Anchor(topic,publisher);
const clean=x=>String(x??'NULL').replace(/[\r\n=|]/g,' ').slice(0,330);
const validAudits=new Set(['CONSISTENT','RESOLVED_HISTORIC_RATE_MISLABEL',
  'NARRATIVE_VERIFIED_METADATA_CONFLICT']);

export async function inspectR57({fetchFn=fetch,chooseFn=chooseR56,
  auditFn=auditUtilitiesMetadataR57,modelQueue=serialModelQueue()}={}){
  const out={url:URL,market_scope:scopeR56(topic,publisher,URL),
    state:'REPORT_FAILED',source_audit:'NOT_AUDITED',observed_cagr:null,
    period:null,sector_cagr:null,model_scope:null,
    metadata_conflict_preserved:null,source_evidence:null,
    report_ms:0,ollama_ms:0,error:null};
  let html;const reportStart=performance.now();
  try{html=await getOfficial(URL,publisher,fetchFn);}catch(e){
    out.report_ms=Math.round(performance.now()-reportStart);
    out.error=clean(e.message);
    out.state=/HTTP_(401|403|429)/.test(out.error)?'SOURCE_BLOCKED':'REPORT_FAILED';
    return out;
  }
  out.report_ms=Math.round(performance.now()-reportStart);
  const headlineConflict=headlineForecastConflict(titleOf(html),html);
  if(headlineConflict){out.state='SOURCE_CONFLICT';out.error=headlineConflict;return out;}
  const audit=auditFn(html);
  out.source_audit=audit.source_audit;
  out.metadata_conflict_preserved=audit.metadata_conflict_preserved;
  out.source_evidence={
    narrative_pct:audit.forecast_narrative_pct,
    publisher_table_pct:audit.forecast_table_pct,
    forecast_math_pct:audit.forecast_math_pct,
    historic_narrative_pct:audit.historic_narrative_pct,
    historic_math_pct:audit.historic_math_pct,
    forecast_base_year:audit.forecast_base_year,
    forecast_end_year:audit.forecast_end_year,
    forecast_base_value:audit.forecast_base_value,
    forecast_end_value:audit.forecast_end_value,
    metadata_reported_end_year:audit.metadata_reported_end_year??null,
    source_conflict_reason:audit.source_conflict_reason,
  };
  if(!validAudits.has(audit.source_audit)){
    out.state=audit.source_audit==='SOURCE_CONFLICT'?'SOURCE_CONFLICT':'SOURCE_AUDIT_INCOMPLETE';
    out.error=audit.source_conflict_reason;
    return out;
  }
  const candidates=extractCagrCandidates(audit.forecast_excerpt||pagePlainText(html));
  if(!candidates.length){out.state='NO_LITERAL_CAGR';return out;}
  const modelStart=performance.now();
  try{
    const chosen=await modelQueue(()=>chooseFn(topic,publisher,titleOf(html),candidates,{fetchFn}));
    out.ollama_ms=chosen.elapsed_ms??Math.round(performance.now()-modelStart);
    out.model_scope=chosen.scope;
    const selection=candidates[chosen.index];
    if(!selection||['UNCLEAR','UNRELATED'].includes(chosen.scope)){
      out.state='MODEL_UNCONFIRMED';return out;
    }
    if(Math.abs(selection.pct-audit.forecast_narrative_pct)>0.05){
      out.state='FORECAST_SELECTION_MISMATCH';return out;
    }
    out.observed_cagr=selection.pct;
    out.period=`${audit.forecast_base_year}-${audit.forecast_end_year}`;
    // Broad TBRC Utilities is not automatically the investable GICS sector.
    out.state='BROAD_SCOPE_REVIEW_REQUIRED';
  }catch(e){out.state='OLLAMA_FAILED';out.error=clean(e.message);
    out.ollama_ms=Math.round(performance.now()-modelStart);}
  return out;
}

export function summarizeR57(rounds){
  const measured=rounds.filter(r=>!r.warmup);
  const values=measured.map(r=>r.result.observed_cagr);
  const audits=measured.map(r=>r.result.source_audit);
  const periods=measured.map(r=>r.result.period);
  const times=measured.map(r=>r.total_ms).sort((a,b)=>a-b),median=times[1]??null;
  const repeatable=measured.length===3&&values.every(x=>x!==null&&x===values[0])&&
    audits.every(x=>validAudits.has(x)&&x===audits[0])&&
    periods.every(x=>x==='2026-2030')&&
    measured.every(x=>x.result.state==='BROAD_SCOPE_REVIEW_REQUIRED');
  return {gate:repeatable?'UTILITIES_SINGLE_SOURCE_REPEATABLE_REVIEW':
    'UTILITIES_SINGLE_SOURCE_INCOMPLETE_REVIEW',
    observed_cagr:repeatable?values[0]:null,
    period:repeatable?'2026-2030':null,
    source_audit:repeatable?audits[0]:null,
    metadata_conflict_preserved:measured.every(x=>x.result.metadata_conflict_preserved===true),
    observed_runs:measured.length,median_ms:median,
    deviation_ratio:median?Number((Math.max(...times.map(x=>Math.abs(x-median)))/median).toFixed(3)):null,
    sector_cagr:null,other_r56_sources_refetched:0,
    bri_network_requests:0,search_engine_requests:0,project_writes:0};
}

export async function runR57({inspectFn=inspectR57,
  outputPrefix=join(BASE,'R57_TOPIC06_TBRC_METADATA_RESULT')}={}){
  const txt=outputPrefix+'.txt',json=outputPrefix+'.json',history=outputPrefix+'_HISTORY.ndjson';
  await writeFile(txt,'REPORT=R57_TOPIC06_TBRC_UTILITIES_METADATA_RECHECK\r\n'+
    'RESEARCH_ONLY=YES\r\nONLY_LIVE_SOURCE='+URL+'\r\n'+
    'BRI_NETWORK_REQUESTS=0\r\nSEARCH_ENGINE_REQUESTS=0\r\n'+
    'PROJECT_WRITES=NONE\r\nSECTOR_CAGR=NULL\r\nSTATUS=RUNNING\r\n');
  const log=s=>appendFile(txt,s+'\r\n');
  try{
    const rounds=[],modelQueue=serialModelQueue();
    for(let i=0;i<4;i++){
      const started=performance.now();
      const result=await inspectFn({modelQueue});
      const row={round:i+1,warmup:i===0,total_ms:Math.round(performance.now()-started),
        result,at:new Date().toISOString()};
      rounds.push(row);
      await log('ROUND='+row.round+' WARMUP='+row.warmup+
        ' TOTAL_MS='+row.total_ms+' AUDIT='+clean(result.source_audit)+
        ' STATE='+clean(result.state)+' CAGR='+(result.observed_cagr??'NULL')+
        ' PERIOD='+(result.period??'NULL')+' METADATA_CONFLICT='+
        clean(result.metadata_conflict_preserved)+' ERROR='+clean(result.error));
      if(result.source_evidence)await log('EVIDENCE='+JSON.stringify(result.source_evidence));
      await writeFile(json,JSON.stringify({status:'RUNNING',rounds},null,2));
      if(result.state==='SOURCE_BLOCKED')break;
    }
    const summary=summarizeR57(rounds);
    const out={status:'FINISHED_RESEARCH_ONLY',report:'R57',source_url:URL,
      topic_index:6,topic:'유틸리티',scope:'BROAD_UTILITIES_REVIEW',summary,rounds};
    await writeFile(json,JSON.stringify(out,null,2));
    await appendFile(history,JSON.stringify({at:new Date().toISOString(),...out})+'\n');
    await log('SUMMARY_GATE='+summary.gate+' CAGR='+(summary.observed_cagr??'NULL')+
      ' PERIOD='+(summary.period??'NULL')+' MEDIAN_MS='+(summary.median_ms??'NULL')+
      ' SECTOR_CAGR=NULL');
    await log('STATUS=FINISHED_RESEARCH_ONLY');
    await log('SEND_TXT='+basename(txt));
    return out;
  }catch(e){await log('STATUS=FAILED');await log('ERROR='+clean(e.message));throw e;}
}

if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1])
  runR57().catch(e=>{console.error('R57_FATAL='+clean(e.message));process.exitCode=1;});
