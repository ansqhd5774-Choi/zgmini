import assert from "node:assert/strict";
import {test} from "node:test";
import {
  latestDolClaimsReleaseAt,
  latestFixedReleaseAt,
  nextDolClaimsReleaseAt,
  releasePlanForGroup,
} from "../lib/market-score/employment-r6-scheduler.mjs";
import {parseBlsR6Rows} from "../lib/market-score/employment-r6-provider.mjs";

test("official DOL Thanksgiving Wednesday supersedes the normal Thursday release",()=>{
  assert.equal(latestDolClaimsReleaseAt("2026-11-25T13:29:59Z").toISOString(),"2026-11-19T13:30:00.000Z");
  assert.equal(latestDolClaimsReleaseAt("2026-11-25T13:30:00Z").toISOString(),"2026-11-25T13:30:00.000Z");
  assert.equal(latestDolClaimsReleaseAt("2026-11-26T15:00:00Z").toISOString(),"2026-11-25T13:30:00.000Z");
  assert.equal(latestDolClaimsReleaseAt("2026-12-03T13:30:00Z").toISOString(),"2026-12-03T13:30:00.000Z");
  const before=releasePlanForGroup("DOL_UI_WEEKLY_CLAIMS",{now:"2026-11-25T13:44:59Z"});
  assert.equal(before.status,"WAITING_FOR_COLLECTION_WINDOW");
  const due=releasePlanForGroup("DOL_UI_WEEKLY_CLAIMS",{now:"2026-11-25T13:45:00Z"});
  assert.equal(due.status,"DUE");
  assert.equal(due.releaseAt,"2026-11-25T13:30:00.000Z");
  const stored=releasePlanForGroup("DOL_UI_WEEKLY_CLAIMS",{
    now:"2026-11-26T16:00:00Z",
    latestRun:{status:"SUCCESS",detail_json:JSON.stringify({
      releaseAt:due.releaseAt,latestInitialClaimsObservationDate:"2026-11-21",
      latestNationalSeriesObservationDates:{
        INITIAL_CLAIMS:"2026-11-21",INITIAL_CLAIMS_4W:"2026-11-21",
        CONTINUED_CLAIMS:"2026-11-14",INSURED_UNEMPLOYMENT_RATE:"2026-11-14",
      },
    })},
  });
  assert.equal(stored.status,"RELEASE_ALREADY_STORED");
});

test("DOL official 2027 Veterans Day and Thanksgiving exceptions preserve ET timing",()=>{
  assert.equal(latestDolClaimsReleaseAt("2027-11-11T16:00:00Z").toISOString(),"2027-11-10T13:30:00.000Z");
  assert.equal(latestDolClaimsReleaseAt("2027-11-25T16:00:00Z").toISOString(),"2027-11-24T13:30:00.000Z");
});

test("future DOL dates respect the same official Wednesday exceptions and stop beyond 2027",()=>{
  assert.equal(nextDolClaimsReleaseAt("2026-11-02T23:59:59Z").toISOString(),"2026-11-05T13:30:00.000Z");
  assert.equal(nextDolClaimsReleaseAt("2026-11-24T23:59:59Z").toISOString(),"2026-11-25T13:30:00.000Z");
  assert.equal(nextDolClaimsReleaseAt("2027-11-09T23:59:59Z").toISOString(),"2027-11-10T13:30:00.000Z");
  assert.equal(nextDolClaimsReleaseAt("2028-01-01T00:00:00Z"),null);
});

test("2027 BLS Employment Situation and ECI use official dates without guessing other groups",()=>{
  assert.equal(latestFixedReleaseAt("BLS_EMPLOYMENT_SITUATION","2027-01-08T13:30:00Z").toISOString(),"2027-01-08T13:30:00.000Z");
  assert.equal(latestFixedReleaseAt("BLS_ECI","2027-01-29T13:30:00Z").toISOString(),"2027-01-29T13:30:00.000Z");
  assert.equal(releasePlanForGroup("BLS_EMPLOYMENT_SITUATION",{now:"2027-01-09T16:00:00Z"}).status,"DUE");
  // No official 2027 JOLTS calendar has been published: no fabricated new event.
  assert.equal(latestFixedReleaseAt("BLS_JOLTS","2027-02-01T16:00:00Z").toISOString(),"2026-12-01T15:00:00.000Z");
  assert.equal(latestFixedReleaseAt("BLS_BED","2027-01-27T15:00:00Z").toISOString(),"2027-01-27T15:00:00.000Z");
  assert.equal(releasePlanForGroup("BLS_BED",{now:"2027-01-28T18:00:00Z"}).status,"DUE");
});

test("mixed state and metro group recognizes both published 2026 release days",()=>{
  assert.equal(latestFixedReleaseAt("BLS_STATE_MSA","2026-11-20T15:00:00Z").toISOString(),"2026-11-20T15:00:00.000Z");
  assert.equal(latestFixedReleaseAt("BLS_STATE_MSA","2026-12-02T15:00:00Z").toISOString(),"2026-12-02T15:00:00.000Z");
  assert.equal(releasePlanForGroup("BLS_STATE_MSA",{now:"2026-11-21T18:00:00Z"}).status,"DUE");
});

test("state/metro combined fetch keeps each source's actual release date stable",()=>{
  const payload={Results:{series:[
    {seriesID:"SMS00000000000000022",data:[{year:"2026",period:"M10",value:"50.0"}]},
    {seriesID:"SMS99999990000000022",data:[{year:"2026",period:"M09",value:"48.0"}]},
  ]}};
  const parse=releaseAt=>parseBlsR6Rows(payload,{
    releaseGroup:"BLS_STATE_MSA",releaseAt,retrievedAt:"2026-12-03T18:00:00.000Z",
  }).rows;
  const stateDay=parse("2026-11-20T15:00:00.000Z");
  const metroDay=parse("2026-12-02T15:00:00.000Z");
  const released=(rows,id)=>rows.find(x=>x.providerSeriesId===id)?.releaseDate;
  assert.equal(released(stateDay,"SMS00000000000000022"),"2026-11-20T15:00:00.000Z");
  assert.equal(released(stateDay,"SMS99999990000000022"),"2026-10-28T14:00:00.000Z");
  assert.equal(released(metroDay,"SMS00000000000000022"),"2026-11-20T15:00:00.000Z");
  // API still reports September in December: this remains October's release.
  assert.equal(released(metroDay,"SMS99999990000000022"),"2026-10-28T14:00:00.000Z");
  const advanced=structuredClone(payload);
  advanced.Results.series[1].data=[{year:"2026",period:"M10",value:"49.0"}];
  const advancedRows=parseBlsR6Rows(advanced,{
    releaseGroup:"BLS_STATE_MSA",releaseAt:"2026-12-02T15:00:00.000Z",retrievedAt:"2026-12-03T18:00:00.000Z",
  }).rows;
  assert.equal(released(advancedRows,"SMS99999990000000022"),"2026-12-02T15:00:00.000Z");
  // The unchanged state observation must not acquire a synthetic metro-date revision.
  assert.equal(stateDay[0].value,metroDay[0].value);
  assert.equal(stateDay[0].releaseDate,metroDay[0].releaseDate);
});


test("DOL success must carry current-release observation proof before suppressing another attempt",()=>{
  const releaseAt="2026-11-05T13:30:00.000Z";
  const plan=detail=>releasePlanForGroup("DOL_UI_WEEKLY_CLAIMS",{
    now:"2026-11-06T12:00:00Z",
    latestRun:{status:"SUCCESS",detail_json:JSON.stringify({releaseAt,...detail})},
  });
  assert.equal(plan({}).status,"DUE");
  assert.equal(plan({latestInitialClaimsObservationDate:"2026-10-10"}).status,"DUE");
  // A legacy single-series success can no longer suppress a release.
  assert.equal(plan({latestInitialClaimsObservationDate:"2026-10-31"}).status,"DUE");
  assert.equal(plan({
    latestInitialClaimsObservationDate:"2026-10-31",
    latestNationalSeriesObservationDates:{
      INITIAL_CLAIMS:"2026-10-31",INITIAL_CLAIMS_4W:"2026-10-31",
      CONTINUED_CLAIMS:"2026-10-24",INSURED_UNEMPLOYMENT_RATE:"2026-10-24",
    },
  }).status,"RELEASE_ALREADY_STORED");
  assert.equal(plan({
    latestInitialClaimsObservationDate:"2026-10-31",
    latestNationalSeriesObservationDates:{
      INITIAL_CLAIMS:"2026-10-31",INITIAL_CLAIMS_4W:"2026-10-31",
      CONTINUED_CLAIMS:"2026-09-05",INSURED_UNEMPLOYMENT_RATE:"2026-10-24",
    },
  }).status,"DUE");
});

test("W04 PIT-04-07 R6 BLS month/quarter parser refuses normalized or malformed years",()=>{
  const retrievedAt="2026-11-18T00:00:00.000Z";
  const cases=[
    {group:"BLS_EMPLOYMENT_SITUATION",id:"LNS14000000",
      good:{year:"2026",period:"M10",value:"4.1"},
      bad:[{year:"0099",period:"M10",value:"4.0"},
        {year:"2026.5",period:"M10",value:"4.0"},
        {year:"INVALID",period:"M10",value:"4.0"},
        {year:"2026",period:"M13",value:"4.0"}],
      expected:"2026-10-31"},
    {group:"BLS_ECI",id:"CIU1010000000000A",
      good:{year:"2026",period:"Q03",value:"3.4"},
      bad:[{year:"0099",period:"Q04",value:"3.4"},
        {year:"2026.5",period:"Q04",value:"3.4"},
        {year:"INVALID",period:"Q04",value:"3.4"},
        {year:"2026",period:"Q05",value:"3.4"}],
      expected:"2026-09-30"},
  ];
  for(const {group,id,good,bad,expected} of cases){
    const opts={releaseGroup:group,retrievedAt,requestedSeriesIds:[id]};
    const input=data=>({Results:{series:[{seriesID:id,data}]}});
    const parsed=parseBlsR6Rows(input([...bad,good]),opts);
    assert.deepEqual(parsed.rows.map(row=>row.observationDate),[expected]);
    assert.deepEqual(parsed.returnedSeries,[id]);
    assert.deepEqual(parsed.missingSeries,[]);
    const missing=parseBlsR6Rows(input(bad),opts);
    assert.deepEqual(missing.rows,[]);
    assert.deepEqual(missing.returnedSeries,[]);
    assert.deepEqual(missing.missingSeries,[id]);
  }
});

test("W04 PIT-04-07 R6 BLS diffusion keeps 0..100 decimals, never promotes invalid latest",()=>{
  const retrievedAt="2026-11-18T00:00:00.000Z";
  for(const id of ["CES0500000022","SMS00000000000000022","SMS99999990000000022"]){
    const group=id.startsWith("CES")?"BLS_EMPLOYMENT_SITUATION":"BLS_STATE_MSA";
    const opts={releaseGroup:group,retrievedAt,requestedSeriesIds:[id]};
    const data=[
      {year:"2026",period:"M04",value:"100.0"},
      {year:"2026",period:"M05",value:0},
      {year:"2026",period:"M06",value:"0.5"},
      {year:"2026",period:"M07",value:null},
      {year:"2026",period:"M08",value:""},
      {year:"2026",period:"M09",value:"101"},
      {year:"2026",period:"M10",value:"-1"},
      {year:"2026",period:"M11",value:"0x10"},
      {year:"2026",period:"M12",value:"1e2"},
    ];
    const input=values=>({Results:{series:[{seriesID:id,data:values}]}});
    const parsed=parseBlsR6Rows(input(data),opts);
    assert.deepEqual(parsed.rows.map(row=>row.observationDate),
      ["2026-04-30","2026-05-31","2026-06-30"]);
    assert.deepEqual(parsed.rows.map(row=>row.value),[100,0,0.5]);
    assert.equal(parsed.rows.filter(row=>row.availableAt===retrievedAt).length,1);
    assert.equal(parsed.rows.at(-1).observationDate,"2026-06-30");
    const missing=parseBlsR6Rows(input(data.slice(3)),opts);
    assert.deepEqual(missing.rows,[]);
    assert.deepEqual(missing.missingSeries,[id]);
  }
});

test("W04 PIT-04-07 R6 non-diffusion employment values retain existing decimal and grouped parsing",()=>{
  const id="CES0000000001";
  const parsed=parseBlsR6Rows({Results:{series:[{seriesID:id,data:[
    {year:"2026",period:"M09",value:"158,450"},
    {year:"2026",period:"M10",value:"158451.5"},
  ]}]}},{releaseGroup:"BLS_EMPLOYMENT_SITUATION",
    retrievedAt:"2026-11-18T00:00:00.000Z",requestedSeriesIds:[id]});
  assert.deepEqual(parsed.rows.map(row=>row.value),[158450,158451.5]);
  assert.deepEqual(parsed.missingSeries,[]);
});
