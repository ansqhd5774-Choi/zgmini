import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../../chatgpt-auth";
import { createKfgV2CanaryHandler } from "../../../../worker/kfg-v2-canary.mjs";

// TEMPORARY_KFG_V2_CANARY_ONLY: remove after bounded 5+5 validation.
function handler(request: Request) {
  return createKfgV2CanaryHandler({ authenticate: getChatGPTUser, env } as any)(request);
}

export function POST(request: Request) {
  return handler(request);
}

export function GET(request: Request) {
  return handler(request);
}
