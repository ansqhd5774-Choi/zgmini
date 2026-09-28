import { env, waitUntil } from "cloudflare:workers";
import { collectDiagnosticLiveInputs } from "../../../worker/diagnostic-v1-canary.mjs";
import { buildFullDiagnosticOrchestrator } from "../../../lib/diagnostic-layer/full-diagnostic-orchestrator.mjs";
import { createMarketScoreR1Handler } from "../../../worker/market-score-r1.mjs";
import { collectRateR2Inputs } from "../../../lib/market-score/rate-r2-provider.mjs";
import { collectBreadthB1R3StoreOnlyR1, readBreadthB1R3StoredPublicDomainR1 } from "../../../lib/market-score/breadth-b1-r3-worker-domain.mjs";
import { collectInflationR2StoreOnly } from "../../../worker/inflation-r2-collector.mjs";
import { collectEarningsE1R4ToStore } from "../../../lib/market-score/sec-earnings-e1-r4-provider.mjs";

import { withMarketScoreCache } from "../../../worker/market-score-cache.mjs";
import { runConsumptionR3OperationalRefresh } from "../../../worker/consumption-r3-operational-refresh.mjs";

import {streamMarketScore} from "../../../worker/market-score-stream.mjs";
import {collectProgressiveMarketInputs} from "../../../worker/market-score-progressive-inputs.mjs";
const collectMarketScoreInputs=(args:any)=>collectProgressiveMarketInputs(args,{
  collectBase:collectDiagnosticLiveInputs,
  collectRates:collectRateR2Inputs,
});
const handler=withMarketScoreCache(createMarketScoreR1Handler({
  env,
  fetchImpl:globalThis.fetch,
  collectInputs:collectMarketScoreInputs,
  orchestrate:buildFullDiagnosticOrchestrator,
  collectBreadthDomain:readBreadthB1R3StoredPublicDomainR1,
} as any), {env,waitUntil});

export async function GET(request:Request){
  const asOf=new Date().toISOString().slice(0,10);
  const earningsStoreTask=collectEarningsE1R4ToStore({
    asOf,
    fetchImpl:globalThis.fetch,
    db:env?.DB,
  } as any);
  waitUntil(earningsStoreTask.catch(()=>undefined));
  // C1_R3_OPERATIONAL_REFRESH_WAITUNTIL: bounded, stored-first quarterly refresh.
  waitUntil(
    Promise.resolve()
      .then(()=>runConsumptionR3OperationalRefresh({env,asOf,fetchImpl:globalThis.fetch}))
      .catch(()=>null),
  );
  waitUntil(
    Promise.resolve()
      .then(()=>collectBreadthB1R3StoreOnlyR1({env,asOf,fetchImpl:globalThis.fetch}))
      .catch(()=>null),
  );
  waitUntil(
    Promise.resolve()
      .then(()=>collectInflationR2StoreOnly({env,asOf,fetchImpl:globalThis.fetch}))
      .catch(()=>null),
  );
  const response=request.headers.get('accept')?.includes('application/x-ndjson')
    ? streamMarketScore(handler,request,{waitUntil})
    : await handler(request);
  const headers=new Headers(response.headers);
  headers.set("X-Robots-Tag","noindex");
  return new Response(response.body,{status:response.status,headers});
}
