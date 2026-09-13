import { env } from 'cloudflare:workers';
import { createKfgV2PostcheckHandler } from '../../../worker/kfg-v2-postcheck.mjs';
import { publicSnapshot } from '../../../worker/korea-funds.mjs';

// Public read-only Research V2 summary. A bounded date window is required;
// productionEligible remains false and no provider or D1 write path is reachable.
const handler = (request: Request) => createKfgV2PostcheckHandler({
  env,
  publicAccess: true,
  componentReader: () => publicSnapshot(env as any),
})(request);

export function GET(request: Request) { return handler(request); }
export function POST() { return Response.json({temporary: 'KFG_V2_RESEARCH_READ_ONLY', error: 'METHOD_NOT_ALLOWED'}, {status: 405}); }
