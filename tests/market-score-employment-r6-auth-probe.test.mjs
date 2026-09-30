import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { inspectEmploymentR6AuthProbe, EMPLOYMENT_R6_AUTH_PROBE_CONTRACT } from "../worker/employment-r6-auth-probe.mjs";

test("safe boolean projection only", () => {
  const req = new Request("https://example.test/api/internal/employment-r6-auth-probe", {
    method: "GET",
    headers: {
      "signature": "secret-signature",
      "signature-input": "secret-input",
      "signature-agent": "\"https://chatgpt.com\"",
      "authorization": "Bearer secret-auth",
    },
  });
  const out = inspectEmploymentR6AuthProbe(req);
  assert.deepEqual(out, {
    status:"OK",
    probeRevision:"EMP-R6-AUTH-PROBE-R1B",
    method:"GET",
    hasSignature:true,
    hasSignatureInput:true,
    hasSignatureAgent:true,
    signatureAgentIsChatGPT:true,
    hasAuthorization:true,
  });
  const s=JSON.stringify(out);
  assert.equal(s.includes("secret-signature"),false);
  assert.equal(s.includes("secret-input"),false);
  assert.equal(s.includes("secret-auth"),false);
});

test("absent headers stay false and side effects are zero", () => {
  const out=inspectEmploymentR6AuthProbe(new Request("https://example.test/",{method:"POST"}));
  assert.equal(out.hasSignature,false);
  assert.equal(out.hasSignatureInput,false);
  assert.equal(out.hasSignatureAgent,false);
  assert.equal(out.signatureAgentIsChatGPT,false);
  assert.equal(out.hasAuthorization,false);
  assert.equal(EMPLOYMENT_R6_AUTH_PROBE_CONTRACT.databaseWrite,false);
  assert.equal(EMPLOYMENT_R6_AUTH_PROBE_CONTRACT.providerCall,false);
});

test("route contains no DB/provider/visitor-auth/logging", () => {
  const src=fs.readFileSync(new URL("../app/api/internal/employment-r6-auth-probe/route.ts",import.meta.url),"utf8");
  assert.doesNotMatch(src,/getChatGPTUser/);
  assert.doesNotMatch(src,/env\.DB|prepare\(|batch\(/);
  assert.doesNotMatch(src,/fetch\s*\(/);
  assert.doesNotMatch(src,/console\.(log|info|warn|error)/);
});
