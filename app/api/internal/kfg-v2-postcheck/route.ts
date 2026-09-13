import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '../../../../chatgpt-auth';
import { createKfgV2PostcheckHandler } from '../../../../worker/kfg-v2-postcheck.mjs';

// TEMPORARY_KFG_V2_POSTCHECK_ONLY: read-only verification of already-persisted KFG-V2 data.
const handler = createKfgV2PostcheckHandler({authenticate: getChatGPTUser, env} as any);

export function GET(request: Request) {
  return handler(request);
}

export function POST(request: Request) {
  return handler(request);
}
