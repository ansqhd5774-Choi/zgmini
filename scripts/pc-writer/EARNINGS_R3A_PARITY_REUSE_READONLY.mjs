// ZGMINI Earnings Companion R3-A closure: 0-API read-only parity/reuse probe.
// Reads at most 6 Growth current records plus aggregate indexes from a single table.
// Does NOT write to SQLite, modify calculations, or schedule any collection.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {DatabaseSync} from 'node:sqlite';

const folder = path.dirname(fileURLToPath(import.meta.url));
const pcRoot = path.resolve(process.env.ZGMINI_PC_HOME || 'E:\\ZGmini\\data\\pc-writer');
const at = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z').replace('T', '-');
const txt = path.join(folder, `EARNINGS_R3A_PARITY_REUSE_RESULT_${at}.txt`);
const lines = ['EARNINGS_COMPANION_R3A_PARITY_REUSE_READONLY_R1_20261027',
  `UTC=${new Date().toISOString()}`, 'MODE=READ_ONLY', 'API_REQUESTS=0'];
const ids = ['G010','G013','G015','G016','G017','G018'];
const trackedDatasets = ['PPIFIS','WPSFD4','WPSFD41','PRS85006111','A051RC','IR/TOTBUS/yes'];
const clean = x => String(x ?? 'NULL').replace(/[^A-Za-z0-9_.:+/|,-]/g,'_').slice(0,260);
const line = (k,v) => lines.push(`${k}=${clean(v)}`);
const rounded = n => Number.isFinite(n) ? n.toFixed(10) : 'NON_FINITE';
let db, completed = false;

try {
  const file = path.join(pcRoot,'storage','core.sqlite');
  if(!fs.existsSync(file)) throw Error('PC_CORE_DB_NOT_FOUND');
  db = new DatabaseSync(file,{readOnly:true,timeout:1500});
  db.exec('PRAGMA query_only=ON');
  line('DB','OPENED_READ_ONLY');
  const exists = name => Boolean(db.prepare('SELECT 1 FROM sqlite_master WHERE type=? AND name=?').get('table',name));
  const columns = name => new Set(db.prepare(`PRAGMA table_info("${name}")`).all().map(x=>String(x.name)));

  const growthTable='growth_r2_feature_current_v1';
  if(exists(growthTable) && ['candidate_id','observation_date','harmonized_value','harmonized_unit','retrieved_at'].every(k=>columns(growthTable).has(k))){
    const query=db.prepare(`SELECT candidate_id,observation_date,harmonized_value,harmonized_unit,retrieved_at
      FROM ${growthTable} WHERE candidate_id=? LIMIT 1`);
    const values=new Map(ids.map(id=>[id,query.get(id)]));
    for(const id of ids) {
      const r=values.get(id);
      line(`${id}_ROW`,r ? `${r.observation_date}|${r.harmonized_unit}|${r.retrieved_at}` : 'MISSING');
    }
    for(const [out,n,d] of [['G017','G010','G016'],['G018','G013','G016']]) {
      const a=values.get(n),b=values.get(d),result=values.get(out);
      if(!a||!b||!result){line(`${out}_PARITY`,'MISSING_INPUT');continue;}
      if(!(a.observation_date===b.observation_date && b.observation_date===result.observation_date)){
        line(`${out}_PARITY`,'OBSERVATION_DATE_MISMATCH');continue;
      }
      if(a.harmonized_unit!==b.harmonized_unit){line(`${out}_PARITY`,'NUMERATOR_DENOMINATOR_UNIT_MISMATCH');continue;}
      if(result.harmonized_unit!=='RATIO'){line(`${out}_PARITY`,'STORED_RESULT_UNIT_NOT_RATIO');continue;}
      if([a.harmonized_value,b.harmonized_value,result.harmonized_value].some(v=>v===null||v===undefined||v==='')){
        line(`${out}_PARITY`,'MISSING_NUMERIC_VALUE');continue;
      }
      const numerator=Number(a.harmonized_value),denominator=Number(b.harmonized_value),stored=Number(result.harmonized_value);
      if(![numerator,denominator,stored].every(Number.isFinite)||denominator===0){
        line(`${out}_PARITY`,'INVALID_NUMERIC_OR_ZERO_DENOMINATOR');continue;
      }
      const expected=numerator/denominator;
      const absError=Math.abs(expected-stored);
      const threshold=Math.max(1e-9,Math.abs(expected)*1e-8);
      line(`${out}_EXPECTED_FROM_LATEST_INPUTS`,rounded(expected));
      line(`${out}_ACTUAL_STORED`,rounded(stored));
      line(`${out}_ABS_DIFFERENCE`,rounded(absError));
      line(`${out}_PARITY`,absError<=threshold?'SAME_WITHIN_FLOAT_TOLERANCE':'DIFFERENT_REVIEW_REQUIRED');
    }
  }else line('GROWTH_PARITY','TABLE_OR_REQUIRED_COLUMN_MISSING');

  const historyTable='api_history_snapshots_v1';
  if(exists(historyTable)&&['provider','dataset','retrieved_at','row_count','latest_observation_date'].every(k=>columns(historyTable).has(k))){
    const rows=db.prepare(`SELECT provider,dataset,COUNT(*) AS snapshots,MAX(retrieved_at) AS last_retrieved,
      MAX(latest_observation_date) AS last_observation
      FROM ${historyTable}
      WHERE dataset IN (${trackedDatasets.map(()=>'?').join(',')})
      GROUP BY provider,dataset ORDER BY provider,dataset LIMIT 24`).all(...trackedDatasets);
    line('API_HISTORY_TARGETED_GROUPS',rows.length);
    for(let i=0;i<rows.length;i++) {
      const x=rows[i];
      line(`API_HISTORY_GROUP_${i+1}`,`${x.provider}|${x.dataset}|COUNT:${x.snapshots}|LAST_GET:${x.last_retrieved}|LAST_OBS:${x.last_observation}`);
    }
    if(!rows.length)line('API_HISTORY_NOTE','NO_TARGETED_MATCH_DOES_NOT_PROVE_ABSENCE_ELSEWHERE');
  } else line('API_HISTORY_TARGETED_GROUPS','TABLE_OR_REQUIRED_COLUMN_MISSING');

  line('QFR_2025Q2_PAIR','NOT_CLAIMED_BY_THIS_PROBE');
  line('BEA_BLS_CENSUS_REUSE','DECIDE_FROM_EXACT_PROVIDER_DATASET_AND_RIGHTS_NOT_SCHEMA_NAME');
  completed=true;
}catch(error){line('ERROR',/^[A-Z0-9_]+$/.test(String(error?.message))?error.message:'READ_ONLY_QUERY_ERROR');}
finally {
  try{db?.close();}catch{}
  line('NO_DATABASE_WRITE','TRUE');
  line('NO_D1_WRITE','TRUE');
  line('NO_SCHEDULER_CHANGE','TRUE');
  line('NO_SCORE_CHANGE','TRUE');
  line('RESULT',completed?'R3A_PARITY_METADATA_REVIEW_READY':'R3A_PARITY_INSPECTION_INCOMPLETE');
  if(!completed)process.exitCode=2;
  try{fs.writeFileSync(txt,lines.join('\r\n')+'\r\n',{encoding:'utf8',flag:'wx'});
    console.log('TXT_CREATED='+path.basename(txt));
  }catch{console.error('TXT_LOG_WRITE_FAILED');process.exitCode=1;}
}
