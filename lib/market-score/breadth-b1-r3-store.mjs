const finite=x=>typeof x==="number"&&Number.isFinite(x);
const rows=x=>Array.isArray(x?.results)?x.results:Array.isArray(x)?x:[];
const changes=x=>Number(x?.meta?.changes??x?.changes??0)||0;
const text=(v,n)=>{const s=String(v??"").trim();if(!s)throw new TypeError(`${n}_REQUIRED`);return s};
const date=(v,n)=>{const s=text(v,n);if(!/^\d{4}-\d{2}-\d{2}$/.test(s))throw new TypeError(`${n}_INVALID`);return s};
const iso=(v,n)=>{const s=text(v,n);if(!Number.isFinite(Date.parse(s)))throw new TypeError(`${n}_INVALID`);return s};
function stable(v){if(v==null||typeof v!=="object")return v;if(Array.isArray(v))return v.map(stable);return Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])]))}
const j=v=>JSON.stringify(stable(v??{}));
const pj=v=>{try{return JSON.parse(String(v??"{}"))}catch{return{}}};

export const B1_R3_STORE="B1-R3-D1-STORE-R1";
export function createBreadthB1R3Store(db,{now=()=>new Date(),tokenFactory=()=>globalThis.crypto?.randomUUID?.()??`${Date.now()}-${Math.random()}`}={}){
  if(!db||typeof db.prepare!=="function")throw new TypeError("D1_DATABASE_REQUIRED");
  let initialized=null;
  const stmt=(sql,vals=[])=>db.prepare(sql).bind(...vals);
  async function initialize(){
    if(initialized)return initialized;
    initialized=(async()=>{
      await db.prepare(`CREATE TABLE IF NOT EXISTS market_score_breadth_b1_r3_current_v1(
        trade_date TEXT NOT NULL,ticker TEXT NOT NULL,previous_date TEXT NOT NULL,
        previous_close REAL NOT NULL,current_close REAL NOT NULL,current_volume REAL NOT NULL,
        source TEXT NOT NULL,feed TEXT,provenance_json TEXT NOT NULL,
        first_seen_at TEXT NOT NULL,last_seen_at TEXT NOT NULL,retrieved_at TEXT NOT NULL,last_as_of_date TEXT NOT NULL,
        PRIMARY KEY(trade_date,ticker))`).run();
      await db.prepare(`CREATE INDEX IF NOT EXISTS market_score_breadth_b1_r3_current_date_v1
        ON market_score_breadth_b1_r3_current_v1(trade_date DESC,ticker)`).run();
      await db.prepare(`CREATE TABLE IF NOT EXISTS market_score_breadth_b1_r3_history_v1(
        history_id INTEGER PRIMARY KEY AUTOINCREMENT,trade_date TEXT NOT NULL,ticker TEXT NOT NULL,previous_date TEXT NOT NULL,
        previous_close REAL NOT NULL,current_close REAL NOT NULL,current_volume REAL NOT NULL,
        source TEXT NOT NULL,feed TEXT,provenance_json TEXT NOT NULL,
        change_type TEXT NOT NULL CHECK(change_type IN('INSERT','UPDATE')),retrieved_at TEXT NOT NULL,as_of_date TEXT NOT NULL)`).run();
      await db.prepare(`CREATE INDEX IF NOT EXISTS market_score_breadth_b1_r3_history_date_v1
        ON market_score_breadth_b1_r3_history_v1(trade_date,ticker,history_id)`).run();
      await db.prepare(`CREATE TABLE IF NOT EXISTS market_score_breadth_b1_r3_universe_v1(
        trade_date TEXT PRIMARY KEY,members_json TEXT NOT NULL,member_count INTEGER NOT NULL,provenance_json TEXT NOT NULL,
        first_seen_at TEXT NOT NULL,last_seen_at TEXT NOT NULL,retrieved_at TEXT NOT NULL)`).run();
      await db.prepare(`CREATE TABLE IF NOT EXISTS market_score_breadth_b1_r3_runs_v1(
        run_id TEXT PRIMARY KEY,as_of_date TEXT NOT NULL,trade_date TEXT,status TEXT NOT NULL,started_at TEXT NOT NULL,completed_at TEXT NOT NULL,
        provider_requests INTEGER NOT NULL DEFAULT 0,collected_rows INTEGER NOT NULL DEFAULT 0,inserted_count INTEGER NOT NULL DEFAULT 0,
        updated_count INTEGER NOT NULL DEFAULT 0,noop_count INTEGER NOT NULL DEFAULT 0,current_rows INTEGER NOT NULL DEFAULT 0,
        history_rows_added INTEGER NOT NULL DEFAULT 0,coverage REAL,upstream_ms REAL,storage_write_ms REAL,failure_code TEXT,detail_json TEXT NOT NULL)`).run();
      await db.prepare(`CREATE INDEX IF NOT EXISTS market_score_breadth_b1_r3_runs_time_v1
        ON market_score_breadth_b1_r3_runs_v1(as_of_date,completed_at DESC)`).run();
      await db.prepare(`CREATE TABLE IF NOT EXISTS market_score_breadth_b1_r3_lock_v1(lock_key TEXT PRIMARY KEY,token TEXT NOT NULL,expires_at TEXT NOT NULL)`).run();
    })().catch(e=>{initialized=null;throw e});
    return initialized;
  }
  async function all(sql,vals=[]){await initialize();return rows(await stmt(sql,vals).all())}
  async function first(sql,vals=[]){await initialize();return await stmt(sql,vals).first()}
  async function batch(xs,chunk=80){for(let i=0;i<xs.length;i+=chunk){const p=xs.slice(i,i+chunk);if(typeof db.batch==="function")await db.batch(p);else for(const q of p)await q.run();}}
  async function putUniverse({tradeDate,members,provenance={},retrievedAt}){
    await initialize();const td=date(tradeDate,"TRADE_DATE"),rt=iso(retrievedAt,"RETRIEVED_AT");
    const clean=[...new Set((members??[]).map(x=>String(x??"").trim()).filter(Boolean))].sort();
    if(clean.length<490||clean.length>520)throw new Error("UNIVERSE_COUNT_OUT_OF_RANGE");
    const body=j(clean),prov=j(provenance);
    const old=await first(`SELECT * FROM market_score_breadth_b1_r3_universe_v1 WHERE trade_date=?`,[td]);
    await stmt(`INSERT INTO market_score_breadth_b1_r3_universe_v1(trade_date,members_json,member_count,provenance_json,first_seen_at,last_seen_at,retrieved_at)
      VALUES(?,?,?,?,?,?,?) ON CONFLICT(trade_date) DO UPDATE SET members_json=excluded.members_json,member_count=excluded.member_count,
      provenance_json=excluded.provenance_json,last_seen_at=excluded.last_seen_at,retrieved_at=excluded.retrieved_at`,
      [td,body,clean.length,prov,old?.first_seen_at??rt,rt,rt]).run();
    return {tradeDate:td,members:clean,memberCount:clean.length,changed:!old||old.members_json!==body||old.provenance_json!==prov};
  }
  async function getUniverse(td){
    const r=await first(`SELECT * FROM market_score_breadth_b1_r3_universe_v1 WHERE trade_date=?`,[date(td,"TRADE_DATE")]);
    if(!r)return null;return {...r,members:pj(r.members_json),provenance:pj(r.provenance_json),memberCount:Number(r.member_count)};
  }
  async function latestUniverses(asOf,limit=10){
    const rs=await all(`SELECT * FROM market_score_breadth_b1_r3_universe_v1 WHERE trade_date<=? ORDER BY trade_date DESC LIMIT ?`,[date(asOf,"AS_OF_DATE"),Number(limit)]);
    return rs.map(r=>({...r,members:pj(r.members_json),provenance:pj(r.provenance_json),memberCount:Number(r.member_count)}));
  }
  async function existingTickers(td){
    const rs=await all(`SELECT ticker FROM market_score_breadth_b1_r3_current_v1 WHERE trade_date=? ORDER BY ticker`,[date(td,"TRADE_DATE")]);
    return rs.map(x=>String(x.ticker));
  }
  async function getPairs(td){
    const rs=await all(`SELECT * FROM market_score_breadth_b1_r3_current_v1 WHERE trade_date=? ORDER BY ticker`,[date(td,"TRADE_DATE")]);
    return rs.map(r=>({...r,previous_close:Number(r.previous_close),current_close:Number(r.current_close),current_volume:Number(r.current_volume),provenance:pj(r.provenance_json)}));
  }
  async function upsertPairs({asOfDate,tradeDate,pairs,retrievedAt}){
    await initialize();const asof=date(asOfDate,"AS_OF_DATE"),td=date(tradeDate,"TRADE_DATE"),rt=iso(retrievedAt,"RETRIEVED_AT");
    let inserted=0,updated=0,noop=0,validSeen=0;const cur=[],hist=[];
    for(const p of pairs??[]){
      const ticker=text(p?.ticker,"TICKER"),pd=date(p?.previousDate,"PREVIOUS_DATE");
      const pc=Number(p?.previousClose),cc=Number(p?.currentClose),cv=Number(p?.currentVolume);
      if(!finite(pc)||!finite(cc)||!finite(cv)||pc<=0||cc<=0||cv<0)continue;
      if(String(p?.currentDate)!==td||pd>=td)continue;
      validSeen++;
      const source=text(p?.source??"IEX HIST","SOURCE"),feed=p?.feed==null?null:String(p.feed),prov=j(p?.provenance??{attribution:p?.attribution??null});
      const old=await first(`SELECT * FROM market_score_breadth_b1_r3_current_v1 WHERE trade_date=? AND ticker=?`,[td,ticker]);
      if(!old){
        inserted++;
        cur.push(stmt(`INSERT INTO market_score_breadth_b1_r3_current_v1(trade_date,ticker,previous_date,previous_close,current_close,current_volume,source,feed,provenance_json,first_seen_at,last_seen_at,retrieved_at,last_as_of_date)
          VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`,[td,ticker,pd,pc,cc,cv,source,feed,prov,rt,rt,rt,asof]));
        hist.push(stmt(`INSERT INTO market_score_breadth_b1_r3_history_v1(trade_date,ticker,previous_date,previous_close,current_close,current_volume,source,feed,provenance_json,change_type,retrieved_at,as_of_date)
          VALUES(?,?,?,?,?,?,?,?,?,'INSERT',?,?)`,[td,ticker,pd,pc,cc,cv,source,feed,prov,rt,asof]));
      }else{
        const changed=old.previous_date!==pd||Number(old.previous_close)!==pc||Number(old.current_close)!==cc||Number(old.current_volume)!==cv||old.source!==source||String(old.feed??"")!==String(feed??"")||old.provenance_json!==prov;
        if(changed){
          updated++;
          cur.push(stmt(`UPDATE market_score_breadth_b1_r3_current_v1 SET previous_date=?,previous_close=?,current_close=?,current_volume=?,source=?,feed=?,provenance_json=?,last_seen_at=?,retrieved_at=?,last_as_of_date=? WHERE trade_date=? AND ticker=?`,
            [pd,pc,cc,cv,source,feed,prov,rt,rt,asof,td,ticker]));
          hist.push(stmt(`INSERT INTO market_score_breadth_b1_r3_history_v1(trade_date,ticker,previous_date,previous_close,current_close,current_volume,source,feed,provenance_json,change_type,retrieved_at,as_of_date)
            VALUES(?,?,?,?,?,?,?,?,?,'UPDATE',?,?)`,[td,ticker,pd,pc,cc,cv,source,feed,prov,rt,asof]));
        }else{
          noop++;cur.push(stmt(`UPDATE market_score_breadth_b1_r3_current_v1 SET last_seen_at=?,retrieved_at=?,last_as_of_date=? WHERE trade_date=? AND ticker=?`,[rt,rt,asof,td,ticker]));
        }
      }
    }
    await batch([...cur,...hist]);
    const c=await first(`SELECT COUNT(*) n FROM market_score_breadth_b1_r3_current_v1 WHERE trade_date=?`,[td]);
    return {inserted,updated,noop,validSeen,currentRows:Number(c?.n??0),historyRowsAdded:hist.length};
  }
  async function countForDate(td){const r=await first(`SELECT COUNT(*) n FROM market_score_breadth_b1_r3_current_v1 WHERE trade_date=?`,[date(td,"TRADE_DATE")]);return Number(r?.n??0)}
  async function recordRun(r={}){
    await initialize();const id=text(r.runId??tokenFactory(),"RUN_ID");
    await stmt(`INSERT INTO market_score_breadth_b1_r3_runs_v1(run_id,as_of_date,trade_date,status,started_at,completed_at,provider_requests,collected_rows,inserted_count,updated_count,noop_count,current_rows,history_rows_added,coverage,upstream_ms,storage_write_ms,failure_code,detail_json)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,[
      id,date(r.asOfDate,"AS_OF_DATE"),r.tradeDate?date(r.tradeDate,"TRADE_DATE"):null,text(r.status,"STATUS"),iso(r.startedAt,"STARTED_AT"),iso(r.completedAt,"COMPLETED_AT"),
      Number(r.providerRequests??0),Number(r.collectedRows??0),Number(r.insertedCount??0),Number(r.updatedCount??0),Number(r.noopCount??0),Number(r.currentRows??0),Number(r.historyRowsAdded??0),
      r.coverage==null?null:Number(r.coverage),r.upstreamMs??null,r.storageWriteMs??null,r.failureCode??null,j(r.detail??{}),
    ]).run();return id;
  }
  async function latestSuccessfulRun(asOf=null){return asOf?await first(`SELECT * FROM market_score_breadth_b1_r3_runs_v1 WHERE status='SUCCESS' AND as_of_date=? ORDER BY completed_at DESC LIMIT 1`,[date(asOf,"AS_OF_DATE")]):await first(`SELECT * FROM market_score_breadth_b1_r3_runs_v1 WHERE status='SUCCESS' ORDER BY completed_at DESC LIMIT 1`)}
  async function countRows(){const out={};for(const [k,t] of Object.entries({current:"market_score_breadth_b1_r3_current_v1",history:"market_score_breadth_b1_r3_history_v1",universe:"market_score_breadth_b1_r3_universe_v1",runs:"market_score_breadth_b1_r3_runs_v1"})){const r=await first(`SELECT COUNT(*) n FROM ${t}`);out[k]=Number(r?.n??0)}return out}
  async function acquire(key,{ttlMs=120000}={}){
    await initialize();const k=text(key,"LOCK_KEY"),token=text(tokenFactory(),"LOCK_TOKEN"),d=now() instanceof Date?now():new Date(now()),ni=d.toISOString(),ex=new Date(d.getTime()+ttlMs).toISOString();
    const r=await stmt(`INSERT INTO market_score_breadth_b1_r3_lock_v1(lock_key,token,expires_at) VALUES(?,?,?) ON CONFLICT(lock_key) DO UPDATE SET token=excluded.token,expires_at=excluded.expires_at WHERE market_score_breadth_b1_r3_lock_v1.expires_at<=?`,[k,token,ex,ni]).run();
    return changes(r)>0?{acquired:true,key:k,token,expiresAt:ex}:{acquired:false,key:k,token:null,expiresAt:null};
  }
  async function release(l){if(!l?.acquired||!l?.token)return false;const r=await stmt(`DELETE FROM market_score_breadth_b1_r3_lock_v1 WHERE lock_key=? AND token=?`,[l.key,l.token]).run();return changes(r)>0}
  return {initialize,putUniverse,getUniverse,latestUniverses,existingTickers,getPairs,upsertPairs,countForDate,recordRun,latestSuccessfulRun,countRows,acquire,release};
}
