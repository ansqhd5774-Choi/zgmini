import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '../../../chatgpt-auth';
import { createDiagnosticV1CanaryHandler } from '../../../../worker/diagnostic-v1-canary.mjs';

// TEMPORARY_DIAGNOSTIC_V1_CANARY_ONLY
// Read-only runtime verification. Public /api/market-data contract is intentionally untouched.
// Reuse the existing operator allowlist binding; no new secret or infrastructure is introduced.
const handler = createDiagnosticV1CanaryHandler({
  authenticate: getChatGPTUser,
  env,
  fetchImpl: globalThis.fetch,
} as any);

export function POST(request: Request) {
  return handler(request);
}

export function GET(request: Request) {
  return handler(request);
}
