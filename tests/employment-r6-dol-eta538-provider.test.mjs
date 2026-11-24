import test from "node:test";
import assert from "node:assert/strict";
import {Buffer} from "node:buffer";
import {createHash} from "node:crypto";
import {deflateSync} from "node:zlib";
import {EMPLOYMENT_R4_CORE_STATES} from "../lib/market-score/employment-r4-shadow-contract.mjs";
import {DOL_ETA539_URL} from "../lib/market-score/employment-r4-shadow-provider.mjs";
import {DOL_NATIONAL_CLAIMS_URL} from "../lib/market-score/employment-r6-provider.mjs";
import {fetchDolAdvancePdfCandidate} from "../lib/market-score/employment-r6-dol-advance-pdf-candidate.mjs";
import {createEmploymentR6DolEta538Provider} from "../lib/market-score/employment-r6-dol-eta538-provider.mjs";

const RELEASE="2026-11-19T13:30:00.000Z",CHECKED="2026-11-24T14:14:40.919Z";
const PDF_URL="https://oui.doleta.gov/press/2026/111926.pdf";
const hash=bytes=>createHash("sha256").update(bytes).digest("hex");
function fixturePdf(){
  const text=[
    "Thursday, November 19, 2026",
    "UNEMPLOYMENT INSURANCE WEEKLY CLAIMS",
    "SEASONALLY ADJUSTED DATA",
    "In the week ending November 14, the advance figure for seasonally adjusted ",
    "initial claims was 203,000, an increase of 1,000.",
    "The 4","-","week moving average was 197,750, an increase of 2,000.",
    "The advance seasonally adjusted insured unemployment rate was 1.1 percent for the week ending November 7.",
    "The advance number for seasonally adjusted insured unemployment during the week ending November 7 was 1,763,000.",
  ].map(s=>s.replace(/[()\\]/g,c=>"\\"+c));
  const payload="BT\n"+text.map(s=>"[("+s+")] TJ").join("\n")+"\nET\n";
  return Buffer.concat([Buffer.from("%PDF-1.7\n1 0 obj\n<</Filter/FlateDecode>>\nstream\n"),
    deflateSync(Buffer.from(payload)),Buffer.from("\nendstream\nendobj\n%%EOF\n")]);
}
function stateCsv(){
  const lines=["ST,RPTDATE,C2,C3"];
  for(const [i,state] of EMPLOYMENT_R4_CORE_STATES.entries())
    lines.push(state+",11/19/2026,11/14/2026,"+(100+i));
  return lines.join("\n")+"\n";
}
function sourceConfig(pdf=fixturePdf()){
  return {releaseDate:"2026-11-19",releaseAt:RELEASE,
    expectedInitialWeekEnd:"2026-11-14",originalPdfSha256:hash(pdf)};
}
function makeFetch(pdf=fixturePdf(),{stateFail=false,badPdf=false}={}){
  const calls=[];
  const fetchImpl=async (url,opts)=>{
    calls.push({url,method:opts?.method??"GET"});
    if(url===PDF_URL)
      return {ok:!badPdf,status:badPdf?503:200,url,
        headers:{get:name=>name==="content-type"?"application/pdf":null},
        arrayBuffer:async()=>pdf};
    if(url===DOL_ETA539_URL){
      if(stateFail)throw Error("STATE_SIMULATED_PRIVATE_ERROR");
      return {ok:true,status:200,url,
        headers:{get:name=>name==="content-type"?"text/csv":null},
        arrayBuffer:async()=>Buffer.from(stateCsv(),"utf8")};
    }
    throw Error("UNEXPECTED_EXTERNAL_PROVIDER_URL");
  };
  return {calls,fetchImpl};
}

test("W04 opt-in official PDF + ETA539 uses exactly two DOL GETs and valid 4 National rows",async()=>{
  const pdf=fixturePdf(),mock=makeFetch(pdf);
  const adapter=createEmploymentR6DolEta538Provider({fetchImpl:mock.fetchImpl,
    now:()=>new Date(CHECKED),sourceConfig:sourceConfig(pdf)});
  const result=await adapter.fetchGroup("DOL_UI_WEEKLY_CLAIMS",{mode:"ONE_YEAR"});
  assert.deepEqual(mock.calls,[{url:PDF_URL,method:"GET"},{url:DOL_ETA539_URL,method:"GET"}]);
  assert.equal(result.requestCount,2);
  assert.equal(result.partialFailureCode,undefined);
  assert.deepEqual(result.missingSeries,[]);
  assert.equal(result.snapshots.length,2);
  assert.equal(result.snapshots[0].requestKey,"DOL_ETA538_PDF:2026-11-19");
  assert.equal(result.snapshots[1].requestKey,"DOL_ETA539:112w");
  assert.equal(result.snapshots[0].detail.originalBodySha256,hash(pdf));
  const nat=result.rows.filter(x=>x.geographyType==="NATIONAL");
  const states=result.rows.filter(x=>x.geographyType==="STATE");
  assert.equal(nat.length,4);
  assert.equal(states.length,51);
  assert.deepEqual(nat.map(x=>x.value),[203000,197750,1763000,1.1]);
  assert.deepEqual(nat.map(x=>x.observationDate),
    ["2026-11-14","2026-11-14","2026-11-07","2026-11-07"]);
  const encodedSha=hash(Buffer.from(result.snapshots[0].body,"utf8"));
  for(const row of nat){
    assert.equal(row.provenance.responseHash,encodedSha);
    assert.equal(row.provenance.originalPdfSha256,hash(pdf));
    assert.equal(row.availableAt,CHECKED);
    assert.equal(row.provenance.historicAvailabilityAttested,false);
  }
  assert.ok(!mock.calls.some(x=>x.url===DOL_NATIONAL_CLAIMS_URL));
});
test("W04 mismatched original-PDF hash never stages national rows, still isolates ETA539",async()=>{
  const pdf=fixturePdf(),mock=makeFetch(pdf);
  const adapter=createEmploymentR6DolEta538Provider({fetchImpl:mock.fetchImpl,
    now:()=>new Date(CHECKED),sourceConfig:{...sourceConfig(pdf),originalPdfSha256:"0".repeat(64)}});
  const out=await adapter.fetchGroup("DOL_UI_WEEKLY_CLAIMS",{mode:"ONE_YEAR"});
  assert.equal(out.requestCount,2);
  assert.equal(out.partialFailureCode,"DOL_ETA538_PDF_PIN_MISMATCH");
  assert.equal(out.rows.filter(x=>x.geographyType==="NATIONAL").length,0);
  assert.equal(out.rows.filter(x=>x.geographyType==="STATE").length,51);
  assert.equal(out.snapshots.filter(x=>x.requestKey.startsWith("DOL_ETA538_PDF:")).length,0);
  assert.equal(out.missingSeries.length,4);
});
test("W04 PDF rejection and independent state failure cannot fabricate stored observations",async()=>{
  const pdf=fixturePdf(),mock=makeFetch(pdf,{badPdf:true,stateFail:true});
  const adapter=createEmploymentR6DolEta538Provider({fetchImpl:mock.fetchImpl,
    now:()=>new Date(CHECKED),sourceConfig:sourceConfig(pdf)});
  const out=await adapter.fetchGroup("DOL_UI_WEEKLY_CLAIMS",{mode:"ONE_YEAR"});
  assert.equal(out.requestCount,2);
  assert.equal(out.rows.length,0);
  assert.equal(out.snapshots.length,0);
  assert.equal(out.missingSeries.length,5);
  assert.equal(out.partialFailureCode,"DOL_ETA538_PDF_INVALID");
  assert.equal(out.stateFailureCode,"DOL_ETA539_SOURCE_FAILED");
});
test("W04 ETA539-only network outage keeps the four verified PDF National observations and exact state error",async()=>{
  const pdf=fixturePdf(),mock=makeFetch(pdf,{stateFail:true});
  const adapter=createEmploymentR6DolEta538Provider({fetchImpl:mock.fetchImpl,
    now:()=>new Date(CHECKED),sourceConfig:sourceConfig(pdf)});
  const out=await adapter.fetchGroup("DOL_UI_WEEKLY_CLAIMS",{mode:"ONE_YEAR"});
  assert.equal(out.requestCount,2);
  assert.deepEqual(mock.calls,[{url:PDF_URL,method:"GET"},{url:DOL_ETA539_URL,method:"GET"}]);
  assert.equal(out.partialFailureCode,"DOL_ETA539_SOURCE_FAILED");
  assert.equal(out.stateFailureCode,"DOL_ETA539_SOURCE_FAILED");
  assert.equal(out.rows.filter(x=>x.geographyType==="NATIONAL").length,4);
  assert.equal(out.rows.filter(x=>x.geographyType==="STATE").length,0);
  assert.equal(out.snapshots.filter(x=>x.requestKey.startsWith("DOL_ETA538_PDF:")).length,1);
  assert.deepEqual(out.missingSeries,["STATE_INITIAL_CLAIMS"]);
});
test("W04 exact release/byte pin and DOL-only ONE_YEAR scope fail before any provider call",async()=>{
  const pdf=fixturePdf(),mock=makeFetch(pdf);
  for(const cfg of [
    {...sourceConfig(pdf),originalPdfSha256:null},
    {...sourceConfig(pdf),releaseAt:"2026-11-26T13:30:00.000Z"},
    {...sourceConfig(pdf),releaseAt:"2030-11-19T13:30:00.000Z"},
  ])assert.throws(()=>createEmploymentR6DolEta538Provider({
    fetchImpl:mock.fetchImpl,now:()=>new Date(CHECKED),sourceConfig:cfg
  }),/DOL_ETA538_PIN_REQUIRED/);
  const adapter=createEmploymentR6DolEta538Provider({
    fetchImpl:mock.fetchImpl,now:()=>new Date(CHECKED),sourceConfig:sourceConfig(pdf)
  });
  await assert.rejects(adapter.fetchGroup("BLS_JOLTS",{mode:"ONE_YEAR"}),/DOL_ETA538_GROUP_OR_MODE_FORBIDDEN/);
  await assert.rejects(adapter.fetchGroup("DOL_UI_WEEKLY_CLAIMS",{mode:"RELEASE"}),/DOL_ETA538_GROUP_OR_MODE_FORBIDDEN/);
  assert.equal(mock.calls.length,0);
});
test("W04 original candidate public API still returns no raw PDF bytes",async()=>{
  const pdf=fixturePdf(),mock=makeFetch(pdf);
  const out=await fetchDolAdvancePdfCandidate({
    releaseDate:"2026-11-19",expectedInitialWeekEnd:"2026-11-14",
    fetchImpl:mock.fetchImpl,now:()=>new Date(CHECKED),
  });
  assert.equal(out.status,"CANDIDATE_ONLY",JSON.stringify(out));
  assert.equal(Object.hasOwn(out,"rawPdfBytes"),false);
  assert.equal(Object.hasOwn(out,"bytes"),false);
  assert.equal(mock.calls.length,1);
});
