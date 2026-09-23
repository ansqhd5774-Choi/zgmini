import { env, waitUntil } from "cloudflare:workers";
import { collectDiagnosticLiveInputs } from "../../../worker/diagnostic-v1-canary.mjs";
import { buildFullDiagnosticOrchestrator } from "../../../lib/diagnostic-layer/full-diagnostic-orchestrator.mjs";
import { createMarketScoreR1Handler } from "../../../worker/market-score-r1.mjs";
import { collectRateR2Inputs } from "../../../lib/market-score/rate-r2-provider.mjs";
import { collectEarningsE1R3ToStore } from "../../../lib/market-score/sec-earnings-e1-r3-provider.mjs";

import { withMarketScoreCache } from "../../../worker/market-score-cache.mjs";

const collectMarketScoreInputs=async(args:any)=>{
  const earningsStoreTask=collectEarningsE1R3ToStore({
    asOf:args?.asOf,
    fetchImpl:args?.fetchImpl??globalThis.fetch,
    db:env?.DB,
  } as any);
  waitUntil(earningsStoreTask.catch(()=>undefined));

  return collectRateR2Inputs({
    base:await collectDiagnosticLiveInputs(args),
    asOf:args?.asOf,
    fetchImpl:args?.fetchImpl??globalThis.fetch,
  } as any);
};
const handler=withMarketScoreCache(createMarketScoreR1Handler({
  env,
  fetchImpl:globalThis.fetch,
  collectInputs:collectMarketScoreInputs,
  orchestrate:buildFullDiagnosticOrchestrator,
} as any), {env,waitUntil});

export async function GET(request:Request){
  const response=await handler(request);
  const headers=new Headers(response.headers);
  headers.set("X-Robots-Tag","noindex");
  return new Response(response.body,{status:response.status,headers});
}
