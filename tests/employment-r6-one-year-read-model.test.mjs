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

test("historical PIT selection never leaks a revision retrieved after the score as-of",()=>{
  const common={
    logicalSeriesId:"U3_UNEMPLOYMENT_RATE",observationDate:"2026-10-31",
    geographyCode:"US",geographyType:"NATIONAL",
    availableAt:"2026-11-01T09:00:00.000Z",
  };
  const prior={...common,value:4.1,sourceHash:"prior",
    retrievedAt:"2026-11-01T09:30:00.000Z"};
  const later={...common,value:4.2,sourceHash:"later",
    retrievedAt:"2026-11-03T09:30:00.000Z"};
  const cutoff="2026-11-02T23:59:59.999Z";
  assert.deepEqual(selectAsOfRevisions([prior,later],cutoff).map(x=>x.value),[4.1]);
  assert.deepEqual(selectAsOfRevisions([later],cutoff),[]);
  assert.deepEqual(selectAsOfRevisions([prior,later],"2026-11-03T23:59:59.999Z")
    .map(x=>x.value),[4.2]);
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

test("all 29 features show only confirmed ET release dates, with ETA539 dates withheld",()=>{
  const payload=buildEmploymentR6OneYearReadModel([],{asOfDate:"2026-11-02"});
  const byId=new Map(payload.indicators.map(x=>[x.id,x]));
  const cases=[
    ["U3_UNEMPLOYMENT","월간(ET)","2026-11-06"],
    ["AHE_YOY","월간(ET)","2026-11-06"],
    ["INDUSTRY_DIFFUSION_3M","월간(ET)","2026-11-06"],
    ["INITIAL_CLAIMS","주간(ET)","2026-11-05"],
    ["STATE_CLAIMS_BREADTH","주간 관측",null],
    ["JOLTS_OPENINGS_RATE","월간(ET)","2026-11-03"],
    ["ECI_12M","분기(ET)","2027-01-29"],
    ["STATE_EMP_DIFFUSION_3M","월간(ET)","2026-11-20"],
    ["MSA_EMP_DIFFUSION_3M","월간(ET)","2026-12-02"],
    ["BED_GROSS_GAINS_RATE","분기(ET)","2027-01-27"],
  ];
  for(const [id,cadence,nextDate] of cases){
    assert.equal(byId.get(id)?.releaseCadence,cadence,id);
    assert.equal(byId.get(id)?.nextReleaseDate,nextDate,id);
  }
  assert.equal(payload.indicators.length,29);
  assert.equal(payload.indicators.filter(x=>x.nextReleaseDate!==null).length,28);
  const later=buildEmploymentR6OneYearReadModel([],{asOfDate:"2027-02-01"});
  assert.equal(later.indicators.find(x=>x.id==="JOLTS_OPENINGS_RATE").nextReleaseDate,null);
  assert.equal(later.indicators.find(x=>x.id==="MSA_EMP_DIFFUSION_3M").nextReleaseDate,null);
});

test("source access date follows verified raw inputs, not observation or publication date",()=>{
  const rows=[
    {...row("PAYEMS_LEVEL","2026-08-31",159000),retrievedAt:"2026-10-01T09:00:00.000Z"},
    {...row("PAYEMS_LEVEL","2026-09-30",159100),retrievedAt:"2026-10-10T10:00:00.000Z"},
  ];
  const result=buildEmploymentR6OneYearReadModel(rows,{asOfDate:"2026-11-01"});
  const payroll=result.indicators.find(x=>x.id==="PAYEMS_MOM");
  assert.equal(payroll.value,100);
  assert.equal(payroll.retrievedAt,"2026-10-10T10:00:00.000Z");
  assert.equal(result.indicators[0].retrievedAt,null);
  rows[0].retrievedAt=null;
  assert.equal(buildEmploymentR6OneYearReadModel(rows,{asOfDate:"2026-11-01"})
    .indicators.find(x=>x.id==="PAYEMS_MOM").retrievedAt,null);
});

test("missing a payroll month cannot become a fabricated latest monthly change, 3M mean, or acceleration",()=>{
  const raw=[
    ["2026-04-30",90],["2026-05-31",100],["2026-06-30",110],
    ["2026-07-31",120],["2026-08-31",130],["2026-10-31",160],
  ].map(([date,value])=>row("PAYEMS_LEVEL",date,value));
  const result=buildEmploymentR6OneYearReadModel(raw,{asOfDate:"2026-11-01"});
  for(const [id,value] of [["PAYEMS_MOM",10],["PAYEMS_3M_AVG",10],["PAYEMS_ACCEL",0]]){
    const item=result.indicators.find(x=>x.id===id);
    assert.equal(item.value,value,id);
    assert.equal(item.observationDate,"2026-08-31",id);
    assert.equal(item.scoreStatus,"PARTIAL_HISTORY",id);
    assert(!item.history.some(p=>p.date==="2026-10-31"),id+" must never treat two months as one");
  }
  // After collection resumes, three genuine consecutive monthly deltas are
  // required again before the 3M average becomes available.
  const resumed=[
    ...raw,row("PAYEMS_LEVEL","2026-11-30",170),
    row("PAYEMS_LEVEL","2026-12-31",180),row("PAYEMS_LEVEL","2027-01-31",190),
  ];
  const later=buildEmploymentR6OneYearReadModel(resumed,{asOfDate:"2027-02-01"});
  const mean=later.indicators.find(x=>x.id==="PAYEMS_3M_AVG");
  assert.equal(mean.observationDate,"2027-01-31");
  assert(!mean.history.some(p=>["2026-10-31","2026-11-30","2026-12-31"].includes(p.date)));
});

test("hourly earnings year-over-year comparison uses the matching calendar month, never the 12th available row",()=>{
  const ahe=[];
  for(let month=1;month<=12;month++){
    if(month===2)continue;
    const date=new Date(Date.UTC(2025,month,0)).toISOString().slice(0,10);
    ahe.push(row("AHE_TOTAL_PRIVATE",date,100+month));
  }
  ahe.push(row("AHE_TOTAL_PRIVATE","2026-01-31",150));
  ahe.push(row("AHE_TOTAL_PRIVATE","2026-02-28",151));
  const item=buildEmploymentR6OneYearReadModel(ahe,{asOfDate:"2026-03-01"})
    .indicators.find(x=>x.id==="AHE_YOY");
  assert.equal(item.observationDate,"2026-01-31");
  assert(Math.abs(item.value-(100*(150/101-1)))<1e-9);
  assert(!item.history.some(p=>p.date==="2026-02-28"));
});

test("ETA 539 breadth refuses 52-observed-week substitutions when a whole calendar week is absent",()=>{
  const all=[];
  const start=Date.UTC(2025,7,2),week=7*86400000;
  for(let i=0;i<60;i++){
    const date=new Date(start+i*week).toISOString().slice(0,10);
    for(let s=0;s<51;s++){
      all.push({...row("STATE_INITIAL_CLAIMS",date,100+s),
        geographyType:"STATE",geographyCode:"S"+String(s).padStart(2,"0"),
        sourceHash:"S"+s+":"+date});
    }
  }
  const dense=buildEmploymentR6OneYearReadModel(all,{asOfDate:"2026-11-01"})
    .indicators.find(x=>x.id==="STATE_CLAIMS_BREADTH");
  assert.equal(dense.rawStatus,"READY");
  const missingWeek=new Date(start+10*week).toISOString().slice(0,10);
  const gap=buildEmploymentR6OneYearReadModel(
    all.filter(p=>p.observationDate!==missingWeek),{asOfDate:"2026-11-01"},
  ).indicators.find(x=>x.id==="STATE_CLAIMS_BREADTH");
  assert.equal(gap.rawStatus,"UNAVAILABLE");
  assert.equal(gap.value,null);
});
