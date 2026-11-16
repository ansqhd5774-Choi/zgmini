import test from "node:test";
import assert from "node:assert/strict";
import {createEmploymentR6Provider,DOL_NATIONAL_CLAIMS_URL} from "../lib/market-score/employment-r6-provider.mjs";
import {DOL_ETA539_URL} from "../lib/market-score/employment-r4-shadow-provider.mjs";
import {EMPLOYMENT_R4_CORE_STATES} from "../lib/market-score/employment-r4-shadow-contract.mjs";
import {runEmploymentR6CollectionStep} from "../lib/market-score/employment-r6-collector.mjs";

const now=()=>new Date("2026-11-16T13:30:00.000Z");
const informix="Unable to connect! SQLSTATE=HY000 PRIVATE_PROVIDER_ERROR_MUST_NOT_LEAK";
const nationalXml="<r539cyNational>"+
 "<week><weekEnded>11/07/2026</weekEnded>"+
 "<InitialClaims><SA>200000</SA><SA4WK>195250</SA4WK></InitialClaims></week>"+
 "<week><weekEnded>10/31/2026</weekEnded>"+
 "<ContinuedClaims><SA>1697000</SA></ContinuedClaims><IUR><SA>1.1</SA></IUR></week>"+
 "</r539cyNational>";
const regionCsv=["st,rptdate,c2,c3",...EMPLOYMENT_R4_CORE_STATES.map(
 st=>st+",11/13/2026,10/24/2026,300")].join("\n");
const xml=()=>new Response(nationalXml,{status:200,headers:{"content-type":"application/xml"}});
const unavailable=()=>new Response(informix,{status:200,headers:{"content-type":"text/plain"}});

test("W04 approved manual national Informix outage spends second DOL call on National rather than already-saved ETA",async()=>{
 const called=[],provider=createEmploymentR6Provider({now,fetchImpl:async(url,opts)=>{
  called.push({url:String(url),method:opts?.method});
  if(String(url)===DOL_ETA539_URL)throw Error("ETA_MUST_NOT_BE_CALLED_AFTER_RETRY");
  return called.length===1?unavailable():xml();
 }});
 const r=await provider.fetchDolClaims({mode:"ONE_YEAR",currentYear:2026,manualNationalOutageRecovery:true});
 assert.equal(r.requestCount,2);
 assert.deepEqual(called.map(c=>[c.url,c.method]),[
  [DOL_NATIONAL_CLAIMS_URL,"POST"],[DOL_NATIONAL_CLAIMS_URL,"POST"]]);
 assert.equal(r.nationalResponseEvidence.nationalAttemptCount,2);
 assert.equal(r.nationalResponseEvidence.responseFormat,"NATIONAL_XML");
 assert.equal(r.nationalResponseEvidence.parsedNationalSeriesCount,4);
 assert.deepEqual(r.rows.map(x=>x.logicalSeriesId),[
  "INITIAL_CLAIMS","INITIAL_CLAIMS_4W","CONTINUED_CLAIMS","INSURED_UNEMPLOYMENT_RATE"]);
 assert.deepEqual(r.rows.map(x=>x.observationDate),[
  "2026-11-07","2026-11-07","2026-10-31","2026-10-31"]);
 assert.equal(r.snapshots.length,1);
 assert.match(r.snapshots[0].requestKey,/^DOL_NATIONAL:/);
 assert.deepEqual(r.missingSeries,["STATE_INITIAL_CLAIMS"]);
 assert.equal(r.partialFailureCode,undefined);
 assert.ok(r.rows.every(x=>x.provenance.responseHash===r.snapshots[0].detail.responseHash));
 assert.doesNotMatch(JSON.stringify(r.nationalResponseEvidence),/PRIVATE_PROVIDER_ERROR/);
});

test("W04 scheduled ONE_YEAR keeps first National plus independent ETA; no manual retry",async()=>{
 const calls=[];
 const provider=createEmploymentR6Provider({now,fetchImpl:async(url)=>{
  calls.push(String(url));
  return String(url)===DOL_ETA539_URL?new Response(regionCsv,{status:200}):unavailable();
 }});
 const r=await provider.fetchDolClaims({mode:"ONE_YEAR",currentYear:2026});
 assert.deepEqual(calls,[DOL_NATIONAL_CLAIMS_URL,DOL_ETA539_URL]);
 assert.equal(r.requestCount,2);
 assert.equal(r.rows.filter(x=>x.geographyType==="NATIONAL").length,0);
 assert.equal(r.rows.filter(x=>x.geographyType==="STATE").length,51);
 assert.equal(r.partialFailureCode,"DOL_NATIONAL_SOURCE_UNAVAILABLE");
 assert.equal(r.nationalResponseEvidence.nationalAttemptCount,undefined);
});

test("W04 manual retry failing twice remains partial, uses no ETA and leaks no error content",async()=>{
 let national=0;
 const provider=createEmploymentR6Provider({now,fetchImpl:async(url)=>{
  assert.equal(String(url),DOL_NATIONAL_CLAIMS_URL);
  national++;return unavailable();
 }});
 const r=await provider.fetchDolClaims({mode:"ONE_YEAR",currentYear:2026,manualNationalOutageRecovery:true});
 assert.equal(national,2);
 assert.equal(r.requestCount,2);
 assert.equal(r.snapshots.length,0);
 assert.equal(r.rows.length,0);
 assert.equal(r.partialFailureCode,"DOL_NATIONAL_SOURCE_UNAVAILABLE");
 assert.equal(r.nationalResponseEvidence.nationalAttemptCount,2);
 assert.deepEqual(r.missingSeries,[
  "INITIAL_CLAIMS","INITIAL_CLAIMS_4W","CONTINUED_CLAIMS","INSURED_UNEMPLOYMENT_RATE",
  "STATE_INITIAL_CLAIMS"]);
 assert.doesNotMatch(JSON.stringify(r.nationalResponseEvidence),/PRIVATE_PROVIDER_ERROR/);
});

test("W04 valid first manual National fetch keeps ETA as second request",async()=>{
 const calls=[];
 const p=createEmploymentR6Provider({now,fetchImpl:async(url)=>{
  calls.push(String(url));
  return String(url)===DOL_ETA539_URL?new Response(regionCsv,{status:200}):xml();
 }});
 const r=await p.fetchDolClaims({mode:"ONE_YEAR",currentYear:2026,manualNationalOutageRecovery:true});
 assert.deepEqual(calls,[DOL_NATIONAL_CLAIMS_URL,DOL_ETA539_URL]);
 assert.equal(r.requestCount,2);
 assert.equal(r.rows.filter(x=>x.geographyType==="NATIONAL").length,4);
 assert.equal(r.rows.filter(x=>x.geographyType==="STATE").length,51);
 assert.equal(r.snapshots.length,2);
 assert.equal(r.partialFailureCode,undefined);
 assert.equal(r.nationalResponseEvidence.nationalAttemptCount,undefined);
});

test("W04 HTTP 503 retries only in sealed manual mode and malformed HTML does not retry",async()=>{
 for(const first of [new Response("private",{status:503}),unavailable()]){
  let count=0;
  const p=createEmploymentR6Provider({now,fetchImpl:async url=>{
   if(String(url)===DOL_ETA539_URL)throw Error("UNEXPECTED_STATE_GET");
   count++;return count===1?first:xml();
  }});
  const r=await p.fetchDolClaims({mode:"ONE_YEAR",currentYear:2026,manualNationalOutageRecovery:true});
  assert.equal(count,2);
  assert.equal(r.requestCount,2);
  assert.equal(r.nationalResponseEvidence.parsedNationalSeriesCount,4);
 }
 const calls=[];
 const p=createEmploymentR6Provider({now,fetchImpl:async url=>{
  calls.push(String(url));
  return String(url)===DOL_ETA539_URL?new Response(regionCsv,{status:200}):
   new Response("<html><body>UNRECOGNIZED</body></html>",{status:200});
 }});
 const result=await p.fetchDolClaims({mode:"ONE_YEAR",currentYear:2026,manualNationalOutageRecovery:true});
 assert.deepEqual(calls,[DOL_NATIONAL_CLAIMS_URL,DOL_ETA539_URL]);
 assert.equal(result.partialFailureCode,"DOL_NATIONAL_RESPONSE_FORMAT_UNSUPPORTED");
});

test("W04 manual National retry forbidden in BACKFILL/RELEASE, before supplier call",async()=>{
 let calls=0;
 const provider=createEmploymentR6Provider({now,fetchImpl:async()=>{calls++;return xml();}});
 for(const mode of ["BACKFILL","RELEASE"]){
  await assert.rejects(()=>provider.fetchDolClaims({mode,currentYear:2026,manualNationalOutageRecovery:true}),
   /DOL_NATIONAL_MANUAL_RECOVERY_SCOPE_STOP/);
 }
 assert.equal(calls,0);
});

test("W04 authorized B manual caller reaches retry, retains national raw before observation and same-day bypass",async()=>{
 let calls=0,recorded=[],stored=[],raws=[],latestReads=0;
 const store={
  async initialize(){},
  async getLatestRunInMode(){latestReads++;throw Error("SAME_DAY_READ_MUST_BE_BYPASSED");},
  async acquire(){return {acquired:true};},
  async release(){return true;},
  async writeRawSnapshot(s){raws.push(s);return {snapshotId:raws.length,bodySha256:s.detail.responseHash,chunkCount:1,noop:false};},
  async upsertObservationRows({rows}){stored.push(...rows);return {inserted:rows.length,revised:0,noop:0,rejected:0,changedSeriesIds:rows.map(x=>x.logicalSeriesId)};},
  async recordRun(run){recorded.push(run);return recorded.length;},
 };
 const r=await runEmploymentR6CollectionStep({
  db:{prepare(){return {};}},
  now,mode:"ONE_YEAR",groups:["DOL_UI_WEEKLY_CLAIMS"],
  executionIntent:"AUTHORIZED_MANUAL",
  manualApprovalEvidence:{
   schema:"ZGMINI_R6_DOL_MANUAL_B_APPROVAL_V1",status:"APPROVED_B",
   scope:"EMPLOYMENT_R6_DOL_MANUAL_SQLITE_ONCE",mode:"ONE_YEAR",
   groupName:"DOL_UI_WEEKLY_CLAIMS",maxDolCalls:2,
   requestId:"b56d7ba6-8c43-4ed3-8c3e-9de057082bc2",
   approvalManifestSha256:"a".repeat(64),
  },
  storeFactory:()=>store,
  providerFactory:()=>createEmploymentR6Provider({now,fetchImpl:async url=>{
   assert.equal(String(url),DOL_NATIONAL_CLAIMS_URL);
   calls++;return calls===1?unavailable():xml();
  }}),
 });
 assert.equal(r.status,"PARTIAL"); // ETA intentionally not refreshed in recovery
 assert.equal(r.providerRequests,2);
 assert.equal(calls,2);
 assert.equal(latestReads,0);
 assert.equal(raws.length,1);
 assert.equal(stored.length,4);
 assert.equal(recorded.length,1);
 assert.equal(recorded[0].status,"PARTIAL");
 assert.equal(recorded[0].detail.nationalResponseEvidence.nationalAttemptCount,2);
 assert.equal(recorded[0].detail.missingSeries[0],"STATE_INITIAL_CLAIMS");
});
