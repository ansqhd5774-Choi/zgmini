import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";

import { runEmploymentR6CollectionStep } from "../lib/market-score/employment-r6-collector.mjs";
import { createEmploymentR6Provider, parseDolNationalClaimsXml } from "../lib/market-score/employment-r6-provider.mjs";
import { BLS_BED_PUBLIC_API_URL, parseBlsBedShadowRows } from "../lib/market-score/employment-r4-bed-provider.mjs";

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
  assert.equal(result.groupResults[0].collectedRows, 0);
  assert.equal(runs.length, 1);
  assert.equal(runs[0].status, "PARTIAL");
  assert.equal(runs[0].failureCode, "NO_OBSERVATIONS");
  assert.equal(runs[0].detail.publicOutput, false);
});


// W04_NATIONAL_XML_PER_SERIES_PIT_20261119
const nationalWeek = (date, initial, previous = true) =>
  '<week source="r539cy"><weekEnded>'+date+'</weekEnded>'+
  '<InitialClaims><SA>'+initial+'</SA><SA4WK>195250</SA4WK></InitialClaims>'+
  (previous ? '<ContinuedClaims><SA>1900000</SA></ContinuedClaims><IUR><SA>1.2</SA></IUR>' : '')+
  '</week>';

test("W04 attributed XML week and per-series lag preserve forward PIT availability", () => {
  const retrievedAt="2026-11-12T14:00:00.000Z";
  const releaseAt="2026-11-12T13:30:00.000Z";
  const xml='<r539cyNational>'+
    nationalWeek("10/31/2026",191000)+nationalWeek("11/07/2026",200000,false)+
    '</r539cyNational>';
  const rows=parseDolNationalClaimsXml(xml,{retrievedAt,releaseAt});
  assert.equal(rows.length,6);
  const last=new Map([
    ["INITIAL_CLAIMS","2026-11-07"],
    ["INITIAL_CLAIMS_4W","2026-11-07"],
    ["CONTINUED_CLAIMS","2026-10-31"],
    ["INSURED_UNEMPLOYMENT_RATE","2026-10-31"],
  ]);
  for (const [series,date] of last) {
    const bySeries=rows.filter(r=>r.logicalSeriesId===series);
    const newest=bySeries.filter(r=>r.availableAt===retrievedAt);
    assert.equal(newest.length,1,series);
    assert.equal(newest[0].observationDate,date);
    assert.equal(newest[0].releaseDate,releaseAt);
    assert.equal(newest[0].qualityStatus,"READY_FORWARD");
    for (const earlier of bySeries.filter(r=>r.observationDate!==date)) {
      assert.equal(earlier.availableAt,null);
      assert.equal(earlier.releaseDate,null);
    }
  }
  assert.equal(rows.filter(r=>r.availableAt===retrievedAt).length,4);
});

test("W04 invalid February XML week never rolls into a fabricated observation", () => {
  const xml='<r539cyNational>'+
    nationalWeek("02/30/2026",999999)+
    nationalWeek("02/28/2026",188000)+
    '</r539cyNational>';
  const rows=parseDolNationalClaimsXml(xml,{retrievedAt:"2026-03-05T13:30:00.000Z"});
  assert.equal(rows.length,4);
  assert.deepEqual([...new Set(rows.map(r=>r.observationDate))],["2026-02-28"]);
});


test("W04 XML missing national values are absent, never coerced to zero", () => {
  const xml='<r539cyNational><week source="r539cy">'+
    '<weekEnded>11/07/2026</weekEnded>'+
    '<InitialClaims><SA></SA><SA4WK> </SA4WK></InitialClaims>'+
    '</week></r539cyNational>';
  const rows=parseDolNationalClaimsXml(xml,{retrievedAt:"2026-11-12T14:00:00.000Z"});
  assert.deepEqual(rows,[]);
});


test("W04 true numeric zero remains a valid claim value", () => {
  const xml='<r539cyNational><week source="r539cy">'+
    '<weekEnded>11/07/2026</weekEnded>'+
    '<InitialClaims><SA>0</SA><SA4WK>0</SA4WK></InitialClaims>'+
    '</week></r539cyNational>';
  const rows=parseDolNationalClaimsXml(xml,{retrievedAt:"2026-11-12T14:00:00.000Z"});
  assert.deepEqual(rows.map(row=>row.value),[0,0]);
});


test("W04 DOL release only succeeds when all four national series meet their own reporting lags", async () => {
  const run = async (continuedDate) => {
    const recorded = [];
    const store = {
      async initialize() {},
      async getLatestRun() { return null; },
      async acquire() { return { acquired: true }; },
      async release() { return true; },
      async writeRawSnapshot() { return { snapshotId: 1, bodySha256: "x", chunkCount: 1, noop: false }; },
      async upsertObservationRows() { return { inserted: 4, revised: 0, noop: 0, rejected: 0 }; },
      async recordRun(entry) { recorded.push(entry); return 101; },
    };
    const dates = {
      INITIAL_CLAIMS: "2026-11-14",
      INITIAL_CLAIMS_4W: "2026-11-14",
      CONTINUED_CLAIMS: continuedDate,
      INSURED_UNEMPLOYMENT_RATE: continuedDate,
    };
    const result = await runEmploymentR6CollectionStep({
      db: { prepare() { return {}; } },
      now: () => new Date("2026-11-19T15:00:00Z"),
      groups: ["DOL_UI_WEEKLY_CLAIMS"],
      storeFactory: () => store,
      providerFactory: () => ({
        async fetchGroup() {
          return {
            requestCount: 2,
            missingSeries: [],
            snapshots: [],
            rows: Object.entries(dates).map(([logicalSeriesId, observationDate]) => ({
              logicalSeriesId, observationDate, value: 1,
            })),
          };
        },
      }),
    });
    return { result, recorded };
  };
  const stale = await run("2026-10-24");
  assert.equal(stale.result.groupResults[0].status, "PARTIAL");
  assert.equal(stale.result.groupResults[0].failureCode, "DOL_RELEASE_OBSERVATION_STALE");
  assert.equal(stale.recorded[0].detail.latestInitialClaimsObservationDate, "2026-11-14");
  assert.equal(stale.recorded[0].detail.latestNationalSeriesObservationDates.CONTINUED_CLAIMS, "2026-10-24");

  const fresh = await run("2026-11-07");
  assert.equal(fresh.result.groupResults[0].status, "SUCCESS");
  assert.equal(fresh.recorded[0].failureCode, null);
});


test("W04 RELEASE reuses previously verified same-release PDF but never a stale or partial source",async()=>{
  const fresh={
    sourceReleaseDate:"2026-11-19",rawSnapshotId:"a".repeat(64),
    originalPdfSha256:"b".repeat(64),
    latestNationalSeriesObservationDates:{
      INITIAL_CLAIMS:"2026-11-14",INITIAL_CLAIMS_4W:"2026-11-14",
      CONTINUED_CLAIMS:"2026-11-07",INSURED_UNEMPLOYMENT_RATE:"2026-11-07",
    },
  };
  async function run(stored,{missingState=false}={}){
    const runs=[],requested=[];
    const store={
      async initialize(){},async getLatestRun(){return null;},
      async acquire(){return {acquired:true};},async release(){},
      async upsertObservationRows(){return {inserted:0,revised:0,noop:5,rejected:0};},
      async getVerifiedStoredDolNationalRelease(release){requested.push(release);return stored;},
      async recordRun(entry){runs.push(entry);return 42;},
    };
    const result=await runEmploymentR6CollectionStep({
      db:{prepare(){return {};}},
      now:()=>new Date("2026-11-19T15:00:00.000Z"),
      mode:"RELEASE",groups:["DOL_UI_WEEKLY_CLAIMS"],
      storeFactory:()=>store,
      providerFactory:()=>({async fetchGroup(){
        return {
          requestCount:2,snapshots:[],
          rows:["INITIAL_CLAIMS","INITIAL_CLAIMS_4W","CONTINUED_CLAIMS",
              "INSURED_UNEMPLOYMENT_RATE"].map(logicalSeriesId=>({
                logicalSeriesId,observationDate:"2026-10-24",value:1,
              })).concat(missingState?[]:[{logicalSeriesId:"STATE_INITIAL_CLAIMS",
                geographyType:"STATE",observationDate:"2026-11-07",value:1}]),
          missingSeries:missingState?["STATE_INITIAL_CLAIMS"]:[],
          nationalResponseEvidence:{responseFormat:"NATIONAL_XML",
            parsedNationalSeriesCount:4,latestNationalObservationDate:"2026-10-24"},
          ...(missingState?{stateFailureCode:"DOL_ETA539_SOURCE_FAILED",
            partialFailureCode:"DOL_ETA539_SOURCE_FAILED"}:{}),
        };
      }}),
    });
    return {result,run:runs[0],requested};
  }
  const matched=await run(fresh);
  assert.equal(matched.result.status,"SUCCESS");
  assert.equal(matched.run.status,"SUCCESS");
  assert.equal(matched.run.failureCode,null);
  assert.deepEqual(matched.requested,["2026-11-19T13:30:00.000Z"]);
  assert.equal(matched.run.detail.nationalFreshnessSource,"VERIFIED_STORED_ETA538_PDF");
  assert.equal(matched.run.detail.nationalResponseEvidence.latestNationalObservationDate,
    "2026-10-24","do not misrepresent the XML response as fresh");
  assert.equal(matched.run.detail.latestNationalSeriesObservationDates.INITIAL_CLAIMS,"2026-11-14");
  assert.equal(matched.run.detail.providerNationalSeriesObservationDates.INITIAL_CLAIMS,"2026-10-24");
  const missing=await run(null);
  assert.equal(missing.result.status,"PARTIAL");
  assert.equal(missing.run.failureCode,"DOL_RELEASE_OBSERVATION_STALE");
  const wrongRelease=await run({...fresh,sourceReleaseDate:"2026-11-12"});
  assert.equal(wrongRelease.result.status,"PARTIAL");
  const older=await run({...fresh,latestNationalSeriesObservationDates:{
    ...fresh.latestNationalSeriesObservationDates,CONTINUED_CLAIMS:"2026-10-24",
  }});
  assert.equal(older.result.status,"PARTIAL");
  const stateFailed=await run(fresh,{missingState:true});
  assert.equal(stateFailed.result.status,"PARTIAL");
  assert.deepEqual(stateFailed.requested,[],"do not mask independent ETA539 failure");
});
