import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";

import { planEmploymentR6Collection, runEmploymentR6CollectionStep } from "../lib/market-score/employment-r6-collector.mjs";
import { createEmploymentR6Provider } from "../lib/market-score/employment-r6-provider.mjs";
import { createEmploymentR6Store } from "../lib/market-score/employment-r6-store.mjs";
import { BLS_BED_PUBLIC_API_URL, parseBlsBedShadowRows } from "../lib/market-score/employment-r4-bed-provider.mjs";

const NATIONAL_CLAIMS_XML = "<r539cyNational><week><weekEnded>10/31/2026</weekEnded>"
  + "<InitialClaims><SA>189000</SA><SA4WK>195000</SA4WK></InitialClaims>"
  + "<ContinuedClaims><SA>1900000</SA></ContinuedClaims>"
  + "<IUR><SA>1.2</SA></IUR></week></r539cyNational>";

test("W04 PIT-04-05 BED raw snapshot hashes exactly match stored response and row provenance",async()=>{
  const fetchedBodies=[];
  const provider=createEmploymentR6Provider({
    now:()=>new Date("2026-11-17T00:00:00.000Z"),
    fetchImpl:async (url,options)=>{
      assert.equal(String(url),BLS_BED_PUBLIC_API_URL);
      const request=JSON.parse(options.body);
      const payload={status:"REQUEST_SUCCEEDED",Results:{series:[{
        seriesID:request.seriesid[0],data:[{year:"2025",period:"Q01",value:"1.25",footnotes:[]}]
      }]},responseTime:1};
      // Pretty-printed bytes intentionally differ from the R4 canonical JSON digest.
      const body=JSON.stringify(payload,null,2)+"\n";
      fetchedBodies.push(body);
      return new Response(body,{status:200,headers:{"content-type":"application/json"}});
    },
  });
  const fetched=await provider.fetchGroup("BLS_BED",{mode:"ONE_YEAR",currentYear:2026});
  assert.ok(fetched.snapshots.length>0);
  assert.equal(fetched.snapshots.length,fetchedBodies.length);
  assert.equal(fetched.rows.length,fetched.snapshots.length);
  for(const snapshot of fetched.snapshots){
    const storedHash=createHash("sha256").update(snapshot.body,"utf8").digest("hex");
    assert.equal(snapshot.detail.responseHash,storedHash,"snapshot detail must reference stored raw bytes");
    const canonical=await parseBlsBedShadowRows(JSON.parse(snapshot.body),{
      retrievedAt:snapshot.retrievedAt,requestedSeriesIds:snapshot.detail.seriesid,
    });
    assert.notEqual(canonical.meta.responseHash,storedHash,"R4 canonical digest is not the stored raw HTTP digest");
    const linked=fetched.rows.filter(row=>row.provenance?.responseHash===storedHash);
    assert.equal(linked.length,1,"R6 observation must link to its immutable raw response");
    assert.equal(linked[0].sourceHash,linked[0].provenance.rawRecordHash,
      "per-record canonical revision hash must remain unchanged");
  }
});

test("BACKFILL run history lookup uses persisted mode, not the latest RELEASE run", async () => {
  let select = null;
  const db = {
    prepare(sql) {
      return {
        bind(...values) {
          select = { sql, values };
          return {
            first: async () => ({ status: "SUCCESS", detail_json: '{"mode":"BACKFILL","backfillYear":2026}' }),
          };
        },
        run: async () => ({}),
      };
    },
  };
  const store = createEmploymentR6Store(db, {
    r4StoreFactory: () => ({ initialize: async () => {} }),
  });
  const run = await store.getLatestRunInMode("EMPLOYMENT_R6_BLS_JOLTS", "BACKFILL");
  assert.equal(run.status, "SUCCESS");
  assert.match(select.sql, /json_extract\(detail_json,'\$\.mode'\)=\?/);
  assert.deepEqual(select.values, ["EMPLOYMENT_R6_BLS_JOLTS", "BACKFILL"]);
});

test("BACKFILL planner skips completed groups despite later RELEASE runs and bounds retries", async () => {
  const previous = {
    BLS_EMPLOYMENT_SITUATION: {
      status: "SUCCESS", completed_at: "2026-11-08T01:00:00.000Z",
      detail_json: JSON.stringify({ mode: "BACKFILL", backfillYear: 2026 }),
    },
    BLS_JOLTS: {
      status: "PARTIAL", completed_at: "2026-11-09T01:00:00.000Z",
      detail_json: JSON.stringify({ mode: "BACKFILL", backfillYear: 2026 }),
    },
  };
  const requestedModes = [];
  const store = {
    async initialize() {},
    async getLatestRunInMode(provider, mode) {
      requestedModes.push(mode);
      return previous[provider.replace("EMPLOYMENT_R6_", "")] ?? null;
    },
  };
  const plan = await planEmploymentR6Collection({
    db: { prepare() { return {}; } },
    now: () => new Date("2026-11-09T12:00:00.000Z"), mode: "BACKFILL",
    groups: ["BLS_EMPLOYMENT_SITUATION", "BLS_JOLTS", "BLS_ECI"],
    storeFactory: () => store,
  });
  assert.deepEqual(plan.map(x => [x.groupName, x.due, x.status]), [
    ["BLS_EMPLOYMENT_SITUATION", false, "BACKFILL_ALREADY_COMPLETE"],
    ["BLS_JOLTS", false, "BACKFILL_ALREADY_ATTEMPTED_TODAY"],
    ["BLS_ECI", true, "BACKFILL_DUE"],
  ]);
  assert.deepEqual(requestedModes, ["BACKFILL", "BACKFILL", "BACKFILL"]);

  const retryPlan = await planEmploymentR6Collection({
    db: { prepare() { return {}; } },
    now: () => new Date("2026-11-10T12:00:00.000Z"), mode: "BACKFILL",
    groups: ["BLS_JOLTS"], storeFactory: () => store,
  });
  assert.equal(retryPlan[0].status, "BACKFILL_RETRY_DUE");
  assert.equal(retryPlan[0].due, true);
});

test("ONE_YEAR manual DOL claim remains consumed after a later RELEASE run on the same UTC date",async()=>{
 const calls=[];
 const oneYear={
  status:"PARTIAL",completed_at:"2026-11-16T10:14:15.554Z",
  detail_json:JSON.stringify({mode:"ONE_YEAR",missingSeries:[
   "INITIAL_CLAIMS","INITIAL_CLAIMS_4W","CONTINUED_CLAIMS","INSURED_UNEMPLOYMENT_RATE",
  ]}),
 };
 const laterRelease={
  status:"PARTIAL",completed_at:"2026-11-16T11:10:17.560Z",
  detail_json:JSON.stringify({mode:"RELEASE"}),
 };
 const store={
  async initialize(){},
  async getLatestRun(provider){calls.push(["latest",provider]);return laterRelease;},
  async getLatestRunInMode(provider,mode){
   calls.push(["mode",provider,mode]);
   return mode==="ONE_YEAR"?oneYear:null;
  },
 };
 const db={prepare(){return {};}};
 const now=()=>new Date("2026-11-16T11:27:28.927Z");
 const plan=await planEmploymentR6Collection({
  db,now,mode:"ONE_YEAR",groups:["DOL_UI_WEEKLY_CLAIMS"],storeFactory:()=>store,
 });
 assert.deepEqual(plan.map(x=>({due:x.due,status:x.status})),[
  {due:false,status:"ONE_YEAR_ALREADY_ATTEMPTED"},
 ]);
 assert.deepEqual(calls,[["mode","EMPLOYMENT_R6_DOL_UI_WEEKLY_CLAIMS","ONE_YEAR"]]);
 let providerCalls=0;
 const result=await runEmploymentR6CollectionStep({
  db,now,mode:"ONE_YEAR",groups:["DOL_UI_WEEKLY_CLAIMS"],storeFactory:()=>store,
  providerFactory:()=>({async fetchGroup(){providerCalls++;throw Error("DUPLICATE_PROVIDER_CALL");}}),
 });
 assert.equal(result.status,"NOOP");
 assert.equal(result.providerRequests,0);
 assert.equal(providerCalls,0);
 assert.equal(calls.filter(x=>x[0]==="latest").length,0,"RELEASE must never mask 1Y");
 const nextDay=await planEmploymentR6Collection({
  db,now:()=>new Date("2026-11-17T00:00:00.000Z"),
  mode:"ONE_YEAR",groups:["DOL_UI_WEEKLY_CLAIMS"],storeFactory:()=>store,
 });
 assert.deepEqual(nextDay.map(x=>({due:x.due,status:x.status})),[
  {due:true,status:"ONE_YEAR_DUE"},
 ]);
});

test("BACKFILL does not call BLS provider when remaining R6 quota is insufficient", async () => {
  let providerCalls = 0;
  const store = {
    async initialize() {},
    async getLatestRunInMode() { return null; },
    async getProviderRequestsSince() { return 24; },
  };
  const run = await runEmploymentR6CollectionStep({
    db: { prepare() { return {}; } },
    mode: "BACKFILL", groups: ["BLS_JOLTS"],
    now: () => new Date("2026-11-09T12:00:00.000Z"),
    storeFactory: () => store,
    providerFactory: () => ({ async fetchGroup() { providerCalls++; throw Error("MUST_NOT_FETCH"); } }),
  });
  assert.equal(run.status, "NOOP");
  assert.equal(run.providerRequests, 0);
  assert.equal(providerCalls, 0);
  assert.equal(run.groupResults[0].status, "SKIPPED_BLS_BUDGET");
  assert.equal(run.groupResults[0].usedBlsRequests24h, 24);
  assert.equal(run.groupResults[0].expectedRequests, 2);
});

test("provider calls remain counted when a later raw snapshot DB write fails", async () => {
  const runs = [];
  const store = {
    async initialize() {},
    async getLatestRunInMode() { return null; },
    async acquire() { return { acquired: true }; },
    async release() { return true; },
    async getProviderRequestsSince() { return 0; },
    async writeRawSnapshot() { throw Error("SIMULATED_LOCAL_DB_WRITE_STOP"); },
    async recordRun(run) { runs.push(run); return 1; },
  };
  const result = await runEmploymentR6CollectionStep({
    db: { prepare() { return {}; } },
    mode: "BACKFILL", groups: ["BLS_JOLTS"],
    now: () => new Date("2026-11-09T12:00:00.000Z"),
    storeFactory: () => store,
    providerFactory: () => ({
      async fetchGroup() { return { requestCount: 2, rows: [], snapshots: [{ body: "test" }] }; },
    }),
  });
  assert.equal(result.status, "FAIL");
  assert.equal(result.providerRequests, 2);
  assert.equal(result.groupResults[0].providerRequests, 2);
  assert.equal(runs.length, 1);
  assert.equal(runs[0].providerRequests, 2);
  assert.equal(runs[0].failureCode, "SIMULATED_LOCAL_DB_WRITE_STOP");
});

test("DOL ETA-539 failure preserves valid national claims as a partial group", async () => {
  const fetchedUrls = [];
  const provider = createEmploymentR6Provider({
    fetchImpl: async url => {
      fetchedUrls.push(url);
      if (fetchedUrls.length === 1) {
        return new Response(NATIONAL_CLAIMS_XML, { status: 200 });
      }
      throw Object.assign(Error("SIMULATED_ETA539_UNAVAILABLE"), { code: "SIMULATED_ETA539_UNAVAILABLE" });
    },
    now: () => new Date("2026-11-09T00:00:00.000Z"),
  });
  const fetched = await provider.fetchDolClaims({ mode: "BACKFILL", currentYear: 2026 });
  assert.equal(fetchedUrls.length, 2);
  assert.equal(fetched.requestCount, 2);
  assert.equal(fetched.rows.length, 4);
  assert.equal(fetched.rows.find(x => x.logicalSeriesId === "INITIAL_CLAIMS")?.value, 189000);
  assert.equal(fetched.snapshots.length, 1);
  assert.match(fetched.snapshots[0].requestKey, /^DOL_NATIONAL:/);
  assert.deepEqual(fetched.missingSeries, ["STATE_INITIAL_CLAIMS"]);
  assert.equal(fetched.partialFailureCode, "DOL_ETA539_SOURCE_FAILED");

  const runs = [], savedSnapshots = [], savedRows = [];
  const store = {
    async initialize() {},
    async acquire() { return { acquired: true }; },
    async release() { return true; },
    async writeRawSnapshot(snapshot) {
      savedSnapshots.push(snapshot);
      return { snapshotId: savedSnapshots.length, bodySha256: "test", chunkCount: 1, noop: false };
    },
    async upsertObservationRows({ rows }) {
      savedRows.push(...rows);
      return { inserted: rows.length, revised: 0, noop: 0, rejected: 0 };
    },
    async recordRun(run) { runs.push(run); return 45; },
  };
  const result = await runEmploymentR6CollectionStep({
    db: { prepare() { return {}; } },
    mode: "BACKFILL",
    groups: ["DOL_UI_WEEKLY_CLAIMS"],
    now: () => new Date("2026-11-09T00:00:00.000Z"),
    storeFactory: () => store,
    providerFactory: () => ({ async fetchGroup() { return fetched; } }),
  });
  assert.equal(result.status, "PARTIAL");
  assert.equal(result.groupResults[0].failureCode, "DOL_ETA539_SOURCE_FAILED");
  assert.equal(runs[0].failureCode, "DOL_ETA539_SOURCE_FAILED");
  assert.equal(savedSnapshots.length, 1);
  assert.equal(savedRows.length, 4);
});

test("DOL National and ETA539 both failing never create state-only success or raw", async () => {
  let requested = 0;
  const provider = createEmploymentR6Provider({
    fetchImpl: async () => { requested++; return new Response("", { status: 503 }); },
    now: () => new Date("2026-11-09T00:00:00.000Z"),
  });
  const fetched=await provider.fetchDolClaims({ mode: "BACKFILL", currentYear: 2026 });
  // Both independent sources are attempted once; neither is treated as success.
  assert.equal(requested,2);
  assert.equal(fetched.requestCount,2);
  assert.equal(fetched.partialFailureCode,"DOL_NATIONAL_HTTP_FAILED");
  assert.equal(fetched.nationalResponseEvidence.httpStatus,503);
  assert.deepEqual(fetched.rows,[]);
  assert.deepEqual(fetched.snapshots,[]);
  assert.deepEqual(fetched.missingSeries,[
    "INITIAL_CLAIMS","INITIAL_CLAIMS_4W","CONTINUED_CLAIMS",
    "INSURED_UNEMPLOYMENT_RATE","STATE_INITIAL_CLAIMS",
  ]);
});

test("a syntactically successful provider response with zero rows is PARTIAL, never a completed release", async () => {
  const runs = [];
  const store = {
    async initialize() {},
    async acquire() { return { acquired: true }; },
    async release() { return true; },
    async upsertObservationRows({ rows }) {
      assert.deepEqual(rows, []);
      return { inserted: 0, revised: 0, noop: 0, rejected: 0 };
    },
    async recordRun(run) { runs.push(run); return 42; },
  };
  const result = await runEmploymentR6CollectionStep({
    db: { prepare() { return {}; } },
    mode: "BACKFILL",
    groups: ["DOL_UI_WEEKLY_CLAIMS"],
    now: () => new Date("2026-11-02T00:00:00Z"),
    storeFactory: () => store,
    providerFactory: () => ({
      async fetchGroup() { return { rows: [], snapshots: [], requestCount: 2, missingSeries: [] }; },
    }),
  });
  assert.equal(result.status, "PARTIAL");
  assert.equal(result.groupResults[0].status, "PARTIAL");
  assert.equal(result.groupResults[0].failureCode, "NO_OBSERVATIONS");
  assert.equal(result.groupResults[0].collectedRows, 0);
  assert.equal(runs.length, 1);
  assert.equal(runs[0].status, "PARTIAL");
  assert.equal(runs[0].failureCode, "NO_OBSERVATIONS");
  assert.equal(runs[0].detail.publicOutput, false);
});


test("DOL release never records stale initial-claims observations as SUCCESS", async () => {
  const runWithDate = async observationDate => {
    const runs = [];
    const store = {
      async initialize() {},
      async getLatestRun() { return null; },
      async acquire() { return { acquired: true }; },
      async release() { return true; },
      async upsertObservationRows({ rows }) { return { inserted: rows.length, revised: 0, noop: 0, rejected: 0 }; },
      async recordRun(run) { runs.push(run); return 43; },
    };
    const ids = ["INITIAL_CLAIMS", "INITIAL_CLAIMS_4W", "CONTINUED_CLAIMS", "INSURED_UNEMPLOYMENT_RATE"];
    const result = await runEmploymentR6CollectionStep({
      db: { prepare() { return {}; } },
      mode: "RELEASE",
      groups: ["DOL_UI_WEEKLY_CLAIMS"],
      now: () => new Date("2026-11-06T00:00:00Z"),
      storeFactory: () => store,
      providerFactory: () => ({
        async fetchGroup() { return { rows: ids.map(logicalSeriesId => ({ logicalSeriesId, observationDate })), snapshots: [], requestCount: 2, missingSeries: [] }; },
      }),
    });
    return { result, run: runs[0] };
  };
  const stale = await runWithDate("2026-10-10");
  assert.equal(stale.result.groupResults[0].status, "PARTIAL");
  assert.equal(stale.result.groupResults[0].failureCode, "DOL_RELEASE_OBSERVATION_STALE");
  assert.equal(stale.run.failureCode, "DOL_RELEASE_OBSERVATION_STALE");
  assert.equal(stale.run.detail.latestInitialClaimsObservationDate, "2026-10-10");
  const current = await runWithDate("2026-10-31");
  assert.equal(current.result.groupResults[0].status, "SUCCESS");
  assert.equal(current.run.detail.latestInitialClaimsObservationDate, "2026-10-31");
  assert.equal(current.run.detail.releaseAt, "2026-11-05T13:30:00.000Z");
});

test("DOL national HTTP200 non-XML never overwrites valid raw, state 51 is preserved",async()=>{
 const states=[
  "AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL",
  "IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE",
  "NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
 ];
 assert.equal(states.length,51);
 const csv=["st,rptdate,c1,c2,c3,c8",
  ...states.map(st=>st+",10/31/2026,1,10/24/2026,300,2000")].join("\n");
 let calls=0;
 const provider=createEmploymentR6Provider({
  fetchImpl:async()=>{
   calls++;
   return new Response(calls===1?"<html>Unable to connect! Database temporarily unavailable</html>":csv,{status:200});
  },
  now:()=>new Date("2026-11-15T00:00:00.000Z"),
 });
 const result=await provider.fetchDolClaims({mode:"BACKFILL",currentYear:2026});
 assert.equal(calls,2,"no unapproved retry");
 assert.equal(result.requestCount,2);
 assert.deepEqual(result.missingSeries,[
  "INITIAL_CLAIMS","INITIAL_CLAIMS_4W","CONTINUED_CLAIMS","INSURED_UNEMPLOYMENT_RATE",
 ]);
 assert.equal(result.partialFailureCode,"DOL_NATIONAL_RESPONSE_FORMAT_UNSUPPORTED");
 assert.equal(result.rows.length,51,"valid ETA539 rows must survive national failure");
 assert.equal(result.snapshots.length,1,"HTTP200 HTML must not replace good national raw");
 assert.match(result.snapshots[0].requestKey,/^DOL_ETA539:/);
 assert.ok(result.snapshots.every(item=>!item.body.includes("Unable to connect")));
 const savedRows=[],savedSnapshots=[],runs=[];
 const store={
  async initialize(){},async acquire(){return {acquired:true}},async release(){},
  async writeRawSnapshot(s){
   savedSnapshots.push(s);
   return {snapshotId:1,bodySha256:"safe",chunkCount:1,noop:false};
  },
  async upsertObservationRows({rows}){
   savedRows.push(...rows);
   return {inserted:rows.length,revised:0,noop:0,rejected:0};
  },
  async recordRun(run){runs.push(run);return 12},
 };
 const output=await runEmploymentR6CollectionStep({
  db:{prepare(){return {}}},mode:"BACKFILL",groups:["DOL_UI_WEEKLY_CLAIMS"],
  now:()=>new Date("2026-11-15T00:00:00.000Z"),storeFactory:()=>store,
  providerFactory:()=>({async fetchGroup(){return result}}),
 });
 assert.equal(output.status,"PARTIAL");
 assert.equal(output.groupResults[0].failureCode,"DOL_NATIONAL_RESPONSE_FORMAT_UNSUPPORTED");
 assert.equal(runs[0].failureCode,"DOL_NATIONAL_RESPONSE_FORMAT_UNSUPPORTED");
 assert.equal(savedSnapshots.length,1);
 assert.equal(savedRows.length,51);
 assert.equal(savedRows.some(row=>row.logicalSeriesId==="INITIAL_CLAIMS"),false);
 assert.equal(output.publicOutput,false);
});

test("DOL national empty XML cannot overwrite old valid snapshot; valid XML unchanged",async()=>{
 const fetchFrom=national=>{
  let calls=0;
  const provider=createEmploymentR6Provider({
   fetchImpl:async()=>{
    calls++;
    if(calls===1)return new Response(national,{status:200});
    throw Error("ETA_TEMPORARY_UNAVAILABLE");
   },
   now:()=>new Date("2026-11-15T00:00:00.000Z"),
  });
  return provider.fetchDolClaims({mode:"RELEASE",currentYear:2026});
 };
 const bad=await fetchFrom("<r539cyNational></r539cyNational>");
 assert.equal(bad.snapshots.length,0);
 assert.equal(bad.partialFailureCode,"DOL_NATIONAL_NO_VALID_ROWS");
 assert.equal(bad.requestCount,2);
 const good=await fetchFrom(NATIONAL_CLAIMS_XML);
 assert.equal(good.snapshots.length,1);
 assert.equal(good.partialFailureCode,"DOL_ETA539_SOURCE_FAILED");
 assert.equal(good.rows.length,4);
});
