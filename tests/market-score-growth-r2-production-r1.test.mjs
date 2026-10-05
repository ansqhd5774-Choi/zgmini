import test from "node:test";
import assert from "node:assert/strict";
import {createMarketScoreR1Handler} from "../worker/market-score-r1.mjs";
import {buildStoredGrowthR2Domain} from "../lib/market-score/growth-r2-worker-domain-r1.mjs";
import {GROWTH_R2_FEATURE_IDS} from "../lib/market-score/growth-r2-contract.mjs";
import {ensureGrowthR2HistoricalSeed} from "../lib/market-score/growth-r2-d1-store-r1.mjs";
import {GROWTH_R2_SEED_ROWS,GROWTH_R2_SEED_SHA256} from "../lib/market-score/growth-r2-seed-r1.mjs";
import {collectGrowthR2ForwardRecords} from "../lib/market-score/growth-r2-forward-provider-r1.mjs";

const rows=(n=84,start=100)=>Array.from({length:n},(_,i)=>({observationDate:`${2019+Math.floor(i/12)}-${String(i%12+1).padStart(2,"0")}-01`,value:start+i}));
const baseDiagnostics={inflationStability:{status:"READY",score:60,missing:[]},recessionDefense:{status:"READY",score:58,missing:[]},creditRiskDefense:{status:"READY",score:55,missing:[]}};
const collectInputs=async()=>({series:{UNRATE:rows(84,4),PAYEMS:rows(84,150000),DGS10:rows(320,3.5),DTWEXBGS:rows(320,100)},external:{registeredFundFlowRows:[]}});
const orchestrate=()=>({historyMode:"CURRENT_VINTAGE_ONLY",lookAheadSafe:false,snapshot:{diagnostics:baseDiagnostics},artifacts:{supply:{rows:[]}},limitations:{}});
const unavailable=async()=>({status:"UNAVAILABLE",score:null,missingFactors:["X"],indicators:[],trend:[]});

test("Growth R2 overrides D2 only when stored domain is READY",async()=>{
  for(const [growth,expected,useR2] of [
    [{status:"NOT_READY",score:null,missingFactors:["G010"],methodologyVersion:"GROWTH_R2_G16_CANDIDATE_R1"},58,false],
    [{status:"PARTIAL",score:null,missingFactors:["G010"],methodologyVersion:"GROWTH_R2_G16_CANDIDATE_R1"},58,false],
    [{status:"UNAVAILABLE",score:null,missingFactors:["G010"],methodologyVersion:"GROWTH_R2_G16_CANDIDATE_R1"},58,false],
    [{status:"READY",score:71.25,missingFactors:[],staleFactors:[],indicators:[],trend:[],methodologyVersion:"GROWTH_R2_G16_CANDIDATE_R1",updatedAt:"2026-08-01"},71.25,true],
  ]){
    const h=createMarketScoreR1Handler({env:{},collectInputs,orchestrate,loadGrowthDomain:async()=>growth,loadConsumptionDomain:unavailable,loadInflationDomain:unavailable,collectBreadthDomain:unavailable,loadLiquidityHistory:async()=>[],now:()=>new Date("2026-09-29T00:00:00Z")});
    const res=await h(new Request("https://zgmini.kr/api/market-score"));
    const body=await res.json();
    const g=body.domains.find(x=>x.id==="growth");
    assert.equal(g.score,expected);
    if(useR2)assert.equal(g.methodologyVersion,"GROWTH_R2_G16_CANDIDATE_R1");
    else assert.notEqual(g.methodologyVersion,"GROWTH_R2_G16_CANDIDATE_R1");
  }
});

test("stored Growth R2 requires exact 24 non-stale features and computes deterministically",async()=>{
  const feature=[];
  for(const [j,id] of GROWTH_R2_FEATURE_IDS.entries())for(let m=1;m<=4;m++)feature.push({candidateId:id,observationDate:`2026-0${m}-01`,availableAt:`2026-0${m+1}-05T00:00:00.000Z`,pitEligible:true,harmonizedValue:j*10+m,sourceHash:`${id}-${m}`,frequency:"MONTHLY"});
  const a=await buildStoredGrowthR2Domain(feature,{asOf:"2026-06-01"});const b=await buildStoredGrowthR2Domain(feature,{asOf:"2026-06-01"});assert.equal(a.status,"READY");assert.equal(a.coverage,24);assert.equal(a.score,b.score);assert.equal(a.inputSnapshotId,b.inputSnapshotId);
  assert.deepEqual(a.indicators.map(x=>x.id),["G010","G019","G035","G060"]);
  assert.ok(a.indicators.every(x=>x.status==="READY"&&typeof x.score==="number"));
  const stale=await buildStoredGrowthR2Domain(feature,{asOf:"2026-09-29"});assert.equal(stale.status,"NOT_READY");assert.ok(stale.staleFactors.length>0);
});

function createD1BindLimitDb(maxBindParams=100){
  const state={historyRows:0,historyInsertCalls:0,maxBindCount:0,meta:new Map()};
  const execute=(sql,args,mode)=>{
    state.maxBindCount=Math.max(state.maxBindCount,args.length);
    if(args.length>maxBindParams)throw new Error(`D1_BIND_PARAMETER_LIMIT_EXCEEDED:${args.length}`);
    if(mode==="first"&&/SELECT value FROM growth_r2_meta_v1 WHERE key=\?/i.test(sql)){
      const value=state.meta.get(args[0]);
      return value==null?null:{value};
    }
    if(mode==="run"&&/INSERT OR IGNORE INTO growth_r2_feature_history_v1/i.test(sql)){
      assert.equal(args.length%21,0);
      const rowsWritten=args.length/21;
      state.historyRows+=rowsWritten;
      state.historyInsertCalls++;
      return {meta:{changes:rowsWritten}};
    }
    if(mode==="run"&&/INSERT OR REPLACE INTO growth_r2_meta_v1/i.test(sql)){
      state.meta.set(args[0],args[1]);
      return {meta:{changes:1}};
    }
    if(mode==="all")return {results:[]};
    return mode==="first"?null:{meta:{changes:0}};
  };
  const statement=(sql,args=[])=>({
    bind(...next){return statement(sql,next)},
    run:async()=>execute(sql,args,"run"),
    first:async()=>execute(sql,args,"first"),
    all:async()=>execute(sql,args,"all"),
  });
  const db={
    prepare:sql=>statement(sql),
    batch:async statements=>Promise.all(statements.map(st=>st.run())),
  };
  return {db,state};
}

test("Growth R2 historical seed respects D1 100 bound-parameter limit",async()=>{
  const {db,state}=createD1BindLimitDb(100);
  const result=await ensureGrowthR2HistoricalSeed(db,{nowIso:"2026-09-29T00:00:00.000Z"});
  assert.equal(GROWTH_R2_SEED_ROWS.length,1065);
  assert.equal(result.status,"SEEDED");
  assert.equal(result.rowCount,1065);
  assert.equal(result.rowsWritten,1065);
  assert.equal(state.historyRows,1065);
  assert.equal(state.meta.get("historical_seed_sha256"),GROWTH_R2_SEED_SHA256);
  assert.ok(state.historyInsertCalls>1);
  assert.ok(state.maxBindCount<=100,`max bind count was ${state.maxBindCount}`);
  assert.equal(state.maxBindCount,84);
});



function jsonResponse(value,status=200){return new Response(JSON.stringify(value),{status,headers:{"content-type":"application/json"}});}
function textResponse(value,status=200){return new Response(value,{status,headers:{"content-type":"text/plain"}});}
function censusTable(rows){return [["data_type_code","time_slot_id","seasonally_adj","category_code","cell_value","error_data","time","us"],...rows];}

function growthForwardFetchMock(){
  const calls=[];
  const fetchImpl=async(url,opts={})=>{
    const u=String(url);calls.push({url:u,method:opts?.method??"GET"});
    if(u.includes("/timeseries/eits/m3")){
      const q=new URL(u).searchParams,cat=q.get("category_code"),time=q.get("time")??"2026";
      const by={
        MTM:[["NO","1","yes","MTM","1,200,000","no",`${time}-08`,"1"],["VS","1","yes","MTM","1,000,000","no",`${time}-08`,"1"],["TI","1","yes","MTM","1,800,000","no",`${time}-08`,"1"]],
        MDM:[["NO","1","yes","MDM","600000","no",`${time}-08`,"1"]],
        NXA:[["NO","1","yes","NXA","300000","no",`${time}-08`,"1"],["VS","1","yes","NXA","250000","no",`${time}-08`,"1"]],
        MTU:[["UO","1","yes","MTU","900000","no",`${time}-08`,"1"]],
      };
      return jsonResponse(censusTable(by[cat]??[]));
    }
    if(u.includes("/timeseries/eits/bfs")){
      const q=new URL(u).searchParams,time=q.get("time")??"2026";
      assert.equal(q.get("category_code"),null,"BFS must stay one unpartitioned year request");
      return jsonResponse(censusTable([
        ["T","1","yes","BA_BA","510000","no",`${time}-08`,"1"],
        ["T","1","yes","BA_HBA","320000","no",`${time}-08`,"1"],
        ["T","1","yes","BA_WBA","170000","no",`${time}-08`,"1"],
        ["X","1","yes","BA_BA","1","no",`${time}-08`,"1"],
      ]));
    }
    if(u.includes("/releases/g17/Current/ipdisk/ip_sa.txt")){
      const codes=["B50001","GMF","G21","G2211A2"];
      return textResponse(codes.flatMap((code,j)=>[
        `"${code}" 2021 ${Array.from({length:12},(_,i)=>100+j+i/10).join(" ")}`,
        `"${code}" 2026 ${Array.from({length:12},(_,i)=>110+j+i/10).join(" ")}`,
      ]).join("\n"));
    }
    if(u.includes("/Releases/G17/Current/ipdisk/utl_sa.txt")){
      const codes=["B50001","GMF"];
      return textResponse(codes.flatMap((code,j)=>[
        `"${code}" 2026 ${Array.from({length:12},(_,i)=>75+j+i/100).join(" ")}`,
      ]).join("\n"));
    }
    if(u.includes("api.bls.gov/publicAPI/v2/timeseries/data/")){
      const ids=["CES0000000001","CES0500000002","CES3000000009","CES0500000016","CES6056132001"];
      return jsonResponse({status:"REQUEST_SUCCEEDED",Results:{series:ids.map((seriesID,j)=>({seriesID,data:[1,2,3,4].map((m,i)=>({year:"2026",period:`M${String(m).padStart(2,"0")}`,value:String(1000+j*100+i*10)}))}))}});
    }
    throw new Error(`UNEXPECTED_FETCH:${u}`);
  };
  return {fetchImpl,calls};
}

test("Growth R2 BFS forward provider uses Census category_code BA_* with data_type_code T in one request",async()=>{
  const {fetchImpl,calls}=growthForwardFetchMock();
  const seedRows=["G019","G020","G021","G022"].map((candidateId,i)=>({candidateId,observationDate:"2021-12-01",pitEligible:true,harmonizedValue:100+i}));
  const out=await collectGrowthR2ForwardRecords({env:{CENSUS_API_KEY:"test-only"},asOf:"2026-09-29",fetchImpl,seedRows,now:()=>new Date("2026-09-29T00:00:00.000Z")});
  assert.equal(out.status,"READY");
  assert.equal(out.records.length,24);
  assert.equal(out.providerRequestCount,8);
  const bfsCalls=calls.filter(x=>x.url.includes("/timeseries/eits/bfs"));
  assert.equal(bfsCalls.length,1);
  const bfs=Object.fromEntries(out.records.filter(x=>["G060","G061","G062"].includes(x.candidateId)).map(x=>[x.candidateId,x]));
  assert.equal(bfs.G060.harmonizedValue,510000);
  assert.equal(bfs.G061.harmonizedValue,320000);
  assert.equal(bfs.G062.harmonizedValue,170000);
  assert.equal(bfs.G060.selector,"BFS_US_BA_SA");
  assert.equal(bfs.G061.selector,"BFS_US_HBA_SA");
  assert.equal(bfs.G062.selector,"BFS_US_WBA_SA");
});


test("Growth R2 forward parser accepts comma-formatted Census cell values",async()=>{
  const {fetchImpl}=growthForwardFetchMock();
  const seedRows=["G019","G020","G021","G022"].map((candidateId,i)=>({candidateId,observationDate:"2021-12-01",pitEligible:true,harmonizedValue:100+i}));
  const out=await collectGrowthR2ForwardRecords({env:{CENSUS_API_KEY:"test-only"},asOf:"2026-09-29",fetchImpl,seedRows,now:()=>new Date("2026-09-29T00:00:00.000Z")});
  const g010=out.records.find(x=>x.candidateId==="G010");
  assert.equal(g010.harmonizedValue,1200);
  assert.equal(out.records.length,24);
});
