import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  E1_R5_CFO_LOCAL_IMPORT_CONTRACT,
  E1_R5_CFO_LOCAL_IMPORT_VERSION,
  importCfoSurveyLocalSource,
  mergeCfoSurveyReleaseDocument,
  parseRichmondFedCfoRevenueRelease,
} from "../scripts/pc-writer/earnings-r5-cfo-survey-local-import.mjs";

function officialHtml({quarter=3,year=2026,current=7.7,next=7.2,previous=6.5,previousNext=7.4}={}){
  const previousQuarter=quarter===1?4:quarter-1;
  const previousYear=quarter===1?year-1:year;
  return `<!doctype html><html><body>
    <h1>CFO Outlook</h1><p>Sept. 23, 2026</p>
    <table>
      <tr><th>CFOs' Growth Expectations for Their Own Firms, by Response Quarter</th><th colspan="2">Q${quarter} ${year}</th><th colspan="2">Q${previousQuarter} ${previousYear}</th></tr>
      <tr><th>Mean (and Median) Expected Year-Over-Year Percentage Change for Calendar Years</th><th>${year}</th><th>${year+1}</th><th>${previousYear}</th><th>${previousYear+1}</th></tr>
      <tr><td>Revenue</td><td>${current}%<br>(${5.0}%)</td><td>${next}%<br>(${5.0}%)</td><td>${previous}%<br>(${5.0}%)</td><td>${previousNext}%<br>(${5.0}%)</td></tr>
      <tr><td>Price</td><td>5.3%<br>(4.0%)</td><td>4.5%<br>(3.0%)</td><td>4.7%<br>(3.0%)</td><td>4.1%<br>(3.0%)</td></tr>
    </table>
  </body></html>`;
}

function tempSource(html=officialHtml()){
  const base=fs.mkdtempSync(path.join(os.tmpdir(),"e1-r5-cfo-local-import-"));
  const file=path.join(base,"q3.html");
  fs.writeFileSync(file,html,"utf8");
  return {base,file};
}

test("CFO local importer contract is explicit and cannot activate Production",()=>{
  assert.equal(E1_R5_CFO_LOCAL_IMPORT_VERSION,"E1-R5-CFO-LOCAL-IMPORT-R1");
  assert.equal(E1_R5_CFO_LOCAL_IMPORT_CONTRACT.networkCalls,0);
  assert.equal(E1_R5_CFO_LOCAL_IMPORT_CONTRACT.dbWrites,0);
  assert.equal(E1_R5_CFO_LOCAL_IMPORT_CONTRACT.productionActivation,false);
  assert.equal(E1_R5_CFO_LOCAL_IMPORT_CONTRACT.formulaChanged,false);
  assert.equal(E1_R5_CFO_LOCAL_IMPORT_CONTRACT.weightChanged,false);
  assert.equal(E1_R5_CFO_LOCAL_IMPORT_CONTRACT.overwriteHistoricalPIT,false);
});

test("official Richmond CFO table parser selects published means rather than medians",()=>{
  const out=parseRichmondFedCfoRevenueRelease(officialHtml(),{surveyYear:2026,surveyQuarter:3});
  assert.equal(out.status,"READY");
  assert.equal(out.currentTargetYear,2026);
  assert.equal(out.nextTargetYear,2027);
  assert.equal(out.currentYearGrowth,7.7);
  assert.equal(out.nextYearGrowth,7.2);
  assert.equal(out.parserEvidence.statistic,"FIRST_PERCENT_IN_CELL_AS_PUBLISHED_MEAN");
});

test("parser fails closed on wrong response quarter, target years and ambiguous Revenue rows",()=>{
  const wrongQuarter=parseRichmondFedCfoRevenueRelease(officialHtml(),{surveyYear:2026,surveyQuarter:4});
  assert.equal(wrongQuarter.status,"MISSING");
  assert.equal(wrongQuarter.reason,"RESPONSE_QUARTER_NOT_FOUND");

  const wrongYears=officialHtml().replace(">2027</g,">2028<");
  const years=parseRichmondFedCfoRevenueRelease(wrongYears,{surveyYear:2026,surveyQuarter:3});
  assert.equal(years.status,"MISSING");
  assert.equal(years.reason,"TARGET_YEAR_HEADER_NOT_FOUND");

  const duplicated=officialHtml().replace("</table>","<tr><td>Revenue</td><td>1%</td><td>2%</td></tr></table>");
  const ambiguous=parseRichmondFedCfoRevenueRelease(duplicated,{surveyYear:2026,surveyQuarter:3});
  assert.equal(ambiguous.status,"MISSING");
  assert.equal(ambiguous.reason,"REVENUE_ROW_AMBIGUOUS");
});

test("append-only release document keeps historical versions and exact replay is NOOP",()=>{
  const a={surveyYear:2026,surveyQuarter:2,releaseAt:"2026-06-24T11:30:00.000Z",storedAt:"2026-06-24T11:31:00.000Z",sourceHash:"a".repeat(64)};
  const b={surveyYear:2026,surveyQuarter:2,releaseAt:"2026-06-24T11:30:00.000Z",storedAt:"2027-03-01T00:00:00.000Z",sourceHash:"b".repeat(64)};
  const first=mergeCfoSurveyReleaseDocument({releases:[]},a);
  assert.equal(first.status,"STORED");
  assert.equal(first.document.releases.length,1);
  const replay=mergeCfoSurveyReleaseDocument(first.document,a);
  assert.equal(replay.status,"NOOP");
  assert.equal(replay.document.releases.length,1);
  const revision=mergeCfoSurveyReleaseDocument(replay.document,b);
  assert.equal(revision.status,"STORED");
  assert.equal(revision.document.releases.length,2);
  assert.equal(revision.document.releases[0].sourceHash,"a".repeat(64));
  assert.equal(revision.document.releases[1].sourceHash,"b".repeat(64));
});

test("end-to-end import stores hash-addressed raw evidence and PIT JSON without network or DB",()=>{
  const fx=tempSource();
  try{
    const result=importCfoSurveyLocalSource({
      base:fx.base,
      sourceFile:fx.file,
      sourceUrl:"https://www.richmondfed.org/research/national_economy/cfo_survey/data_and_results/2026/20260923_data_and_results",
      surveyYear:2026,
      surveyQuarter:3,
      releaseAt:"2026-09-23T11:30:00Z",
      storedAt:"2026-09-23T11:35:00Z",
    });
    assert.equal(result.status,"STORED");
    assert.equal(result.record.status,"READY");
    assert.equal(result.record.currentYearGrowth,7.7);
    assert.equal(result.record.nextYearGrowth,7.2);
    assert.match(result.record.revisionId,/^LOCAL_SOURCE_[a-f0-9]{16}$/);
    assert.equal(result.networkCalls,0);
    assert.equal(result.dbWrites,0);
    assert.equal(result.productionActivation,false);
    assert.equal(fs.existsSync(result.output),true);
    assert.equal(fs.existsSync(result.sourceEvidenceFile),true);
    const stored=JSON.parse(fs.readFileSync(result.output,"utf8"));
    assert.equal(stored.releases.length,1);
    assert.equal(stored.releases[0].sourceHash,result.sourceHash);

    const replay=importCfoSurveyLocalSource({
      base:fx.base,
      sourceFile:fx.file,
      sourceUrl:"https://www.richmondfed.org/research/national_economy/cfo_survey/data_and_results/2026/20260923_data_and_results",
      surveyYear:2026,
      surveyQuarter:3,
      releaseAt:"2026-09-23T11:30:00Z",
      storedAt:"2026-09-23T11:35:00Z",
    });
    assert.equal(replay.status,"NOOP");
    assert.equal(replay.sourceEvidence,"NOOP");
    assert.equal(JSON.parse(fs.readFileSync(result.output,"utf8")).releases.length,1);
  }finally{fs.rmSync(fx.base,{recursive:true,force:true});}
});

test("non-Richmond source URL is rejected before local evidence is admitted",()=>{
  const fx=tempSource();
  try{
    assert.throws(()=>importCfoSurveyLocalSource({
      base:fx.base,
      sourceFile:fx.file,
      sourceUrl:"https://example.com/cfo",
      surveyYear:2026,
      surveyQuarter:3,
      releaseAt:"2026-09-23T11:30:00Z",
      storedAt:"2026-09-23T11:35:00Z",
    }),error=>error?.code==="SOURCE_HOST_NOT_ALLOWED");
  }finally{fs.rmSync(fx.base,{recursive:true,force:true});}
});

test("source contains no live fetch, database write or publication path",()=>{
  const source=fs.readFileSync(new URL("../scripts/pc-writer/earnings-r5-cfo-survey-local-import.mjs",import.meta.url),"utf8");
  assert.doesNotMatch(source,/\bfetch\s*\(/);
  assert.doesNotMatch(source,/INSERT INTO|UPDATE |DELETE FROM|remote\.|publishMarket|--publish/);
  assert.match(source,/networkCalls:0/);
  assert.match(source,/dbWrites:0/);
  assert.match(source,/productionActivation:false/);
});
