import {env} from 'cloudflare:workers';
import {latestCompletedSession} from '../../../../lib/market-score/breadth-b1-r3-calendar.mjs';
import {US_BREADTH_DAILY_KEY_PREFIX} from '../../../../lib/market-breadth/us-public-r1.mjs';
import {selectVerifiedUsBreadthHistory, US_BREADTH_HISTORY_MAX_DAYS, usBreadthHistoryWindow} from '../../../../lib/market-breadth/history-public-r2.mjs';

/** One-year read-only history, using only previously verified US daily snapshots. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get('market') !== 'usa')
    return Response.json({reason: 'MARKET_NOT_AVAILABLE'}, {status: 404});

  const window = usBreadthHistoryWindow(latestCompletedSession(new Date()));
  let rows: Array<{snapshot_key: string; body: string; stored_at: number}>;
  try {
    const response = await env.DB.prepare(
      'SELECT snapshot_key, body, stored_at FROM market_public_snapshots_v1 WHERE snapshot_key >= ? AND snapshot_key <= ? ORDER BY snapshot_key DESC LIMIT ?'
    ).bind(
      `${US_BREADTH_DAILY_KEY_PREFIX}${window.from}`,
      `${US_BREADTH_DAILY_KEY_PREFIX}${window.to}`,
      US_BREADTH_HISTORY_MAX_DAYS
    ).all();
    rows = response.results as typeof rows;
  } catch {
    return Response.json({reason: 'STORED_HISTORY_UNAVAILABLE'}, {status: 503, headers: {'Cache-Control': 'no-store'}});
  }

  return Response.json({
    market: 'usa',
    universe: 'SP500',
    window: '1Y',
    ...window,
    records: selectVerifiedUsBreadthHistory(rows, window),
  }, {headers: {'Cache-Control': 'no-store'}});
}
