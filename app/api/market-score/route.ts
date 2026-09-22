import { env } from "cloudflare:workers";
import { collectDiagnosticLiveInputs } from "../../../worker/diagnostic-v1-canary.mjs";
import { buildFullDiagnosticOrchestrator } from "../../../lib/diagnostic-layer/full-diagnostic-orchestrator.mjs";
import { createMarketScoreR1Handler } from "../../../worker/market-score-r1.mjs";

const handler=createMarketScoreR1Handler({
  env,
  fetchImpl:globalThis.fetch,
  collectInputs:collectDiagnosticLiveInputs,
  orchestrate:buildFullDiagnosticOrchestrator,
} as any);

export function GET(request:Request){
  return handler(request);
}
