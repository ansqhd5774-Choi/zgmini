import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../../chatgpt-auth";
import { createKfgV2CanaryHandler } from "../../../../worker/kfg-v2-canary.mjs";
import { publicSnapshot } from "../../../../worker/korea-funds.mjs";

// TEMPORARY_KFG_V2_CANARY_ONLY: remove after bounded 5+5 validation.
function handler(request: Request) {
  return createKfgV2CanaryHandler({ authenticate: getChatGPTUser, env, componentReader: () => publicSnapshot(env as any) } as any)(request);
}

export function POST(request: Request) {
  return handler(request);
}

export function GET(request: Request) {
  return handler(request);
}
