import { env } from "cloudflare:workers";
import { collectDiagnosticLiveInputs } from "../../../worker/diagnostic-v1-canary.mjs";
import { buildFullDiagnosticOrchestrator } from "../../../lib/diagnostic-layer/full-diagnostic-orchestrator.mjs";
import { createMarketScoreR1Handler } from "../../../worker/market-score-r1.mjs";

import { withMarketScoreCache } from "../../../worker/market-score-cache.mjs";

const handler=withMarketScoreCache(createMarketScoreR1Handler({
  env,
  fetchImpl:globalThis.fetch,
  collectInputs:collectDiagnosticLiveInputs,
  orchestrate:buildFullDiagnosticOrchestrator,
} as any), {env});

export function GET(request:Request){
  return handler(request);
}
