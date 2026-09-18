import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  createCensusRuntimeProbeHandler,
  censusRuntimeProbeContract,
} from "../worker/census-runtime-probe.mjs";

const operator = "owner@example.com";
const fakeSecret = "FAKE_CENSUS_KEY_FOR_TEST_ONLY";

function bodyOf(response) {
  return response.json();
}

test("contract is bounded, read-only, and uses official Census MARTS endpoint", () => {
  assert.equal(
    censusRuntimeProbeContract.endpoint,
    "https://api.census.gov/data/timeseries/eits/marts",
  );
  assert.equal(censusRuntimeProbeContract.queryYear, "2012");
  assert.equal(censusRuntimeProbeContract.maxProviderRequests, 1);
  assert.equal(censusRuntimeProbeContract.retryCount, 0);
  assert.equal(censusRuntimeProbeContract.mutation, false);
  assert.equal(censusRuntimeProbeContract.persistence, false);
});

test("unauthenticated request is rejected before provider call", async () => {
  let calls = 0;
  const handler = createCensusRuntimeProbeHandler({
    authenticate: async () => null,
    env: { CENSUS_API_KEY: fakeSecret, KFG_V2_CANARY_OPERATOR_EMAIL: operator },
    fetchImpl: async () => {
      calls++;
      throw new Error("must not run");
    },
  });
  const response = await handler();
  assert.equal(response.status, 401);
  assert.equal(calls, 0);
  assert.equal((await bodyOf(response)).providerRequestCount, 0);
});

test("non-operator request is rejected before provider call", async () => {
  let calls = 0;
  const handler = createCensusRuntimeProbeHandler({
    authenticate: async () => ({ email: "other@example.com" }),
    env: { CENSUS_API_KEY: fakeSecret, KFG_V2_CANARY_OPERATOR_EMAIL: operator },
    fetchImpl: async () => {
      calls++;
      throw new Error("must not run");
    },
  });
  const response = await handler();
  assert.equal(response.status, 403);
  assert.equal(calls, 0);
});

test("missing Census secret fails closed before provider call", async () => {
  let calls = 0;
  const handler = createCensusRuntimeProbeHandler({
    authenticate: async () => ({ email: operator }),
    env: { KFG_V2_CANARY_OPERATOR_EMAIL: operator },
    fetchImpl: async () => {
      calls++;
      throw new Error("must not run");
    },
  });
  const response = await handler();
  const body = await bodyOf(response);
  assert.equal(response.status, 503);
  assert.equal(calls, 0);
  assert.equal(body.status, "CENSUS_SECRET_MISSING");
  assert.equal(body.secretPresent, false);
});

test("owner success performs one bounded request and never returns secret", async () => {
  let calls = 0;
  let requested = "";
  const handler = createCensusRuntimeProbeHandler({
    authenticate: async () => ({ email: operator }),
    env: { CENSUS_API_KEY: fakeSecret, KFG_V2_CANARY_OPERATOR_EMAIL: operator },
    fetchImpl: async (url) => {
      calls++;
      requested = String(url);
      return new Response(
        JSON.stringify([
          [
            "data_type_code",
            "seasonally_adj",
            "category_code",
            "cell_value",
            "error_data",
            "time",
          ],
          ["SM", "yes", "44X72", "12345", "0", "2012-01"],
        ]),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    },
  });

  const response = await handler();
  const body = await bodyOf(response);
  const url = new URL(requested);

  assert.equal(response.status, 200);
  assert.equal(calls, 1);
  assert.equal(url.origin, "https://api.census.gov");
  assert.equal(url.pathname, "/data/timeseries/eits/marts");
  assert.equal(url.searchParams.get("time"), "2012");
  assert.equal(url.searchParams.get("key"), fakeSecret);
  assert.equal(body.status, "SUCCESS");
  assert.equal(body.keyAccepted, true);
  assert.equal(body.providerRequestCount, 1);
  assert.equal(body.rowsReceived, 1);
  assert.ok(!JSON.stringify(body).includes(fakeSecret));
});

test("provider HTTP failure is reported without upstream body or secret leakage", async () => {
  const handler = createCensusRuntimeProbeHandler({
    authenticate: async () => ({ email: operator }),
    env: { CENSUS_API_KEY: fakeSecret, KFG_V2_CANARY_OPERATOR_EMAIL: operator },
    fetchImpl: async () =>
      new Response(`invalid key ${fakeSecret}`, { status: 400 }),
  });
  const response = await handler();
  const body = await bodyOf(response);
  assert.equal(response.status, 502);
  assert.equal(body.status, "HTTP_ERROR");
  assert.equal(body.httpStatus, 400);
  assert.equal(body.keyAccepted, false);
  assert.ok(!JSON.stringify(body).includes(fakeSecret));
});

test("route uses existing ChatGPT auth and Cloudflare env without UI coupling", () => {
  const source = readFileSync(
    new URL("../app/api/internal/census-runtime-probe/route.ts", import.meta.url),
    "utf8",
  );
  assert.match(source, /cloudflare:workers/);
  assert.match(source, /getChatGPTUser/);
  assert.match(source, /createCensusRuntimeProbeHandler/);
  assert.doesNotMatch(source, /page\.tsx|globals\.css|dashboard-ui/);
});
