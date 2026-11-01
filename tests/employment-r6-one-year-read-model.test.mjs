import assert from "node:assert/strict";
import {test} from "node:test";
import {buildEmploymentR6OneYearReadModel} from "../lib/market-score/employment-r6-one-year-read-model.mjs";
import {normalizeStoredObservation,selectAsOfRevisions} from "../lib/market-score/employment-r6-observation-reader.mjs";

const row=(id,date,value)=>({
  logicalSeriesId:id,observationDate:date,value,sourceHash:id+":"+date,
  geographyCode:"US",geographyType:"NATIONAL",
});

test("29 separate stored raw series remain distinct from strict 10-year scores",()=>{
  const observations=[
    row("U3_UNEMPLOYMENT_RATE","2025-10-31",4.7),
    row("U3_UNEMPLOYMENT_RATE","2025-11-30",4.6),
    row("U3_UNEMPLOYMENT_RATE","2026-04-30",4.4),
    row("U3_UNEMPLOYMENT_RATE","2026-09-30",4.2),
    row("U3_UNEMPLOYMENT_RATE","2026-12-31",1),
  ];
  const result=buildEmploymentR6OneYearReadModel(observations,{asOfDate:"2026-11-01"});
  const u3=result.indicators[0];
  assert.equal(result.indicators.length,29);
  assert.equal(result.summary.sourceFeatures,1);
  assert.equal(u3.rawStatus,"READY");
  assert.equal(u3.scoreStatus,"PARTIAL_HISTORY");
  assert.equal(u3.score,null);
  assert.equal(u3.value,4.2);
  assert.equal(u3.previousValue,4.4);
  assert.deepEqual(u3.history.map(p=>p.date),["2025-11-30","2026-04-30","2026-09-30"]);
  assert.equal(u3.history[1].breakBefore,true);
  assert.equal(u3.chartStatus,"READY");
  assert.equal(result.indicators[1].rawStatus,"UNAVAILABLE");
});

test("historical BED observations must never be advertised as current or plotted beyond one year",()=>{
  const rows=[
    row("BED_ESTABLISHMENT_BIRTH_RATE","2024-09-30",2),
    row("BED_ESTABLISHMENT_DEATH_RATE","2024-09-30",1),
    row("BED_ESTABLISHMENT_BIRTH_RATE","2025-06-30",2.1),
    row("BED_ESTABLISHMENT_DEATH_RATE","2025-06-30",1.2),
  ];
  const result=buildEmploymentR6OneYearReadModel(rows,{asOfDate:"2026-11-01"});
  const bed=result.indicators.at(-1);
  assert.equal(bed.value,0.9000000000000001);
  assert.equal(bed.observationDate,"2025-06-30");
  assert.equal(bed.rawStatus,"STALE");
  assert.equal(bed.chartStatus,"UNAVAILABLE");
  assert.deepEqual(bed.history,[]);
});

test("null and blank stored API values are missing, not manufactured zeroes",()=>{
  assert.equal(normalizeStoredObservation({value:null}).value,null);
  assert.equal(normalizeStoredObservation({value:""}).value,null);
  assert.equal(normalizeStoredObservation({value:"  "}).value,null);
  assert.equal(normalizeStoredObservation({value:"0"}).value,0);
  const raw=[
    {logicalSeriesId:"U3_UNEMPLOYMENT_RATE",observationDate:"2026-09-30",value:null,availableAt:"2026-10-10",retrievedAt:"2026-10-10"},
  ];
  assert.equal(selectAsOfRevisions(raw,"2026-11-01T23:59:59Z").length,0);
});

test("invalid dates and unknown storage provenance are rejected",()=>{
  assert.throws(()=>buildEmploymentR6OneYearReadModel([],{asOfDate:"2026-11-31"}),/AS_OF_INVALID_DATE/);
  assert.throws(()=>buildEmploymentR6OneYearReadModel([],{asOfDate:"2026-11-01",sourceStoredAt:Date.parse("2026-12-01")}),/SOURCE_STORED_AT_INVALID/);
});

test("one-year window clamps leap-day to February 28 and keeps a real 92-day quarter",()=>{
  const leap=buildEmploymentR6OneYearReadModel([],{asOfDate:"2024-02-29"});
  assert.deepEqual(leap.window,{
    start:"2023-02-28",end:"2024-02-29",recentQuarterStart:"2023-11-29",
  });
  const regular=buildEmploymentR6OneYearReadModel([],{asOfDate:"2026-11-01"});
  assert.deepEqual(regular.window,{
    start:"2025-11-01",end:"2026-11-01",recentQuarterStart:"2026-08-01",
  });
});
