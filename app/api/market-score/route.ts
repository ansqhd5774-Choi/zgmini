import { env, waitUntil } from "cloudflare:workers";
import { collectDiagnosticLiveInputs } from "../../../worker/diagnostic-v1-canary.mjs";
import { buildFullDiagnosticOrchestrator } from "../../../lib/diagnostic-layer/full-diagnostic-orchestrator.mjs";
import { createMarketScoreR1Handler } from "../../../worker/market-score-r1.mjs";

import { withMarketScoreCache } from "../../../worker/market-score-cache.mjs";

const handler=withMarketScoreCache(createMarketScoreR1Handler({
  env,
  fetchImpl:globalThis.fetch,
  collectInputs:collectDiagnosticLiveInputs,
  orchestrate:buildFullDiagnosticOrchestrator,
} as any), {env,waitUntil});

export async function GET(request:Request){
  const response=await handler(request);
  const headers=new Headers(response.headers);
  headers.set("X-Robots-Tag","noindex");
  return new Response(response.body,{status:response.status,headers});
}
