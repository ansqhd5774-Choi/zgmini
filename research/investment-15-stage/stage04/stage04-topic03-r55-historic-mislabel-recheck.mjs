/**
 * R55: isolate the one R54 TBRC passenger-car forecast metadata exception.
 * Four fresh public GETs (1 warm-up + 3 measured). No search or other sites.
 * The forecast audit never overwrites publisher content or invents a rate.
 */
import {writeFile,appendFile} from 'node:fs/promises';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {PUBLISHERS} from './stage04-four-publisher-r37-readonly.mjs';
import {TOPICS,inspectR53,serialModelQueue} from './stage04-topic03-04-r53-parallel.mjs';
import {verifiedAnchor} from './stage04-topic03-04-r54-first-party-anchors.mjs';

const BASE=join(dirname(fileURLToPath(import.meta.url)),'..');
const topic=TOPICS.find(t=>t.index===3),publisher=PUBLISHERS.find(p=>p.id==='TBRC');
const url=verifiedAnchor(topic,publisher);
const clean=s=>String(s??'NULL').replace(/[\r\n|]/g,' ').slice(0,300);

export function summarizeR55(rounds){
  const measured=rounds.filter(x=>!x.warmup);
  const audit_states=measured.map(x=>x.audit_state);
  const observed=measured.map(x=>x.observed_cagr);
  const consistent=measured.length===3&&
    audit_states.every(x=>x==='RESOLVED_HISTORIC_RATE_MISLABEL')&&
    observed.every(x=>x!==null&&x===observed[0]);
  const times=measured.map(x=>x.total_ms).sort((a,b)=>a-b);
  const median=times.length===3?times[1]:null;
  return {state:consistent?'SOURCE_EXCEPTION_EXPLAINED_REPEATABLE':'REVIEW_REQUIRED',
    observed_cagr:consistent?observed[0]:null,
    sector_cagr:null,market_scope:'DISCRETIONARY_SUBMARKET_PROXY',
    runs:rounds.length,median_total_ms:median,
    outlier_ratio:median?Number((Math.max(...times.map(x=>Math.abs(x-median)))/median).toFixed(3)):null,
    bri_network_requests:0,model_serial:true};
}

export async function runR55({fetchFn=fetch,inspectFn=inspectR53,
  outputPrefix=join(BASE,'R55_TOPIC03_TBRC_METADATA_RESULT')}={}){
  const txt=outputPrefix+'.txt',json=outputPrefix+'.json',history=outputPrefix+'_HISTORY.ndjson';
  await writeFile(txt,'REPORT=R55_TOPIC03_TBRC_METADATA_FORECAST_AUDIT\r\n'+
    'RESEARCH_ONLY=true\r\nBRI_NETWORK_REQUESTS=0\r\n'+
    'SEARCH_ENGINE_REQUESTS=0\r\nPROJECT_WRITES=NONE\r\n');
  const log=s=>appendFile(txt,s+'\r\n');
  try{
    const rounds=[],modelQueue=serialModelQueue();
    for(let i=0;i<4;i++){
      const start=performance.now();
      const result=await inspectFn(topic,publisher,url,{fetchFn,modelQueue});
      const item={round:i+1,warmup:i===0,total_ms:Math.round(performance.now()-start),
        state:result.state,audit_state:result.source_audit,
        observed_cagr:result.observed_cagr,period:result.period,
        scope:result.market_scope,source_evidence:result.source_evidence,
        report_ms:result.report_ms,ollama_ms:result.ollama_ms,error:result.error,
        at:new Date().toISOString()};
      rounds.push(item);
      await log('ROUND='+item.round+' WARMUP='+item.warmup+' TOTAL_MS='+item.total_ms+
        ' STATE='+item.state+' AUDIT='+item.audit_state+' CAGR='+(item.observed_cagr??'NULL')+
        ' PERIOD='+(item.period??'NULL')+' SCOPE='+(item.scope??'NULL')+
        ' ERROR='+clean(item.error));
      if(item.source_evidence)await log('EVIDENCE='+JSON.stringify(item.source_evidence));
      await writeFile(json,JSON.stringify({status:'RUNNING',rounds},null,2));
      // Source restrictions are stop conditions, not retry targets.
      if(result.state==='SOURCE_BLOCKED')break;
    }
    const summary=summarizeR55(rounds);
    const out={status:'FINISHED_RESEARCH_ONLY',report:'R55',source_url:url,
      scope:'VERIFIED_TBRC_PASSENGER_CAR_REPORT_ONLY',summary,rounds};
    await writeFile(json,JSON.stringify(out,null,2));
    await appendFile(history,JSON.stringify({at:new Date().toISOString(),...out})+'\n');
    await log('SUMMARY='+summary.state+' CAGR='+(summary.observed_cagr??'NULL')+
      ' SECTOR_CAGR=NULL MEDIAN_MS='+(summary.median_total_ms??'NULL'));
    await log('STATUS=FINISHED_RESEARCH_ONLY');
    return out;
  }catch(e){await log('STATUS=FAILED');await log('ERROR='+clean(e.message));throw e;}
}

if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1])
  runR55().catch(e=>{console.error('R55_FATAL='+clean(e.message));process.exitCode=1;});
