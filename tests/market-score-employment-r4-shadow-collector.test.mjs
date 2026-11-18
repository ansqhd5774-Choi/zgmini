import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { collectEmploymentR4Shadow } from "../lib/market-score/employment-r4-shadow-collector.mjs";
import { createEmploymentR4ShadowProvider, parseEta539ShadowRows, parseBlsDiffusionShadowRows } from "../lib/market-score/employment-r4-shadow-provider.mjs";
import { EMPLOYMENT_R4_CORE_STATES, EMPLOYMENT_R4_DIFFUSION_SERIES, EMPLOYMENT_R4_PIT_CLASSES, EMPLOYMENT_R4_SHADOW_TABLES } from "../lib/market-score/employment-r4-shadow-contract.mjs";

function sqliteD1(){
  const sqlite=new DatabaseSync(":memory:");
  const db={prepare(sql){const p=sqlite.prepare(sql);function w(values=[]){return{bind(...n){return w(n)},async run(){return p.run(...values)},async first(){return p.get(...values)},async all(){return{results:p.all(...values)}}}}return w([])},async batch(ss){sqlite.exec("BEGIN");try{const r=[];for(const s of ss)r.push(await s.run());sqlite.exec("COMMIT");return r}catch(e){sqlite.exec("ROLLBACK");throw e}}};
  return{sqlite,db};
}
function claimsCsv(){
  const lines=["st,rptdate,c1,c2,c3,c8"];
  for(const [wi,date] of [[1,"09/05/2026"],[2,"09/12/2026"]])for(let i=0;i<EMPLOYMENT_R4_CORE_STATES.length;i++)lines.push(`${EMPLOYMENT_R4_CORE_STATES[i]},09/19/2026,${wi},${date},${1000+i+wi},9000`);
  lines.push("PR,09/19/2026,2,09/12/2026,9999,9999");
  return lines.join("\n");
}
function blsPayload(){return{Results:{series:Object.entries(EMPLOYMENT_R4_DIFFUSION_SERIES).map(([seriesID],idx)=>({seriesID,data:[{year:"2026",period:"M08",value:String(55+idx),footnotes:[]},{year:"2026",period:"M07",value:String(50+idx),footnotes:[]}]}))}}}

test("provider parsers preserve 51-state core and mark only latest provider observation FORWARD",async()=>{
  const rt="2026-09-20T00:00:00.000Z";
  const c=await parseEta539ShadowRows(claimsCsv(),{retrievedAt:rt,historyWeeks:2});
  assert.equal(c.rows.length,102);assert.equal(new Set(c.rows.map(x=>x.geographyCode)).size,51);assert.ok(!c.rows.some(x=>x.geographyCode==="PR"));
  assert.equal(c.rows.filter(x=>x.pitClass===EMPLOYMENT_R4_PIT_CLASSES.forwardObserved).length,51);
  const d=await parseBlsDiffusionShadowRows(blsPayload(),{retrievedAt:rt});
  assert.equal(d.rows.length,16);assert.equal(d.rows.filter(x=>x.pitClass===EMPLOYMENT_R4_PIT_CLASSES.forwardObserved).length,8);
  assert.equal(d.rows.filter(x=>x.availableAt===rt).length,8);
});

test("W04 PIT-04-07 rejects missing ETA539 C3 without inventing zero or a complete week",async()=>{
  const retrievedAt="2026-11-01T00:00:00.000Z";
  const csvFor=c3=>["st,rptdate,c1,c2,c3,c8",
    ...EMPLOYMENT_R4_CORE_STATES.map(st=>
      `${st},10/30/2026,2,10/24/2026,${st==="AL"?c3:"300"},9000`)].join("\n");
  for(const missing of ["","  ","\t"]){
    const parsed=await parseEta539ShadowRows(csvFor(missing),{retrievedAt});
    assert.equal(parsed.rows.length,0,"missing state must block a false 51-state week");
    assert.equal(parsed.meta.latestCompleteWeek,null);
    assert.equal(parsed.rows.some(row=>row.geographyCode==="AL"&&row.value===0),false);
  }
  const valid=await parseEta539ShadowRows(csvFor("0"),{retrievedAt});
  assert.equal(valid.rows.length,51,"genuine zero does not remove a state");
  assert.equal(valid.meta.latestCompleteWeek,"2026-10-24");
  assert.equal(valid.rows.find(row=>row.geographyCode==="AL")?.value,0);
  assert.equal(valid.rows.every(row=>typeof row.value==="number"&&Number.isFinite(row.value)),true);
});

test("W04 PIT-04-07 latest missing state falls back only to an earlier complete 51-state week",async()=>{
  const lines=["st,rptdate,c1,c2,c3,c8"];
  for(const week of ["10/17/2026","10/24/2026"]){
    for(const st of EMPLOYMENT_R4_CORE_STATES){
      const amount=week==="10/24/2026"&&st==="AL"?" ":st==="AK"?"0":"300";
      lines.push(`${st},10/30/2026,2,${week},${amount},9000`);
    }
  }
  const parsed=await parseEta539ShadowRows(lines.join("\n"),{
    retrievedAt:"2026-11-01T00:00:00.000Z",historyWeeks:2});
  assert.equal(parsed.meta.latestCompleteWeek,"2026-10-17");
  assert.equal(parsed.rows.length,51);
  assert.equal(parsed.rows.some(row=>row.observationDate==="2026-10-24"),false);
  assert.equal(parsed.rows.find(row=>row.geographyCode==="AK")?.value,0);
});

test("W04 PIT-04-07 impossible ETA539 dates cannot normalize into a fabricated complete week",async()=>{
  const csvFor=(week,report="10/30/2026")=>["st,rptdate,c1,c2,c3,c8",
    ...EMPLOYMENT_R4_CORE_STATES.map(st=>`${st},${report},2,${week},300,9000`)].join("\n");
  for(const impossible of ["02/30/2026","2026-02-30","02/29/2026",
    "11/31/2026","2026-13-01","00/24/2026","2026-00-24"]){
    const parsed=await parseEta539ShadowRows(csvFor(impossible),{
      retrievedAt:"2026-11-01T00:00:00.000Z"});
    assert.equal(parsed.rows.length,0,impossible);
    assert.equal(parsed.meta.latestCompleteWeek,null,impossible);
  }
  const leapReport=await parseEta539ShadowRows(csvFor("02/24/2024","02/29/2024"),{
    retrievedAt:"2024-03-01T00:00:00.000Z"});
  assert.equal(leapReport.rows.length,51,"valid leap-day report metadata is retained");
  assert.equal(leapReport.meta.latestCompleteWeek,"2024-02-24");
  assert.ok(leapReport.rows.every(row=>row.sourceRevision==="ETA539:RPTDATE:2024-02-29"));
});

test("W04 PIT-04-07 accepts exact zero and grouped integer counts, rejects other c3 encodings",async()=>{
  const csvFor=token=>["st,rptdate,c1,c2,c3,c8",
    ...EMPLOYMENT_R4_CORE_STATES.map(st=>
      `${st},10/30/2026,2,10/24/2026,${st==="AL"?token:"300"},9000`)].join("\n");
  for(const bad of ["-1","+1","1.5","1e3","0x10","NaN","1,2","1,23,456",
    "9007199254740992"]){
    const csvToken=bad.includes(",")?`"${bad}"`:bad;
    const parsed=await parseEta539ShadowRows(csvFor(csvToken),{
      retrievedAt:"2026-11-01T00:00:00.000Z"});
    assert.equal(parsed.rows.length,0,bad+" must not fabricate a 51-state week");
    assert.equal(parsed.meta.latestCompleteWeek,null,bad);
  }
  for(const [token,expected] of [["0",0],["000",0],['"1,234"',1234],["1234",1234]]){
    const parsed=await parseEta539ShadowRows(csvFor(token),{
      retrievedAt:"2026-11-01T00:00:00.000Z"});
    assert.equal(parsed.rows.length,51,token);
    assert.equal(parsed.meta.latestCompleteWeek,"2026-10-24",token);
    assert.equal(parsed.rows.find(row=>row.geographyCode==="AL")?.value,expected,token);
  }
});


test("W04 PIT-04-07 BLS diffusion preserves real zero but rejects null/blank observations",async()=>{
  const id=Object.keys(EMPLOYMENT_R4_DIFFUSION_SERIES)[0];
  const mk=(month,value)=>({year:"2026",period:`M${month}`,value,footnotes:[]});
  const data=[mk("09",null),mk("08",""),mk("07","  "),mk("06",0),mk("05","0.0"),mk("04","61.2")];
  const parsed=await parseBlsDiffusionShadowRows({Results:{series:[{seriesID:id,data}]}},{
    retrievedAt:"2026-10-01T00:00:00.000Z"
  });
  assert.deepEqual(parsed.rows.map(row=>row.observationDate),[
    "2026-04-30","2026-05-31","2026-06-30"
  ]);
  assert.deepEqual(parsed.rows.map(row=>row.value),[61.2,0,0]);
  assert.equal(parsed.rows.filter(row=>row.pitClass===EMPLOYMENT_R4_PIT_CLASSES.forwardObserved).length,1);
  assert.equal(parsed.rows.at(-1).availableAt,"2026-10-01T00:00:00.000Z");
  assert.deepEqual(parsed.meta.seriesReturned,[id]);
  const missing=await parseBlsDiffusionShadowRows({
    Results:{series:[{seriesID:id,data:[mk("09",null),mk("08",""),mk("07","  "),mk("06",undefined)]}]}
  },{retrievedAt:"2026-10-01T00:00:00.000Z"});
  assert.equal(missing.rows.length,0);
  assert.deepEqual(missing.meta.seriesReturned,[]);
});

test("W04 PIT-04-07 BLS blank latest does not suppress fallback for missing diffusion series",async()=>{
  const ids=Object.keys(EMPLOYMENT_R4_DIFFUSION_SERIES);
  const missingId=ids[0], calls=[];
  const fetchImpl=async(url,opts={})=>{
    const method=opts.method??"GET";
    calls.push({url:String(url),method});
    if(method==="POST"){
      const payload=blsPayload();
      const bad=payload.Results.series.find(s=>s.seriesID===missingId);
      bad.data=[{year:"2026",period:"M09",value:null},{year:"2026",period:"M08",value:"  "}];
      return {ok:true,status:200,async json(){return payload}};
    }
    assert.equal(decodeURIComponent(String(url).split("/").at(-1)),missingId);
    return {ok:true,status:200,async json(){
      return {Results:{series:[{seriesID:missingId,data:[{year:"2026",period:"M09",value:"0"}]}]}};
    }};
  };
  const provider=createEmploymentR4ShadowProvider({fetchImpl,now:()=>new Date("2026-10-01T00:00:00.000Z")});
  const out=await provider.fetchGeographicDiffusion();
  assert.equal(out.requestCount,2);
  assert.equal(out.transport.primaryReturned,7);
  assert.equal(out.transport.fallbackRequests,1);
  assert.equal(out.meta.seriesReturned.length,8);
  assert.equal(out.rows.find(row=>row.providerSeriesId===missingId)?.value,0);
  assert.equal(calls.filter(x=>x.method==="GET").length,1);
});


test("W04 PIT-04-07 BLS diffusion rejects normalized years and out-of-range/non-decimal index values",async()=>{
  const id=Object.keys(EMPLOYMENT_R4_DIFFUSION_SERIES)[0];
  const row=(year,period,value)=>({year,period,value,footnotes:[]});
  const data=[
    row("2026","M04","100.0"),
    row("2026","M05",0),
    row("2026","M06",null),
    row("2026","M07","101"),
    row("2026","M08",-1),
    row("2026","M09","0x10"),
    row("2026","M10","1e2"),
    row("2026","M11","+50"),
    row("2026","M12","50%"),
    row("0099","M07","60"),
    row("2026.5","M07","60"),
    row("invalid","M07","60"),
    row("2026","M00","60"),
    row("2026","M13","60"),
  ];
  const result=await parseBlsDiffusionShadowRows({
    Results:{series:[{seriesID:id,data}]}
  },{retrievedAt:"2026-12-01T00:00:00.000Z"});
  assert.deepEqual(result.rows.map(r=>r.observationDate),["2026-04-30","2026-05-31"]);
  assert.deepEqual(result.rows.map(r=>r.value),[100,0]);
  assert.equal(result.rows.filter(r=>r.pitClass===EMPLOYMENT_R4_PIT_CLASSES.forwardObserved).length,1);
  assert.equal(result.rows.at(-1).availableAt,"2026-12-01T00:00:00.000Z");
  assert.deepEqual(result.meta.seriesReturned,[id]);
});

test("W04 PIT-04-07 BLS all-invalid year and numeric inputs remain missing",async()=>{
  const id=Object.keys(EMPLOYMENT_R4_DIFFUSION_SERIES)[0];
  const data=[
    {year:"0099",period:"M01",value:"0"},
    {year:"invalid",period:"M02",value:"1"},
    {year:"2026",period:"M03",value:false},
    {year:"2026",period:"M04",value:"-1"},
    {year:"2026",period:"M05",value:"101"},
    {year:"2026",period:"M06",value:""},
  ];
  const parsed=await parseBlsDiffusionShadowRows({
    Results:{series:[{seriesID:id,data}]}
  },{retrievedAt:"2026-12-01T00:00:00.000Z"});
  assert.equal(parsed.rows.length,0);
  assert.deepEqual(parsed.meta.seriesReturned,[]);
});

function sampleRow(logicalSeriesId,geo,value,hashChar="a"){return{logicalSeriesId,provider:"TEST",providerSeriesId:`TEST:${logicalSeriesId}`,geographyType:"STATE",geographyCode:geo,frequency:"WEEKLY",unit:"COUNT",seasonalAdjustment:"NA",populationCoverage:"TEST",observationDate:"2026-09-12",releaseDate:null,availableAt:"2026-09-20T00:00:00Z",retrievedAt:"2026-09-20T00:00:00Z",value,sourceRevision:null,sourceHash:hashChar.repeat(64),qualityStatus:"READY",pitClass:EMPLOYMENT_R4_PIT_CLASSES.forwardObserved,schemaVersion:1,provenance:{}}}
function goodProvider(value=10){return{async fetchStateClaims(){return{requestCount:1,rows:[sampleRow("STATE_INITIAL_CLAIMS","AL",value,"a")],meta:{}}},async fetchGeographicDiffusion(){return{requestCount:1,rows:[sampleRow("STATE_EMP_DIFFUSION_3M","ALL_STATES",60,"b")],meta:{}}}}}

test("collector is store-only; repeat is NOOP/history-dedup; RUN recorded",async()=>{
  const {sqlite,db}=sqliteD1();let tick=0;const now=()=>new Date(`2026-09-20T00:00:0${tick++}Z`);
  const first=await collectEmploymentR4Shadow({db,provider:goodProvider(),now});
  assert.equal(first.status,"SUCCESS");assert.equal(first.scoreComputed,false);assert.equal(first.providerRequests,2);assert.equal(first.inserted,2);
  const h1=sqlite.prepare(`SELECT COUNT(*) n FROM ${EMPLOYMENT_R4_SHADOW_TABLES.history}`).get().n;
  const second=await collectEmploymentR4Shadow({db,provider:goodProvider(),now});
  const h2=sqlite.prepare(`SELECT COUNT(*) n FROM ${EMPLOYMENT_R4_SHADOW_TABLES.history}`).get().n;
  assert.equal(second.noop,2);assert.equal(h2,h1);
  assert.equal(sqlite.prepare(`SELECT COUNT(*) n FROM ${EMPLOYMENT_R4_SHADOW_TABLES.runs}`).get().n,2);
  sqlite.close();
});

test("partial upstream failure never deletes valid CURRENT rows",async()=>{
  const {sqlite,db}=sqliteD1();let tick=0;const now=()=>new Date(`2026-09-20T01:00:0${tick++}Z`);
  await collectEmploymentR4Shadow({db,provider:goodProvider(),now});
  const before=sqlite.prepare(`SELECT COUNT(*) n FROM ${EMPLOYMENT_R4_SHADOW_TABLES.current}`).get().n;
  const partial=goodProvider();partial.fetchStateClaims=async()=>{throw new Error("HTTP_503")};
  const out=await collectEmploymentR4Shadow({db,provider:partial,now});
  assert.equal(out.status,"PARTIAL");
  const after=sqlite.prepare(`SELECT COUNT(*) n FROM ${EMPLOYMENT_R4_SHADOW_TABLES.current}`).get().n;
  assert.equal(after,before);
  sqlite.close();
});

function claimsCsvWeeks(weeks){
  const lines=["st,rptdate,c1,c2,c3,c8"];
  for(let wi=0;wi<weeks.length;wi++){
    const date=weeks[wi],report=date;
    for(let i=0;i<EMPLOYMENT_R4_CORE_STATES.length;i++){
      lines.push(`${EMPLOYMENT_R4_CORE_STATES[i]},${report},${wi+1},${date},${1000+i+wi},9000`);
    }
  }
  return lines.join("\n");
}
function blsPayloadMonths(months){
  return {Results:{series:Object.entries(EMPLOYMENT_R4_DIFFUSION_SERIES).map(([seriesID],idx)=>({
    seriesID,
    data:months.map((m,j)=>({year:m.slice(0,4),period:`M${m.slice(5,7)}`,value:String(50+idx+j),footnotes:[]})).reverse()
  }))}};
}

test("real parser progression adds only new observations; response hash and moving-latest availability do not create false revisions",async()=>{
  const {sqlite,db}=sqliteD1();
  let run=0;
  const provider={
    async fetchStateClaims(){
      const rt=run===0?"2026-09-20T00:00:00.000Z":"2026-09-27T00:00:00.000Z";
      const weeks=run===0?["09/05/2026","09/12/2026"]:["09/05/2026","09/12/2026","09/19/2026"];
      const parsed=await parseEta539ShadowRows(claimsCsvWeeks(weeks),{retrievedAt:rt,historyWeeks:3});
      return {...parsed,requestCount:1,retrievedAt:rt};
    },
    async fetchGeographicDiffusion(){
      const rt=run===0?"2026-09-20T00:00:00.000Z":"2026-09-27T00:00:00.000Z";
      const months=run===0?["2026-07","2026-08"]:["2026-07","2026-08","2026-09"];
      const parsed=await parseBlsDiffusionShadowRows(blsPayloadMonths(months),{retrievedAt:rt});
      return {...parsed,requestCount:1,retrievedAt:rt};
    }
  };
  let tick=0;
  const now=()=>new Date(`2026-09-2${tick++}T01:00:00Z`);
  const first=await collectEmploymentR4Shadow({db,provider,now,claimsHistoryWeeks:3,rowMode:"ALL_FETCHED"});
  assert.equal(first.status,"SUCCESS");
  assert.equal(first.inserted,118); // 51*2 claims + 8*2 diffusion
  const h1=sqlite.prepare(`SELECT COUNT(*) n FROM ${EMPLOYMENT_R4_SHADOW_TABLES.history}`).get().n;
  run=1;
  const second=await collectEmploymentR4Shadow({db,provider,now,claimsHistoryWeeks:3,rowMode:"ALL_FETCHED"});
  assert.equal(second.status,"SUCCESS");
  assert.equal(second.inserted,59); // 51 new claims + 8 new diffusion
  assert.equal(second.revised,0);
  assert.equal(second.noop,118);
  const h2=sqlite.prepare(`SELECT COUNT(*) n FROM ${EMPLOYMENT_R4_SHADOW_TABLES.history}`).get().n;
  assert.equal(h2-h1,59);
  const oldForward=sqlite.prepare(`SELECT available_at,pit_class FROM ${EMPLOYMENT_R4_SHADOW_TABLES.current}
    WHERE logical_series_id='STATE_INITIAL_CLAIMS' AND geography_code='AL' AND observation_date='2026-09-12'`).get();
  assert.equal(oldForward.available_at,"2026-09-20T00:00:00.000Z");
  assert.equal(oldForward.pit_class,EMPLOYMENT_R4_PIT_CLASSES.forwardObserved);
  sqlite.close();
});


test("production FORWARD_ONLY mode stores only latest provider observations from large fetched history",async()=>{
  const {sqlite,db}=sqliteD1();
  const rt="2026-09-28T00:00:00.000Z";
  const weeks=[];
  for(let i=0;i<60;i++){
    const d=new Date(Date.UTC(2025,7,16)+i*7*86400000);
    weeks.push(`${String(d.getUTCMonth()+1).padStart(2,"0")}/${String(d.getUTCDate()).padStart(2,"0")}/${d.getUTCFullYear()}`);
  }
  const months=[];
  for(let y=2025;y<=2026;y++)for(let m=1;m<=12;m++)months.push(`${y}-${String(m).padStart(2,"0")}`);
  const provider={
    async fetchStateClaims({historyWeeks}={}){
      assert.equal(historyWeeks,2);
      const parsed=await parseEta539ShadowRows(claimsCsvWeeks(weeks),{retrievedAt:rt,historyWeeks:60});
      return {...parsed,requestCount:1,retrievedAt:rt};
    },
    async fetchGeographicDiffusion(){
      const parsed=await parseBlsDiffusionShadowRows(blsPayloadMonths(months),{retrievedAt:rt});
      return {...parsed,requestCount:1,retrievedAt:rt};
    }
  };
  const out=await collectEmploymentR4Shadow({db,provider,now:()=>new Date(rt)});
  assert.equal(out.status,"SUCCESS");
  assert.equal(out.rowMode,"FORWARD_ONLY");
  assert.equal(out.inserted,59);
  assert.equal(out.revised,0);
  assert.equal(out.providers.DOL_ETA.fetchedRows,3060);
  assert.equal(out.providers.DOL_ETA.selectedRows,51);
  assert.equal(out.providers.BLS_CES_SAE.fetchedRows,192);
  assert.equal(out.providers.BLS_CES_SAE.selectedRows,8);
  assert.equal(sqlite.prepare(`SELECT COUNT(*) n FROM ${EMPLOYMENT_R4_SHADOW_TABLES.current}`).get().n,59);
  assert.equal(sqlite.prepare(`SELECT COUNT(*) n FROM ${EMPLOYMENT_R4_SHADOW_TABLES.history}`).get().n,59);
  assert.equal(sqlite.prepare(`SELECT COUNT(*) n FROM ${EMPLOYMENT_R4_SHADOW_TABLES.runs} WHERE status='SUCCESS'`).get().n,1);
  sqlite.close();
});


test("BLS provider keeps one multi-series POST when all 8 diffusion series are returned",async()=>{
  const rt="2026-09-29T00:00:00.000Z";
  const calls=[];
  const fetchImpl=async(url,opts={})=>{
    calls.push({url:String(url),method:opts.method??"GET"});
    assert.equal(opts.method,"POST");
    return {ok:true,status:200,async json(){return blsPayload()}};
  };
  const provider=createEmploymentR4ShadowProvider({fetchImpl,now:()=>new Date(rt)});
  const out=await provider.fetchGeographicDiffusion();
  assert.equal(out.requestCount,1);
  assert.equal(out.transport.fallbackUsed,false);
  assert.equal(out.transport.primaryReturned,8);
  assert.equal(new Set(out.rows.map(r=>r.providerSeriesId)).size,8);
  assert.equal(calls.length,1);
});

test("BLS provider falls back to official single-series GET only for missing diffusion IDs",async()=>{
  const rt="2026-09-29T00:00:00.000Z";
  const ids=Object.keys(EMPLOYMENT_R4_DIFFUSION_SERIES);
  const calls=[];
  const singlePayload=id=>({status:"REQUEST_SUCCEEDED",message:[],Results:{series:[{
    seriesID:id,
    data:[{year:"2026",period:"M08",value:"60.0",footnotes:[]}],
  }]}});
  const fetchImpl=async(url,opts={})=>{
    const u=String(url);
    calls.push({url:u,method:opts.method??"GET"});
    if((opts.method??"GET")==="POST"){
      return {ok:true,status:200,async json(){return{status:"REQUEST_SUCCEEDED",message:[],Results:{series:[]}}}};
    }
    const id=decodeURIComponent(u.slice(u.lastIndexOf("/")+1));
    assert.ok(ids.includes(id));
    return {ok:true,status:200,async json(){return singlePayload(id)}};
  };
  const provider=createEmploymentR4ShadowProvider({fetchImpl,now:()=>new Date(rt)});
  const out=await provider.fetchGeographicDiffusion();
  assert.equal(out.requestCount,9);
  assert.equal(out.transport.primaryReturned,0);
  assert.equal(out.transport.fallbackUsed,true);
  assert.equal(out.transport.fallbackRequests,8);
  assert.equal(new Set(out.rows.map(r=>r.providerSeriesId)).size,8);
  assert.equal(out.rows.filter(r=>r.pitClass===EMPLOYMENT_R4_PIT_CLASSES.forwardObserved).length,8);
  assert.equal(calls.filter(x=>x.method==="POST").length,1);
  assert.equal(calls.filter(x=>x.method==="GET").length,8);
});
