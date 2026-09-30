const present = value => typeof value === "string" && value.length > 0;

export function inspectEmploymentR6AuthProbe(request) {
  const h = request?.headers;
  const signature = h?.get?.("signature") ?? null;
  const signatureInput = h?.get?.("signature-input") ?? null;
  const signatureAgent = h?.get?.("signature-agent") ?? null;
  const authorization = h?.get?.("authorization") ?? null;
  return Object.freeze({
    status: "OK",
    probeRevision: "EMP-R6-AUTH-PROBE-R1B",
    method: String(request?.method ?? "UNKNOWN").toUpperCase(),
    hasSignature: present(signature),
    hasSignatureInput: present(signatureInput),
    hasSignatureAgent: present(signatureAgent),
    signatureAgentIsChatGPT:
      signatureAgent === "\"https://chatgpt.com\"" ||
      signatureAgent === "https://chatgpt.com",
    hasAuthorization: present(authorization),
  });
}

export const EMPLOYMENT_R6_AUTH_PROBE_CONTRACT = Object.freeze({
  sideEffectFree: true,
  storesRequestHeaders: false,
  returnsHeaderValues: false,
  databaseWrite: false,
  providerCall: false,
  publicMarketScoreWiring: false,
});
