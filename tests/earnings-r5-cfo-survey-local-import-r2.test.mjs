import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  E1_R5_CFO_LOCAL_IMPORT_R2_VERSION,
  importCfoSurveyLocalSourceR2,
  parseRichmondFedCfoRevenueReleaseR2,
} from "../scripts/pc-writer/earnings-r5-cfo-survey-local-import-r2.mjs";

function flattenedOfficialHtml(){
  return `<!doctype html><html><body>
    <div>CFO Outlook: Steady Overall but Weaker for Small and Financially Constrained Firms</div>
    <div>CFOs’ Growth Expectations for Their Own Firms, by Response Quarter</div>
    <div>Q3 2026 Q2 2026</div>
    <div>Mean (and Median) Expected Year-Over-Year Percentage Change for Calendar Years 2026 2027 2026 2027</div>
    <div>Revenue 7.7% (5.0%) 7.2% (5.0%) 6.5% (5.0%) 7.4% (5.0%)</div>
    <div>Price 5.3% (4.0%) 4.5% (3.0%) 4.7% (3.0%) 4.1% (3.0%)</div>
  </body></html>`;
}

function browserSavedWithoutMeanMedianMarker(){
  return `<!doctype html><html><body>
    <div>CFO Outlook Q3 2026</div>
    <div>CFOs’ Growth Expectations for Their Own Firms, by Response Quarter</div>
    <div>Q3 2026 Q2 2026</div>
    <div>2026 2027 2026 2027</div>
    <div>Revenue 7.7% (5.0%) 7.2% (5.0%) 6.5% (5.0%) 7.4% (5.0%)</div>
    <div>Price 5.3% (4.0%) 4.5% (3.0%) 4.7% (3.0%) 4.1% (3.0%)</div>
  </body></html>`;
}

function scriptEmbeddedBrowserSave(){
  return `<!doctype html><html><body>
    <main><div>Q3 2026</div></main>
    <script type="application/json">{"table":"Q3 2026 Q2 2026 2026 2027 2026 2027 Revenue 7.7% (5.0%) 7.2% (5.0%) 6.5% (5.0%) 7.4% (5.0%) Price 5.3% (4.0%)"}</script>
  </body></html>`;
}

test("R2 parser accepts flattened rendered Richmond CFO markup",()=>{
  const out=parseRichmondFedCfoRevenueReleaseR2(flattenedOfficialHtml(),{surveyYear:2026,surveyQuarter:3});
  assert.equal(out.status,"READY");
  assert.equal(out.currentYearGrowth,7.7);
  assert.equal(out.nextYearGrowth,7.2);
  assert.equal(out.parserEvidence.parserPath,"FLATTENED_VISIBLE_TEXT");
  assert.equal(out.parserEvidence.statistic,"MEAN_FROM_PUBLISHED_MEAN_MEDIAN_PAIRS");
});

test("R2 parser accepts browser-saved CFO markup when the descriptive mean/median marker is absent",()=>{
  const out=parseRichmondFedCfoRevenueReleaseR2(browserSavedWithoutMeanMedianMarker(),{surveyYear:2026,surveyQuarter:3});
  assert.equal(out.status,"READY");
  assert.equal(out.currentYearGrowth,7.7);
  assert.equal(out.nextYearGrowth,7.2);
  assert.equal(out.parserEvidence.parserPath,"FLATTENED_VISIBLE_TEXT");
  assert.equal(out.parserEvidence.comparisonQuarter,"Q2 2026");
  assert.equal(out.parserEvidence.revenuePairs,4);
});

test("R2 parser can recover the official growth table from script-embedded browser source while remaining fail-closed",()=>{
  const out=parseRichmondFedCfoRevenueReleaseR2(scriptEmbeddedBrowserSave(),{surveyYear:2026,surveyQuarter:3});
  assert.equal(out.status,"READY");
  assert.equal(out.currentYearGrowth,7.7);
  assert.equal(out.nextYearGrowth,7.2);
  assert.equal(out.parserEvidence.parserPath,"FLATTENED_SOURCE_TEXT");
});

test("R2 flattened fallback fails closed when target-year header is wrong",()=>{
  const html=flattenedOfficialHtml().replace("2026 2027 2026 2027","2026 2028 2026 2028");
  const out=parseRichmondFedCfoRevenueReleaseR2(html,{surveyYear:2026,surveyQuarter:3});
  assert.equal(out.status,"MISSING");
  assert.equal(out.reason,"TARGET_YEAR_HEADER_NOT_FOUND");
});

test("R2 flattened fallback rejects a revenue row that lacks the prior-quarter mean/median pairs",()=>{
  const html=browserSavedWithoutMeanMedianMarker().replace("6.5% (5.0%) 7.4% (5.0%)","");
  const out=parseRichmondFedCfoRevenueReleaseR2(html,{surveyYear:2026,surveyQuarter:3});
  assert.equal(out.status,"MISSING");
  assert.equal(out.reason,"REVENUE_MEAN_MEDIAN_PAIRS_MISSING");
});

test("R2 importer preserves original source bytes/hash and existing PIT document contract",()=>{
  const base=fs.mkdtempSync(path.join(os.tmpdir(),"e1-r5-cfo-r2-"));
  const source=path.join(base,"q3.html");
  fs.writeFileSync(source,flattenedOfficialHtml(),"utf8");
  try{
    const result=importCfoSurveyLocalSourceR2({
      base,
      sourceFile:source,
      sourceUrl:"https://www.richmondfed.org/research/national_economy/cfo_survey/data_and_results/2026/20260923_data_and_results",
      surveyYear:2026,
      surveyQuarter:3,
      releaseAt:"2026-09-23T11:30:00Z",
      storedAt:"2026-09-23T11:35:00Z",
    });
    assert.equal(E1_R5_CFO_LOCAL_IMPORT_R2_VERSION,"E1-R5-CFO-LOCAL-IMPORT-R2");
    assert.equal(result.status,"STORED");
    assert.equal(result.record.currentYearGrowth,7.7);
    assert.equal(result.record.nextYearGrowth,7.2);
    assert.equal(result.parserEvidence.parserPath,"FLATTENED_VISIBLE_TEXT");
    assert.equal(result.networkCalls,0);
    assert.equal(result.dbWrites,0);
    assert.equal(result.productionActivation,false);
    assert.equal(fs.readFileSync(result.sourceEvidenceFile,"utf8"),flattenedOfficialHtml());
    const stored=JSON.parse(fs.readFileSync(result.output,"utf8"));
    assert.equal(stored.version,"E1-R5-CFO-LOCAL-IMPORT-R1");
    assert.equal(stored.releases.length,1);
  }finally{
    fs.rmSync(base,{recursive:true,force:true});
  }
});
