import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../../chatgpt-auth";
import { createCensusRuntimeProbeHandler } from "../../../../worker/census-runtime-probe.mjs";

// TEMPORARY_CENSUS_RUNTIME_PROBE_ONLY:
// owner-only, read-only validation of Sites Hosted Secret injection and
// one bounded U.S. Census Bureau API request. No DB writes or UI changes.
const handler = createCensusRuntimeProbeHandler({
  authenticate: getChatGPTUser,
  env,
} as any);

export function GET() {
  return handler();
}
