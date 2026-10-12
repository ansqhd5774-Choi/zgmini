import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("CFO import CMD is local-only, validates output, and chains the read-only Forward audit",()=>{
  const source=fs.readFileSync(new URL("../ZGMINI_EARNINGS_R5_CFO_IMPORT.cmd",import.meta.url),"utf8");
  assert.match(source,/earnings-r5-cfo-survey-local-import-r2\.mjs/i);
  assert.match(source,/ZGMINI_EARNINGS_R5_FORWARD_AUDIT\.cmd/i);
  assert.match(source,/cfo-survey-r1\\releases\.json/i);
  assert.match(source,/--file=/i);
  assert.match(source,/--source-url=/i);
  assert.match(source,/--survey-year=/i);
  assert.match(source,/--survey-quarter=/i);
  assert.match(source,/--release-at=/i);
  assert.match(source,/NETWORK 0 \/ DB WRITE 0 \/ PRODUCTION OFF/i);
  assert.doesNotMatch(source,/\bcurl\b|powershell|\bwsl\b|wrangler|--publish/i);
});

test("CFO import CMD requires an existing local HTML source instead of downloading provider data",()=>{
  const source=fs.readFileSync(new URL("../ZGMINI_EARNINGS_R5_CFO_IMPORT.cmd",import.meta.url),"utf8");
  assert.match(source,/if not exist "%SOURCE_FILE%"/i);
  assert.match(source,/source HTML must already exist locally/i);
  assert.match(source,/does not download provider data/i);
});
