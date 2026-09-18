import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../../chatgpt-auth";
import { createKfgRev7CanaryHandler } from "../../../../worker/kfg-rev7-canary.mjs";

// TEMPORARY_KFG_REV7_CANARY_ONLY: bounded owner-only runtime validation.
function handler(request: Request) {
  return createKfgRev7CanaryHandler({
    authenticate: getChatGPTUser,
    env,
  } as any)(request);
}

export function POST(request: Request) {
  return handler(request);
}

export function GET(request: Request) {
  return handler(request);
}
