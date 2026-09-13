import { env } from 'cloudflare:workers';
import { createKfgV2PostcheckHandler } from '../../../worker/kfg-v2-postcheck.mjs';
import { publicSnapshot } from '../../../worker/korea-funds.mjs';
import { D1KoreaMarketHistoryStore } from '../../../worker/korea-market-d1.mjs';

// Public read-only Research V2 summary. Unbounded reads use the incremental
// latest warm-up window; explicit from/to remains available for bounded audit.
// productionEligible remains false and no provider or D1 write path is reachable.
const handler = (request: Request) => createKfgV2PostcheckHandler({
  env,
  publicAccess: true,
  snapshotReader: (db: any) => new D1KoreaMarketHistoryStore(db).getLatestResearchSnapshot(),
  componentReader: () => publicSnapshot(env as any),
} as any)(request);

export function GET(request: Request) { return handler(request); }
export function POST() { return Response.json({temporary: 'KFG_V2_RESEARCH_READ_ONLY', error: 'METHOD_NOT_ALLOWED'}, {status: 405}); }
