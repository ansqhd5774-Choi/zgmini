import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  E1_R5_CFO_LOCAL_IMPORT_R3_VERSION,
  importCfoSurveyLocalSourceR3,
  parseRichmondFedCfoRevenueReleaseR3,
} from "../scripts/pc-writer/earnings-r5-cfo-survey-local-import-r3.mjs";

function googleTranslatedRichmondTable(){
  return `<!doctype html><html lang="ko"><body>
    <table>
      <tr><th>최고재무책임자(CFO)들의 자사 성장 기대치 (응답 분기별)</th><th colspan="2">2026년 3분기</th><th colspan="2">2026년 2분기</th></tr>
      <tr><td>연도별 평균(및 중앙값) 예상 전년 대비 백분율 변화</td><td>2026</td><td>2027</td><td>2026</td><td>2027</td></tr>
      <tr><td>수익</td><td>7.7%<br>(5.0%)</td><td>7.2%<br>(5.0%)</td><td>6.5%<br>(5.0%)</td><td>7.4%<br>(5.0%)</td></tr>
      <tr><td>가격</td><td>5.3% (4.0%)</td><td>4.5% (3.0%)</td><td>4.7% (3.0%)</td><td>4.1% (3.0%)</td></tr>
      <tr><td>단위 비용</td><td>4.8% (4.0%)</td><td>4.2% (3.0%)</td><td>4.5% (4.0%)</td><td>4.0% (3.0%)</td></tr>
      <tr><td>정규직 채용</td><td>4.7% (1.7%)</td><td>2.4% (1.4%)</td><td>3.6% (1.7%)</td><td>2.3% (1.5%)</td></tr>
      <tr><td>평균 임금</td><td>4.3% (3.8%)</td><td>4.3% (4.0%)</td><td>4.0% (3.1%)</td><td>3.9% (3.0%)</td></tr>
    </table>
  </body></html>`;
}

test("R3 parser accepts the observed Google-translated Richmond CFO table",()=>{
  const out=parseRichmondFedCfoRevenueReleaseR3(googleTranslatedRichmondTable(),{surveyYear:2026,surveyQuarter:3});
  assert.equal(out.status,"READY");
  assert.equal(out.currentYearGrowth,7.7);
  assert.equal(out.nextYearGrowth,7.2);
  assert.equal(out.parserEvidence.parserPath,"HTML_TABLE_TRANSLATED_STRUCTURAL");
  assert.equal(out.parserEvidence.responseQuarter,"2026Q3");
  assert.equal(out.parserEvidence.comparisonQuarter,"2026Q2");
  assert.deepEqual(out.parserEvidence.targetYears,[2026,2027,2026,2027]);
  assert.equal(out.parserEvidence.revenueLabel,"수익");
  assert.equal(out.parserEvidence.revenuePairs,4);
});

test("R3 translated structural fallback fails closed when comparison quarter is missing",()=>{
  const html=googleTranslatedRichmondTable().replace("2026년 2분기","2026년 1분기");
  const out=parseRichmondFedCfoRevenueReleaseR3(html,{surveyYear:2026,surveyQuarter:3});
  assert.equal(out.status,"MISSING");
});

test("R3 translated structural fallback fails closed when target-year sequence is wrong",()=>{
  const html=googleTranslatedRichmondTable().replace("<td>2027</td><td>2026</td><td>2027</td>","<td>2028</td><td>2026</td><td>2028</td>");
  const out=parseRichmondFedCfoRevenueReleaseR3(html,{surveyYear:2026,surveyQuarter:3});
  assert.equal(out.status,"MISSING");
});

test("R3 importer preserves original translated source bytes/hash and PIT contract",()=>{
  const base=fs.mkdtempSync(path.join(os.tmpdir(),"e1-r5-cfo-r3-"));
  const source=path.join(base,"q3-ko.html");
  const html=googleTranslatedRichmondTable();
  fs.writeFileSync(source,html,"utf8");
  try{
    const result=importCfoSurveyLocalSourceR3({
      base,
      sourceFile:source,
      sourceUrl:"https://www.richmondfed.org/research/national_economy/cfo_survey/data_and_results/2026/20260923_data_and_results",
      surveyYear:2026,
      surveyQuarter:3,
      releaseAt:"2026-09-23T11:30:00Z",
      storedAt:"2026-09-23T11:35:00Z",
    });
    assert.equal(E1_R5_CFO_LOCAL_IMPORT_R3_VERSION,"E1-R5-CFO-LOCAL-IMPORT-R3");
    assert.equal(result.status,"STORED");
    assert.equal(result.record.currentYearGrowth,7.7);
    assert.equal(result.record.nextYearGrowth,7.2);
    assert.equal(result.parserEvidence.parserPath,"HTML_TABLE_TRANSLATED_STRUCTURAL");
    assert.equal(result.networkCalls,0);
    assert.equal(result.dbWrites,0);
    assert.equal(result.productionActivation,false);
    assert.equal(result.formulaChanged,false);
    assert.equal(result.weightChanged,false);
    assert.equal(fs.readFileSync(result.sourceEvidenceFile,"utf8"),html);
    const stored=JSON.parse(fs.readFileSync(result.output,"utf8"));
    assert.equal(stored.version,"E1-R5-CFO-LOCAL-IMPORT-R1");
    assert.equal(stored.releases.length,1);
  }finally{
    fs.rmSync(base,{recursive:true,force:true});
  }
});
