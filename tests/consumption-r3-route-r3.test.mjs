import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const route=fs.readFileSync("app/api/internal/c1-r3-refresh/route.ts","utf8");
const refresh=fs.readFileSync("worker/consumption-r3-operational-refresh.mjs","utf8");

test("R3 route is an internal authenticated POST wrapper and does not use waitUntil",()=>{
  assert.match(route,/createConsumptionR3ExternalSchedulerHandler/);
  assert.match(route,/export function POST/);
  assert.match(route,/export function GET/);
  assert.doesNotMatch(route,/waitUntil\s*\(/);
});

test("R3 operational contract names external authenticated HTTP as primary",()=>{
  assert.match(refresh,/operationalRevision:"C1-OP-R3"/);
  assert.match(refresh,/primaryTrigger:"AUTHENTICATED_EXTERNAL_HTTP_SCHEDULER"/);
  assert.match(refresh,/externalRoute:"\/api\/internal\/c1-r3-refresh"/);
  assert.match(refresh,/externalMaxSourcesPerInvocation:1/);
});
