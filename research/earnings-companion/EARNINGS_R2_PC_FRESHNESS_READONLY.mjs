// ZGMINI R2 last missing PC gate: exact dates/identities of already stored input rows.
// This program has ZERO API/HTTP calls, ZERO database writes, ZERO score computation.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {DatabaseSync} from 'node:sqlite';

const root=path.dirname(fileURLToPath(import.meta.url));
const t=new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d+Z$/,'Z').replace('T','-');
const logfile=path.join(root,`EARNINGS_R2_PC_FRESHNESS_RESULT_${t}.txt`);
const base=path.resolve(process.env.ZGMINI_PC_HOME||'E:\\ZGmini\\data\\pc-writer');
const log=['EARNINGS_COMPANION_R2_PC_FRESHNESS_READONLY_R1_20261026',`UTC=${new Date().toISOString()}`,'MODE=READ_ONLY','API_REQUESTS=0'];
const clean=x=>String(x??'UNKNOWN').replace(/[^A-Za-z0-9_.:+-]/g,'_').slice(0,92);
const add=(k,v)=>log.push(`${k}=${v}`);
let sqlite=null;
try {
  const dbfile=path.join(base,'storage','core.sqlite');
  if(!fs.existsSync(dbfile)) throw Error('PC_CORE_DB_MISSING');
  sqlite=new DatabaseSync(dbfile,{readOnly:true,timeout:1500});
  sqlite.exec('PRAGMA query_only=ON');
  add('DB','OPENED_READ_ONLY');
  const has=table=>!!sqlite.prepare('SELECT 1 FROM sqlite_master WHERE type=? AND name=? LIMIT 1').get('table',table);
  if(has('growth_r2_feature_current_v1')){
    // Candidate ID, observation date, source and units are metadata: raw market values are never printed.
    const rows=sqlite.prepare(`SELECT candidate_id,observation_date,observation_period,
        available_at,release_date,provider,selector,frequency,native_unit,retrieved_at
      FROM growth_r2_feature_current_v1 ORDER BY candidate_id LIMIT 70`).all();
    add('GROWTH_CURRENT_COUNT_UP_TO_70',rows.length);
    for(const r of rows){
      const id=clean(r.candidate_id);
      if(!/^G\d{3}$/.test(id))continue;
      add(`GROWTH_${id}`,[r.observation_date,r.observation_period,r.available_at,r.release_date,
        r.provider,r.selector,r.frequency,r.native_unit,r.retrieved_at].map(clean).join('|'));
    }
  } else add('GROWTH_CURRENT','TABLE_MISSING');
  if(has('growth_r2_provider_snapshots_v1')){
    const rows=sqlite.prepare(`SELECT provider_group,MAX(retrieved_at) AS last_retrieved
      FROM growth_r2_provider_snapshots_v1
      WHERE provider_group LIKE 'Census M3:%'
      GROUP BY provider_group ORDER BY provider_group LIMIT 12`).all();
    for(const r of rows)add(`GROWTH_SOURCE_${clean(r.provider_group)}`,clean(r.last_retrieved));
    if(!rows.length)add('GROWTH_SOURCE_CENSUS_M3','NOT_PRESENT_IN_PROVIDER_SNAPSHOTS');
  } else add('GROWTH_SOURCE','TABLE_MISSING');
  if(has('market_score_earnings_e1_r3_runs_v1')){
    const rows=sqlite.prepare(`SELECT period_end,status,completed_at,universe_count,provider_requests,
      eps_count,revenue_count,margin_count,current_rows,failure_code
      FROM market_score_earnings_e1_r3_runs_v1 ORDER BY completed_at DESC LIMIT 4`).all();
    for(let i=0;i<rows.length;i++){
      const r=rows[i];
      add(`EARNINGS_RECENT_RUN_${i+1}`,[r.period_end,r.status,r.completed_at,r.universe_count,
        r.provider_requests,r.eps_count,r.revenue_count,r.margin_count,r.current_rows,r.failure_code].map(clean).join('|'));
    }
    if(!rows.length)add('EARNINGS_RECENT_RUN','NO_ROWS');
  } else add('EARNINGS_RUNS','TABLE_MISSING');
  if(has('market_score_earnings_e1_r3_universe_v1')){
    const rows=sqlite.prepare(`SELECT period_end,security_count,issuer_count,retrieved_at
      FROM market_score_earnings_e1_r3_universe_v1 ORDER BY period_end DESC LIMIT 3`).all();
    for(let i=0;i<rows.length;i++)add(`EARNINGS_UNIVERSE_${i+1}`,
      [rows[i].period_end,rows[i].security_count,rows[i].issuer_count,rows[i].retrieved_at].map(clean).join('|'));
  } else add('EARNINGS_UNIVERSE','TABLE_MISSING');
  const named=sqlite.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND
    (lower(name) LIKE '%qfr%' OR lower(name) LIKE '%mtis%') ORDER BY name LIMIT 16`).all();
  add('DEDICATED_QFR_MTIS_TABLE_NAMES',named.map(r=>clean(r.name)).join('|')||'NOT_FOUND_NAME_ONLY');
  add('PC_TABLE_CONTENTS','ONLY_METADATA_NO_VALUES_NO_PROVENANCE_JSON_NO_RAW_PAYLOAD');
  add('RESULT','READ_ONLY_FRESHNESS_FINISHED');
} catch (error) {add('RESULT',/^[A-Z0-9_]+$/.test(error.message)?error.message:'READ_ONLY_QUERY_FAILED');}
finally {try{sqlite?.close();}catch{}}
add('NO_PC_SQLITE_WRITE','TRUE');
add('NO_D1_WRITE','TRUE');
add('NO_SCHEDULER_CHANGE','TRUE');
try{fs.writeFileSync(logfile,log.join('\r\n')+'\r\n',{encoding:'utf8',flag:'wx'});
  console.log('TXT 로그 생성 완료: '+path.basename(logfile));
}catch{console.error('TXT_LOG_WRITE_FAILED');process.exitCode=1;}
