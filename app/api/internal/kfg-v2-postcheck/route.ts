import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '../../../chatgpt-auth';
import { createKfgV2PostcheckHandler } from '../../../../worker/kfg-v2-postcheck.mjs';
import { publicSnapshot } from '../../../../worker/korea-funds.mjs';

// TEMPORARY_KFG_V2_POSTCHECK_ONLY: read-only verification of already-persisted KFG-V2 data.
// Defer binding validation until this internal route is actually invoked. The
// homepage worker must still boot when a test/runtime harness omits D1.
const handler = (request: Request) =>
  createKfgV2PostcheckHandler({authenticate: getChatGPTUser, env,
    componentReader: () => publicSnapshot(env as any)} as any)(request);

export function GET(request: Request) {
  return handler(request);
}

export function POST(request: Request) {
  return handler(request);
}
