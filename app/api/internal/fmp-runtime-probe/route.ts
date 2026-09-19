import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../../chatgpt-auth";
import { runFmpRuntimeProbe } from "../../../../worker/fmp-runtime-probe.mjs";

export async function GET() {
  const user = await getChatGPTUser();
  if (!user?.email) return Response.json({ status:"UNAUTHENTICATED", providerRequestCount:0 }, { status:401 });

  const operatorEmail = env.KFG_V2_CANARY_OPERATOR_EMAIL;
  if (!operatorEmail || user.email.toLowerCase() !== String(operatorEmail).toLowerCase()) {
    return Response.json({ status:"FORBIDDEN", providerRequestCount:0 }, { status:403 });
  }

  const result = await runFmpRuntimeProbe({
    apiKey: env.FMP_API_KEY,
    fetchImpl: fetch,
    timeoutMs: 8000,
  });

  const httpStatus = result.status === "SECRET_MISSING" ? 503 : result.status === "FAILED" ? 502 : 200;
  return Response.json({
    ...result,
    probe:"TEMPORARY_FMP_RUNTIME_PROBE_ONLY",
    provider:"Financial Modeling Prep"
  }, { status:httpStatus, headers:{ "cache-control":"no-store" } });
}
