import test from "node:test";
import assert from "node:assert/strict";
import {
  E1_R5_GUIDANCE_R2_CONTRACT,
  E1_R5_GUIDANCE_R2_VERSION,
  buildGuidanceShadowDiagnostic,
  classifyGuidanceBasis,
  classifyGuidanceDirection,
  extractSecEpsGuidance,
  isGuidanceWithdrawal,
  normalizeGuidancePeriodKey,
  normalizeSecGuidanceText,
  parseGuidanceSegment,
  selectGuidanceAsOf,
} from "../lib/market-score/earnings-e1-r5-guidance-r2.mjs";

test("guidance R2 is strict Shadow-only SEC text extraction",()=>{
  assert.equal(E1_R5_GUIDANCE_R2_VERSION,"E1-R5-GUIDANCE-R2");
  assert.equal(E1_R5_GUIDANCE_R2_CONTRACT.status,"SHADOW_ONLY");
  assert.equal(E1_R5_GUIDANCE_R2_CONTRACT.productionActivation,false);
  assert.equal(E1_R5_GUIDANCE_R2_CONTRACT.withdrawalPolicy,"MISSING_NOT_DOWNGRADE");
  assert.equal(E1_R5_GUIDANCE_R2_CONTRACT.noPriorPolicy,"MISSING_NOT_NEUTRAL");
});

test("normalization removes markup without treating results text as guidance",()=>{
  const normalized=normalizeSecGuidanceText("<p>Fiscal year 2026 adjusted diluted EPS guidance is $5.00 to $5.20.</p><script>ignore()</script>");
  assert.match(normalized,/Fiscal year 2026/);
  assert.doesNotMatch(normalized,/ignore/);
  const results=parseGuidanceSegment("Fiscal year 2026 GAAP diluted EPS was $5.00 to $5.20.",{
    form:"8-K",filedAt:"2026-08-01T12:00:00Z",
  });
  assert.equal(results.status,"MISSING");
  assert.equal(results.reason,"FORWARD_EPS_CONTEXT_MISSING");
});

test("period and basis parsing are explicit and do not guess",()=>{
  assert.equal(normalizeGuidancePeriodKey("fiscal year 2026 guidance"),"FY2026");
  assert.equal(normalizeGuidancePeriodKey("third quarter 2026 outlook"),"FY2026Q3");
  assert.equal(normalizeGuidancePeriodKey("Q4 2027 guidance"),"FY2027Q4");
  assert.equal(normalizeGuidancePeriodKey("next quarter guidance"),null);
  assert.equal(classifyGuidanceBasis("adjusted diluted EPS"),"ADJUSTED");
  assert.equal(classifyGuidanceBasis("non-GAAP EPS"),"ADJUSTED");
  assert.equal(classifyGuidanceBasis("GAAP diluted EPS"),"GAAP");
  assert.equal(classifyGuidanceBasis("diluted EPS"),null);
});

test("strict parser accepts only same-document forward EPS ranges with PIT time",()=>{
  const out=parseGuidanceSegment("The company raises its fiscal year 2026 adjusted diluted EPS guidance to $5.00 to $5.20.",{
    cik:"1234",ticker:"abc",accession:"0001",form:"8-K",filedAt:"2026-08-01T12:00:00Z",
  });
  assert.equal(out.status,"READY");
  assert.equal(out.periodKey,"FY2026");
  assert.equal(out.basis,"ADJUSTED");
  assert.equal(out.unit,"USD/SHARE");
  assert.equal(out.low,5);
  assert.equal(out.high,5.2);
  assert.equal(out.midpoint,5.1);
  assert.equal(out.ticker,"ABC");
  assert.equal(out.availableAt,"2026-08-01T12:00:00.000Z");

  assert.equal(parseGuidanceSegment("Fiscal year 2026 adjusted EPS guidance is $5.00 to $5.20.",{form:"10-Q",filedAt:"2026-08-01"}).reason,"FORM_NOT_ACCEPTED");
  assert.equal(parseGuidanceSegment("Fiscal year 2026 EPS guidance is $5.00 to $5.20.",{form:"8-K",filedAt:"2026-08-01"}).reason,"BASIS_UNRESOLVED");
  assert.equal(parseGuidanceSegment("Fiscal year 2026 adjusted EPS guidance is about $5.10.",{form:"8-K",filedAt:"2026-08-01"}).reason,"EPS_RANGE_UNRESOLVED");
  assert.equal(parseGuidanceSegment("Fiscal year 2026 adjusted EPS guidance is $5.00 to $5.20.",{form:"8-K"}).reason,"AVAILABLE_AT_MISSING");
});

test("withdrawal is missing rather than an automatic downgrade",()=>{
  const statement="The company withdraws its fiscal year 2026 adjusted EPS guidance due to uncertainty.";
  assert.equal(isGuidanceWithdrawal(statement),true);
  const out=parseGuidanceSegment(statement,{form:"8-K",filedAt:"2026-08-01"});
  assert.equal(out.status,"MISSING");
  assert.equal(out.reason,"GUIDANCE_WITHDRAWN");
  assert.equal(out.withdrawn,true);
});

test("document extraction deduplicates repeated identical guidance ranges",()=>{
  const html=`<p>For fiscal year 2026, the company expects adjusted diluted EPS of $5.00 to $5.20.</p>
  <p>For fiscal year 2026, the company expects adjusted diluted EPS of $5.00 to $5.20.</p>`;
  const out=extractSecEpsGuidance(html,{form:"8-K",acceptedAt:"2026-08-01T14:30:00Z"});
  assert.equal(out.status,"READY");
  assert.equal(out.candidates.length,1);
  assert.equal(out.candidates[0].periodKey,"FY2026");
});

test("as-of selection never uses a filing not yet available",()=>{
  const base={status:"READY",periodKey:"FY2026",metric:"EPS",basis:"ADJUSTED",unit:"USD/SHARE",low:4,high:5};
  const rows=[
    {...base,availableAt:"2026-05-01T12:00:00Z"},
    {...base,low:5,high:6,availableAt:"2026-08-01T12:00:00Z"},
  ];
  assert.equal(selectGuidanceAsOf(rows,{asOf:"2026-06-01T00:00:00Z"})?.low,4);
  assert.equal(selectGuidanceAsOf(rows,{asOf:"2026-09-01T00:00:00Z"})?.low,5);
  assert.equal(selectGuidanceAsOf(rows,{asOf:"invalid"}),null);
});

test("direction and aggregate diagnostic separate magnitude from breadth",()=>{
  const base={periodKey:"FY2026",metric:"EPS",basis:"GAAP",unit:"USD/SHARE"};
  const up={previous:{...base,low:4,high:4},current:{...base,low:6,high:6}};
  const same={previous:{...base,low:5,high:5},current:{...base,low:5,high:5}};
  const down={previous:{...base,low:6,high:6},current:{...base,low:3,high:3}};
  const missing={previous:{...base,low:4,high:4},current:{...base,periodKey:"FY2027",low:5,high:5}};
  assert.equal(classifyGuidanceDirection(up.current,up.previous).direction,"UP");
  assert.equal(classifyGuidanceDirection(same.current,same.previous).direction,"SAME");
  assert.equal(classifyGuidanceDirection(down.current,down.previous).direction,"DOWN");
  const out=buildGuidanceShadowDiagnostic([up,same,down,missing]);
  assert.equal(out.status,"READY");
  assert.equal(out.comparableCount,3);
  assert.equal(out.totalCount,4);
  assert.equal(out.coverage,0.75);
  assert.deepEqual(out.directions,{up:1,same:1,down:1});
  assert.equal(out.s13Raw,0);
  assert.equal(out.missingReasons.TARGET_PERIOD_MISMATCH,1);
  assert.equal(out.s12aRaw,0);
});
