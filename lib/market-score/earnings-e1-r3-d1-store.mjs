const METRICS=Object.freeze(["epsGrowth","revenueGrowth","operatingMargin"]);
const finite=n=>typeof n==="number"&&Number.isFinite(n);
const text=(v,label)=>{const s=String(v??"").trim();if(!s)throw new TypeError(`${label}_REQUIRED`);return s};
const iso=(v,label)=>{const s=text(v,label);if(!Number.isFinite(Date.parse(s)))throw new TypeError(`${label}_INVALID`);return s};
const period=v=>{const s=text(v,"PERIOD_END");if(!/^\d{4}-\d{2}-\d{2}$/.test(s))throw new TypeError("PERIOD_END_INVALID");return s};
const cik=v=>{const s=String(v??"").replace(/\D/g,"").padStart(10,"0");if(!/^\d{10}$/.test(s)||s==="0000000000")throw new TypeError("CIK_INVALID");return s};
const resultChanges=r=>Number(r?.meta?.changes??r?.changes??r?.changesCount??0)||0;

function stable(value){
  if(value==null||typeof value!=="object")return value;
  if(Array.isArray(value))return value.map(stable);
  return Object.fromEntries(Object.keys(value).sort().map(k=>[k,stable(value[k])]));
}
function json(value){return JSON.stringify(stable(value??{}))}
function parseJson(value){try{return JSON.parse(String(value??"{}"))}catch{return{}}}
function rowsFromAll(r){return Array.isArray(r?.results)?r.results:Array.isArray(r)?r:[]}

export const E1_R3_D1_STORE_VERSION="E1-R3-D1-STORE-V1";
export const E1_R3_METRICS=METRICS;

export function createEarningsE1R3D1Store(db,{now=()=>new Date(),tokenFactory=()=>globalThis.crypto?.randomUUID?.()??`${Date.now()}-${Math.random()}`}={}){
  if(!db||typeof db.prepare!=="function")throw new TypeError("D1_DATABASE_REQUIRED");
  let initialized=null;
  const stmt=(sql,values=[])=>db.prepare(sql).bind(...values);
  async function initialize(){
    if(initialized)return initialized;
    initialized=(async()=>{
      await db.prepare(`CREATE TABLE IF NOT EXISTS market_score_earnings_e1_r3_current_v1 (
        period_end TEXT NOT NULL,
        cik TEXT NOT NULL,
        metric TEXT NOT NULL,
        value REAL NOT NULL,
        ticker TEXT,
        company_name TEXT,
        frame TEXT NOT NULL,
        prior_frame TEXT,
        provenance_json TEXT NOT NULL,
        first_seen_at TEXT NOT NULL,
        last_seen_at TEXT NOT NULL,
        retrieved_at TEXT NOT NULL,
        PRIMARY KEY(period_end,cik,metric)
      )`).run();
      await db.prepare(`CREATE INDEX IF NOT EXISTS market_score_earnings_e1_r3_current_period_metric_v1
        ON market_score_earnings_e1_r3_current_v1(period_end,metric,cik)`).run();
      await db.prepare(`CREATE TABLE IF NOT EXISTS market_score_earnings_e1_r3_history_v1 (
        history_id INTEGER PRIMARY KEY AUTOINCREMENT,
        period_end TEXT NOT NULL,
        cik TEXT NOT NULL,
        metric TEXT NOT NULL,
        value REAL NOT NULL,
        ticker TEXT,
        company_name TEXT,
        frame TEXT NOT NULL,
        prior_frame TEXT,
        provenance_json TEXT NOT NULL,
        change_type TEXT NOT NULL CHECK(change_type IN ('INSERT','UPDATE')),
        retrieved_at TEXT NOT NULL
      )`).run();
      await db.prepare(`CREATE INDEX IF NOT EXISTS market_score_earnings_e1_r3_history_period_metric_v1
        ON market_score_earnings_e1_r3_history_v1(period_end,metric,cik,history_id)`).run();
      await db.prepare(`CREATE INDEX IF NOT EXISTS market_score_earnings_e1_r3_history_cik_metric_v1
        ON market_score_earnings_e1_r3_history_v1(cik,metric,period_end,history_id)`).run();
      await db.prepare(`CREATE TABLE IF NOT EXISTS market_score_earnings_e1_r3_universe_v1 (
        period_end TEXT PRIMARY KEY,
        body_json TEXT NOT NULL,
        security_count INTEGER NOT NULL,
        issuer_count INTEGER NOT NULL,
        wikipedia_revision_id TEXT,
        retrieved_at TEXT NOT NULL
      )`).run();
      await db.prepare(`CREATE TABLE IF NOT EXISTS market_score_earnings_e1_r3_runs_v1 (
        run_id TEXT PRIMARY KEY,
        period_end TEXT NOT NULL,
        status TEXT NOT NULL,
        started_at TEXT NOT NULL,
        completed_at TEXT NOT NULL,
        universe_count INTEGER NOT NULL DEFAULT 0,
        provider_requests INTEGER NOT NULL DEFAULT 0,
        eps_count INTEGER NOT NULL DEFAULT 0,
        revenue_count INTEGER NOT NULL DEFAULT 0,
        margin_count INTEGER NOT NULL DEFAULT 0,
        inserted_count INTEGER NOT NULL DEFAULT 0,
        updated_count INTEGER NOT NULL DEFAULT 0,
        noop_count INTEGER NOT NULL DEFAULT 0,
        current_rows INTEGER NOT NULL DEFAULT 0,
        history_rows_added INTEGER NOT NULL DEFAULT 0,
        upstream_ms REAL,
        storage_write_ms REAL,
        storage_read_ms REAL,
        score_compute_ms REAL,
        failure_code TEXT
      )`).run();
      await db.prepare(`CREATE INDEX IF NOT EXISTS market_score_earnings_e1_r3_runs_period_time_v1
        ON market_score_earnings_e1_r3_runs_v1(period_end,completed_at DESC)`).run();
      await db.prepare(`CREATE TABLE IF NOT EXISTS market_score_earnings_e1_r3_lock_v1 (
        lock_key TEXT PRIMARY KEY,
        token TEXT NOT NULL,
        expires_at TEXT NOT NULL
      )`).run();
    })().catch(e=>{initialized=null;throw e});
    return initialized;
  }
  async function all(sql,values=[]){await initialize();return rowsFromAll(await stmt(sql,values).all())}
  async function first(sql,values=[]){await initialize();return await stmt(sql,values).first()}
  async function runBatches(statements,chunk=80){
    for(let i=0;i<statements.length;i+=chunk){
      const part=statements.slice(i,i+chunk);
      if(typeof db.batch==="function")await db.batch(part);
      else for(const s of part)await s.run();
    }
  }
  async function getCurrentFacts(periodEnd){
    const pe=period(periodEnd);
    const rows=await all(`SELECT period_end,cik,metric,value,ticker,company_name,frame,prior_frame,provenance_json,first_seen_at,last_seen_at,retrieved_at
      FROM market_score_earnings_e1_r3_current_v1 WHERE period_end=? ORDER BY metric,cik`,[pe]);
    return rows.map(r=>({...r,value:Number(r.value),provenance:parseJson(r.provenance_json)}));
  }
  async function countHistory(){
    const r=await first(`SELECT COUNT(*) AS n FROM market_score_earnings_e1_r3_history_v1`);
    return Number(r?.n??0);
  }
  async function listStoredPeriods(asOf,{limit=20}={}){
    const cutoff=period(asOf),lim=Math.max(1,Math.min(40,Math.trunc(Number(limit)||20)));
    const rows=await all(`SELECT
      u.period_end,
      u.retrieved_at,
      u.security_count,
      u.issuer_count,
      u.wikipedia_revision_id,
      (SELECT MAX(r.completed_at) FROM market_score_earnings_e1_r3_runs_v1 r
        WHERE r.period_end=u.period_end AND r.status='SUCCESS') AS completed_at
      FROM market_score_earnings_e1_r3_universe_v1 u
      WHERE u.period_end<=?
        AND EXISTS (SELECT 1 FROM market_score_earnings_e1_r3_current_v1 c WHERE c.period_end=u.period_end)
        AND EXISTS (SELECT 1 FROM market_score_earnings_e1_r3_runs_v1 r WHERE r.period_end=u.period_end AND r.status='SUCCESS')
      ORDER BY u.period_end DESC
      LIMIT ?`,[cutoff,lim]);
    return rows.reverse().map(r=>({
      periodEnd:String(r.period_end),
      retrievedAt:r.retrieved_at??null,
      completedAt:r.completed_at??null,
      securityCount:Number(r.security_count??0),
      issuerCount:Number(r.issuer_count??0),
      wikipediaRevisionId:r.wikipedia_revision_id??null,
    }));
  }
  async function getUniverse(periodEnd){
    const pe=period(periodEnd);
    const r=await first(`SELECT body_json,security_count,issuer_count,wikipedia_revision_id,retrieved_at
      FROM market_score_earnings_e1_r3_universe_v1 WHERE period_end=? LIMIT 1`,[pe]);
    if(!r)return null;
    const body=parseJson(r.body_json);
    return {...body,securityCount:Number(r.security_count),issuerCount:Number(r.issuer_count),wikipediaRevisionId:r.wikipedia_revision_id??null,retrievedAt:r.retrieved_at};
  }
  async function putUniverse(periodEnd,universe,retrievedAt){
    await initialize();
    const pe=period(periodEnd),rt=iso(retrievedAt,"RETRIEVED_AT");
    if(!universe||!Array.isArray(universe.members))throw new TypeError("UNIVERSE_REQUIRED");
    const clean=[];const seen=new Set();
    for(const m of universe.members){
      let id;try{id=cik(m.cik)}catch{continue}
      if(seen.has(id))continue;seen.add(id);
      clean.push({cik:id,ticker:String(m.ticker??"").trim(),name:String(m.name??"").trim()});
    }
    const body={members:clean};
    await stmt(`INSERT INTO market_score_earnings_e1_r3_universe_v1(period_end,body_json,security_count,issuer_count,wikipedia_revision_id,retrieved_at)
      VALUES(?,?,?,?,?,?) ON CONFLICT(period_end) DO UPDATE SET
      body_json=excluded.body_json,security_count=excluded.security_count,issuer_count=excluded.issuer_count,
      wikipedia_revision_id=excluded.wikipedia_revision_id,retrieved_at=excluded.retrieved_at`,[
      pe,json(body),Number(universe.securityCount??clean.length),clean.length,
      universe.wikipediaRevisionId==null?null:String(universe.wikipediaRevisionId),rt,
    ]).run();
    return {...body,securityCount:Number(universe.securityCount??clean.length),issuerCount:clean.length,wikipediaRevisionId:universe.wikipediaRevisionId??null,retrievedAt:rt};
  }
  async function upsertIssuerRows({periodEnd,frame,priorFrame=null,issuerRows,retrievedAt}){
    await initialize();
    const pe=period(periodEnd),fr=text(frame,"FRAME"),pf=priorFrame==null?null:text(priorFrame,"PRIOR_FRAME"),rt=iso(retrievedAt,"RETRIEVED_AT");
    if(!Array.isArray(issuerRows))throw new TypeError("ISSUER_ROWS_REQUIRED");
    const existing=await getCurrentFacts(pe),map=new Map(existing.map(r=>[`${r.cik}|${r.metric}`,r]));
    const currentStatements=[],historyStatements=[];
    let inserted=0,updated=0,noop=0,validSeen=0;
    for(const row of issuerRows){
      let id;try{id=cik(row?.cik)}catch{continue}
      const ticker=String(row?.ticker??"").trim()||null,name=String(row?.name??"").trim()||null;
      const provAll=row?.provenance&&typeof row.provenance==="object"?row.provenance:{};
      for(const metric of METRICS){
        const value=row?.[metric];if(!finite(value))continue;validSeen++;
        const provenance=json(provAll?.[metric]??{}),key=`${id}|${metric}`,old=map.get(key);
        if(!old){
          inserted++;
          currentStatements.push(stmt(`INSERT INTO market_score_earnings_e1_r3_current_v1
            (period_end,cik,metric,value,ticker,company_name,frame,prior_frame,provenance_json,first_seen_at,last_seen_at,retrieved_at)
            VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`,[pe,id,metric,value,ticker,name,fr,pf,provenance,rt,rt,rt]));
          historyStatements.push(stmt(`INSERT INTO market_score_earnings_e1_r3_history_v1
            (period_end,cik,metric,value,ticker,company_name,frame,prior_frame,provenance_json,change_type,retrieved_at)
            VALUES(?,?,?,?,?,?,?,?,?,'INSERT',?)`,[pe,id,metric,value,ticker,name,fr,pf,provenance,rt]));
        }else{
          const changed=Number(old.value)!==Number(value)||String(old.provenance_json)!==provenance||String(old.frame)!==fr||String(old.prior_frame??"")!==String(pf??"");
          if(changed){
            updated++;
            currentStatements.push(stmt(`UPDATE market_score_earnings_e1_r3_current_v1 SET
              value=?,ticker=?,company_name=?,frame=?,prior_frame=?,provenance_json=?,last_seen_at=?,retrieved_at=?
              WHERE period_end=? AND cik=? AND metric=?`,[value,ticker,name,fr,pf,provenance,rt,rt,pe,id,metric]));
            historyStatements.push(stmt(`INSERT INTO market_score_earnings_e1_r3_history_v1
              (period_end,cik,metric,value,ticker,company_name,frame,prior_frame,provenance_json,change_type,retrieved_at)
              VALUES(?,?,?,?,?,?,?,?,?,'UPDATE',?)`,[pe,id,metric,value,ticker,name,fr,pf,provenance,rt]));
          }else{
            noop++;
            currentStatements.push(stmt(`UPDATE market_score_earnings_e1_r3_current_v1 SET ticker=?,company_name=?,last_seen_at=?,retrieved_at=?
              WHERE period_end=? AND cik=? AND metric=?`,[ticker,name,rt,rt,pe,id,metric]));
          }
        }
      }
    }
    await runBatches([...currentStatements,...historyStatements]);
    const facts=await getCurrentFacts(pe);
    return {inserted,updated,noop,validSeen,currentRows:facts.length,historyRowsAdded:historyStatements.length,facts};
  }
  async function recordRun(run){
    await initialize();
    const rid=text(run?.runId??tokenFactory(),"RUN_ID"),pe=period(run.periodEnd);
    const started=iso(run.startedAt,"STARTED_AT"),completed=iso(run.completedAt,"COMPLETED_AT");
    await stmt(`INSERT INTO market_score_earnings_e1_r3_runs_v1
      (run_id,period_end,status,started_at,completed_at,universe_count,provider_requests,eps_count,revenue_count,margin_count,
       inserted_count,updated_count,noop_count,current_rows,history_rows_added,upstream_ms,storage_write_ms,storage_read_ms,score_compute_ms,failure_code)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,[
      rid,pe,text(run.status,"STATUS"),started,completed,Number(run.universeCount??0),Number(run.providerRequests??0),
      Number(run.epsCount??0),Number(run.revenueCount??0),Number(run.marginCount??0),Number(run.insertedCount??0),Number(run.updatedCount??0),
      Number(run.noopCount??0),Number(run.currentRows??0),Number(run.historyRowsAdded??0),run.upstreamMs??null,run.storageWriteMs??null,
      run.storageReadMs??null,run.scoreComputeMs??null,run.failureCode??null,
    ]).run();
    return rid;
  }
  async function latestSuccessfulRun(periodEnd){
    return await first(`SELECT * FROM market_score_earnings_e1_r3_runs_v1 WHERE period_end=? AND status='SUCCESS'
      ORDER BY completed_at DESC LIMIT 1`,[period(periodEnd)]);
  }
  async function acquire(lockKey,{ttlMs=120000}={}){
    await initialize();
    const key=text(lockKey,"LOCK_KEY"),token=text(tokenFactory(),"LOCK_TOKEN"),n=now(),d=n instanceof Date?n:new Date(n),nowIso=d.toISOString(),expiresAt=new Date(d.getTime()+ttlMs).toISOString();
    const r=await stmt(`INSERT INTO market_score_earnings_e1_r3_lock_v1(lock_key,token,expires_at) VALUES(?,?,?)
      ON CONFLICT(lock_key) DO UPDATE SET token=excluded.token,expires_at=excluded.expires_at
      WHERE market_score_earnings_e1_r3_lock_v1.expires_at <= ?`,[key,token,expiresAt,nowIso]).run();
    return resultChanges(r)>0?{acquired:true,key,token,expiresAt}:{acquired:false,key,token:null,expiresAt:null};
  }
  async function release(lease){
    if(!lease?.acquired||!lease?.token)return false;
    const r=await stmt(`DELETE FROM market_score_earnings_e1_r3_lock_v1 WHERE lock_key=? AND token=?`,[lease.key,lease.token]).run();
    return resultChanges(r)>0;
  }
  return {initialize,getCurrentFacts,getUniverse,putUniverse,upsertIssuerRows,countHistory,recordRun,latestSuccessfulRun,listStoredPeriods,acquire,release};
}
