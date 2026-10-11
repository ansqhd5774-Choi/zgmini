import test from "node:test";
import assert from "node:assert/strict";
import {
  buildS10CostPressureCoverage,
  parseBlsNetOutputSeries,
  parseBlsPpiOutputData,
  validateApprovedSicNaics3Mapping,
  validateBlsUnitLaborCostSource,
} from "../lib/market-score/earnings-e1-r5-cost-pressure-sources.mjs";

test("R14 BLS PC parser selects only 3-digit net-output industry series and computes 3M annualized output inflation",()=>{
  const series=[
    "series_id\tindustry_code\tproduct_code\tseasonal\tseries_title\tbegin_year\tbegin_period\tend_year\tend_period",
    "PCU325---325---\t325---\t325---\tU\tChemical manufacturing\t1985\tM12\t2026\tM08",
    "PCU325110325110\t325110\t325110\tU\tPetrochemical manufacturing\t1985\tM12\t2026\tM08",
    "PCU325---325---P\t325---\t325---P\tU\tChemical manufacturing primary products\t1985\tM12\t2026\tM08",
  ].join("\n");
  const meta=parseBlsNetOutputSeries(series);
  assert.equal(meta.status,"PASS");
  assert.equal(meta.naics3Count,1);
  assert.equal(meta.series[0].seriesId,"PCU325---325---");

  const data=[
    "series_id\tyear\tperiod\tvalue\tfootnote_codes",
    "PCU325---325---\t2026\tM04\t100\t",
    "PCU325---325---\t2026\tM07\t104\tP",
    "PCU325---325---\t2026\tM13\t103\t",
  ].join("\n");
  const parsed=parseBlsPpiOutputData(data,{series:meta.series,asOfMonth:"2026-10-01"});
  assert.equal(parsed.status,"PASS");
  assert.equal(parsed.series[0].latest.month,"2026-07-01");
  assert.equal(parsed.series[0].lag3m.month,"2026-04-01");
  assert.ok(Math.abs(parsed.series[0].annualized3m-400*Math.log(104/100))<1e-12);
});

test("R14 S11 validates PRS85006111 semantics and uses the published YoY percent directly",()=>{
  const series=[
    "series_id\tsector_code\tclass_code\tmeasure_code\tduration_code\tseasonal\tbase_year\tfootnote_codes\tbegin_year\tbegin_period\tend_year\tend_period",
    "PRS85006111\t8500\t6\t11\t1\tS\t-\t\t1948\tQ01\t2026\tQ02",
  ].join("\n");
  const measure="measure_code\tmeasure_text\n11\tUnit labor costs";
  const duration="duration_code\tduration_text\n1\t% Change same quarter 1 year ago";
  const data=[
    "series_id\tyear\tperiod\tvalue\tfootnote_codes",
    "PRS85006111\t2026\tQ01\t0.4\tR",
    "PRS85006111\t2026\tQ02\t1.4\t",
    "PRS85006111\t2026\tQ05\t1.0\t",
  ].join("\n");
  const report=validateBlsUnitLaborCostSource({seriesText:series,measureText:measure,durationText:duration,dataText:data});
  assert.equal(report.status,"PASS");
  assert.equal(report.measureCode,"11");
  assert.equal(report.durationCode,"1");
  assert.equal(report.latest.value,1.4);
  assert.equal(report.transform,"DIRECT_YOY_PERCENT_NO_RECALCULATION");
  assert.equal(report.annualAverageRowsSkipped,1);
});

test("R14 S10 mapping fails closed until an explicitly approved SIC to NAICS3 table exists",()=>{
  const unresolved=validateApprovedSicNaics3Mapping({rows:[{sic:2834,naics3:"325",approved:true}]});
  assert.equal(unresolved.status,"PARTIAL");
  assert.equal(unresolved.reason,"APPROVED_SIC_NAICS3_MAPPING_REQUIRED");

  const approved=validateApprovedSicNaics3Mapping({
    status:"APPROVED",
    version:"test-v1",
    rows:[
      {sic:2834,naics3:"325",approved:true},
      {sic:3571,naics3:"334",approved:true},
    ],
  });
  assert.equal(approved.status,"PASS");

  const inputSeries=[{naics:"325",annualized3m:8},{naics:"334",annualized3m:2}];
  const outputSeries=[{naics3:"325",annualized3m:3},{naics3:"334",annualized3m:4}];
  const issuerRows=[
    {sic:2834,priorYear:{revenue:300}},
    {sic:3571,priorYear:{revenue:100}},
    {sic:9999,priorYear:{revenue:100}},
  ];
  const report=buildS10CostPressureCoverage({issuerRows,approvedMapping:approved,inputSeries,outputSeries});
  assert.equal(report.status,"PASS");
  assert.equal(report.mappedIssuers,2);
  assert.equal(report.issuerCoverage,2/3);
  assert.equal(report.revenueCoverage,0.8);
  assert.equal(report.raw,3.25);
  assert.equal(report.weighting,"PRIOR_REVENUE_MAPPED_ONLY");
  assert.deepEqual(report.classification.classes,{EXACT:2,AMBIGUOUS:0,NO_NAICS:1,NO_PPI:0});
  assert.equal(report.classification.complete,true);
});

test("R15 approved mapping preserves exact ambiguous and no-NAICS classes without overlap",()=>{
  const approved=validateApprovedSicNaics3Mapping({
    status:"APPROVED",
    version:"test-v2",
    rows:[{sic:"2834",naics3:"325",approved:true},{sic:"3571",naics3:"334",approved:true}],
    ambiguous:[{sic:"1311",naics3:["211","213"],reason:"MULTIPLE_2022_NAICS3_TARGETS"}],
    noNaics:[{sic:"9998",reason:"MISSING_SIC1987_TO_NAICS2002"}],
  });
  assert.equal(approved.status,"PASS");
  assert.equal(approved.approvedRows,2);
  assert.equal(approved.ambiguousRows,1);
  assert.equal(approved.noNaicsRows,1);
  assert.equal(approved.ambiguousSics.has("1311"),true);
  assert.equal(approved.noNaicsSics.has("9998"),true);

  const conflict=validateApprovedSicNaics3Mapping({
    status:"APPROVED",
    rows:[{sic:"2834",naics3:"325",approved:true}],
    ambiguous:[{sic:"2834",naics3:["325","326"]}],
  });
  assert.equal(conflict.status,"FAIL");
  assert.equal(conflict.reason,"SIC_NAICS3_CLASS_OVERLAP");
});

test("R15 S10 classifies every issuer EXACT AMBIGUOUS NO_NAICS or NO_PPI without changing raw weighting",()=>{
  const approved=validateApprovedSicNaics3Mapping({
    status:"APPROVED",
    version:"test-v3",
    rows:[
      {sic:"2834",naics3:"325",approved:true},
      {sic:"3571",naics3:"334",approved:true},
      {sic:"4813",naics3:"517",approved:true},
    ],
    ambiguous:[{sic:"1311",naics3:["211","213"]}],
    noNaics:[{sic:"9998",reason:"NO_TARGET"}],
  });
  const issuerRows=[
    {sic:"2834",priorYear:{revenue:300}},
    {sic:"3571",priorYear:{revenue:100}},
    {sic:"4813",priorYear:{revenue:200}},
    {sic:"1311",priorYear:{revenue:150}},
    {sic:"9998",priorYear:{revenue:50}},
    {sic:null,priorYear:{revenue:50}},
  ];
  const inputSeries=[{naics:"325",annualized3m:8},{naics:"334",annualized3m:2},{naics:"517",annualized3m:6}];
  const outputSeries=[{naics3:"325",annualized3m:3},{naics3:"334",annualized3m:4}];
  const report=buildS10CostPressureCoverage({issuerRows,approvedMapping:approved,inputSeries,outputSeries});
  assert.deepEqual(report.classification.classes,{EXACT:2,AMBIGUOUS:1,NO_NAICS:2,NO_PPI:1});
  assert.equal(report.classification.total,6);
  assert.equal(report.classification.classified,6);
  assert.equal(report.classification.complete,true);
  assert.equal(report.reasons.AMBIGUOUS_NAICS3,1);
  assert.equal(report.reasons.NO_SIC,1);
  assert.equal(report.reasons.NO_APPROVED_NAICS3,1);
  assert.equal(report.reasons.NO_OUTPUT_PPI,1);
  assert.equal(report.mappedIssuers,2);
  assert.equal(report.mappedRevenue,400);
  assert.equal(report.eligibleRevenue,850);
  assert.equal(report.raw,3.25);
});
