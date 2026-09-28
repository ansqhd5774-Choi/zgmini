// Public derived responses only. Uses the existing DB binding, no provider data.
const finiteScore=value=>typeof value==="number"&&Number.isFinite(value)&&value>=0&&value<=100;
const validDate=value=>typeof value==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(value);
const LIQUIDITY_HISTORY_METHOD="DIAGNOSTIC_SCORE_TRANSFORM_R1";

function liquidityHistoryRow(body,storedAt){
  try{
    const parsed=JSON.parse(body);
    const domain=Array.isArray(parsed?.domains)
      ? parsed.domains.find(item=>item?.id==="liquidity")
      : null;
    if(
      parsed?.status!=="SUCCESS"
      || !validDate(parsed?.asOfDate)
      || domain?.status!=="READY"
      || !finiteScore(domain?.score)
      || (domain?.methodologyVersion??LIQUIDITY_HISTORY_METHOD)!==LIQUIDITY_HISTORY_METHOD
    )return null;
    return {
      asOfDate:parsed.asOfDate,
      score:domain.score,
      storedAt:Number.isFinite(storedAt)?storedAt:Date.now(),
    };
  }catch{
    return null;
  }
}

export function marketScoreResponseStore(db) {
  if (!db) return undefined;
  let initialized;
  const initialize = () => initialized ??= Promise.all([
    db.prepare(`CREATE TABLE IF NOT EXISTS market_score_response_cache_v1 (
      cache_key TEXT PRIMARY KEY, body TEXT NOT NULL, stored_at INTEGER NOT NULL
    )`).run(),
    db.prepare(`CREATE TABLE IF NOT EXISTS market_liquidity_active_history_v1 (
      as_of_date TEXT NOT NULL,
      methodology_version TEXT NOT NULL,
      score REAL NOT NULL,
      stored_at INTEGER NOT NULL,
      PRIMARY KEY(as_of_date, methodology_version)
    )`).run(),
  ]).catch(error=>{initialized=null;throw error;});
  return {
    async match(request) {
      await initialize();
      const row = await db.prepare('SELECT body, stored_at FROM market_score_response_cache_v1 WHERE cache_key = ?')
        .bind(request.url).first();
      if (!row) return undefined;
      return new Response(row.body, {headers:{'content-type':'application/json',
        'x-content-type-options':'nosniff','x-market-cache-stored-at':String(row.stored_at)}});
    },
    async put(request, response) {
      await initialize();
      const storedAt=Number(response.headers.get('x-market-cache-stored-at'));
      const body=await response.text();
      await db.prepare('INSERT INTO market_score_response_cache_v1(cache_key,body,stored_at) VALUES(?,?,?) ON CONFLICT(cache_key) DO UPDATE SET body=excluded.body,stored_at=excluded.stored_at')
        .bind(request.url,body,storedAt).run();

      const liquidity=liquidityHistoryRow(body,storedAt);
      if(liquidity){
        await db.prepare(`INSERT INTO market_liquidity_active_history_v1(
          as_of_date,methodology_version,score,stored_at
        ) VALUES(?,?,?,?)
        ON CONFLICT(as_of_date,methodology_version)
        DO UPDATE SET score=excluded.score,stored_at=excluded.stored_at`)
          .bind(liquidity.asOfDate,LIQUIDITY_HISTORY_METHOD,liquidity.score,liquidity.storedAt).run();
      }

      await db.prepare('DELETE FROM market_score_response_cache_v1 WHERE stored_at < ?').bind(storedAt-300000).run();
    },
  };
}
