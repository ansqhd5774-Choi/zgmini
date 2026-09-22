// Public derived responses only. Uses the existing DB binding, no provider data.
export function marketScoreResponseStore(db) {
  if (!db) return undefined;
  const initialize = () => db.prepare(`CREATE TABLE IF NOT EXISTS market_score_response_cache_v1 (
    cache_key TEXT PRIMARY KEY, body TEXT NOT NULL, stored_at INTEGER NOT NULL
  )`).run();
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
      await db.prepare('DELETE FROM market_score_response_cache_v1 WHERE stored_at < ?').bind(storedAt-300000).run();
    },
  };
}
