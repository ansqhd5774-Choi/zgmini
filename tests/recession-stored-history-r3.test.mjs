import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {enrichRecessionCoreComponents,recessionStoredScoreComparisons} from "../worker/projection-builders/recession-stored-history.mjs";

const monthly=(start,count,field)=>Array.from({length:count},(_,i)=>{
 const d=new Date(Date.UTC(Number(start.slice(0,4)),Number(start.slice(5,7))-1+i,1)).toISOString().slice(0,10);
 return {observationDate:d,[field]:i};
});
const read=path=>readFileSync(path,"utf8");

test("stored-only prior value and full 13-month trend preserve scores and weight",()=>{
 const rows=monthly("2025-10-01",13,"nfp");
 const source={id:"nfp",value:12,score:78.6,weight:0.25,observationDate:"2026-10-01"};
 const [actual]=enrichRecessionCoreComponents(rows,[source],"2026-10-01");
 assert.equal(actual.value,source.value);
 assert.equal(actual.score,source.score);
 assert.equal(actual.weight,source.weight);
 assert.equal(actual.previousValue,11);
 assert.equal(actual.previousObservationDate,"2026-09-01");
 assert.equal(actual.trend.length,13);
 assert.deepEqual(actual.trend.at(0),{date:"2025-10-01",value:0});
 assert.deepEqual(actual.trend.at(-1),{date:"2026-10-01",value:12});
 assert.deepEqual(source,{id:"nfp",value:12,score:78.6,weight:0.25,observationDate:"2026-10-01"});
});

test("GDP uses actual quarter labels rather than repeating quarterly observations each month",()=>{
 const rows=monthly("2025-10-01",13,"realGdp").map((row,i)=>({...row,realGdp:Math.floor(i/3)*0.5}));
 const [out]=enrichRecessionCoreComponents(rows,[{id:"realGdp",value:2,score:58,weight:0.15,observationDate:"2026-10-01"}],"2026-10-01");
 assert.equal(out.previousValue,1.5);
 assert.equal(out.previousObservationDate,"2026-07-01");
 assert.equal(out.observationDate,"2026-10-01");
 assert.equal(out.trend.length,5);
 assert.deepEqual(out.trend.map(x=>x.date),["2025-10-01","2026-01-01","2026-04-01","2026-07-01","2026-10-01"]);
});

test("unavailable, mismatched and future raw readings never fabricate previous/trend",()=>{
 const rows=[{observationDate:"2026-08-01",nfp:0},{observationDate:"2026-09-01",nfp:1},{observationDate:"2026-11-01",nfp:99}];
 const out=enrichRecessionCoreComponents(rows,[
  {id:"nfp",value:1,score:0,weight:0.25,observationDate:"2026-09-01"},
  {id:"realPce",value:null,score:null,weight:0.15,observationDate:null},
 ],"2026-09-01");
 assert.equal(out[0].previousValue,0);
 assert.deepEqual(out[0].trend.map(x=>x.value),[0,1]);
 assert.equal(out[1].previousValue,null);
 assert.deepEqual(out[1].trend,[]);
 const mismatch=enrichRecessionCoreComponents(rows,[{id:"nfp",value:2,score:66,weight:0.25,observationDate:"2026-09-01"}],"2026-09-01");
 assert.equal(mismatch[0].previousValue,null);
 assert.deepEqual(mismatch[0].trend,[]);
});

test("five period comparison uses exact stored month anchors, never substitutes a monthly point for 1W",()=>{
 const trend=monthly("2025-10-01",13,"value").map(row=>({label:row.observationDate,value:row.value*2}));
 const actual=recessionStoredScoreComparisons(trend,"2026-10-01",24);
 assert.deepEqual(actual,{week:null,month:2,threeMonth:6,sixMonth:12,year:24});
 assert.deepEqual(recessionStoredScoreComparisons(trend.slice(1),"2026-10-01",24),{week:null,month:2,threeMonth:6,sixMonth:12,year:null});
 assert.deepEqual(recessionStoredScoreComparisons(trend,"2026-10-01",23),{week:null,month:null,threeMonth:null,sixMonth:null,year:null});
 assert.deepEqual(recessionStoredScoreComparisons([], "2026-10-01",24),{week:null,month:null,threeMonth:null,sixMonth:null,year:null});
});

test("read-only R13 builder publishes enhanced display only; no formula, weights, DB or provider access changes",()=>{
 const builder=read("worker/projection-builders/recession.ts");
 const panel=read("app/recession/recession-panel.tsx");
 const helper=read("worker/projection-builders/recession-stored-history.mjs");
 assert.match(builder,/const scoreComparisons=recessionStoredScoreComparisons\(trend,latestDate,current\.score\)/);
 assert.match(builder,/const components=enrichRecessionCoreComponents\(recession\.rows,current\.components,latestDate\)/);
 assert.match(builder,/const oneYearStart=recessionOneYearStart\(latestDate\)/);
 assert.match(builder,/x>=oneYearStart&&x<=latestDate/);
 assert.match(builder,/lookAheadSafe:false,trend,scoreComparisons,components,supplementals/);
 assert.match(builder,/\["nfp","nfpScore",0\.25\]/);
 assert.match(builder,/\["realGdp","realGdpScore",0\.15\]/);
 assert.match(builder,/const result=recessionDefense\(scores\)/);
 assert.doesNotMatch(helper,/fetch\(|db\.prepare\(|sqlite|wrangler|provider/i);
 assert.match(panel,/scoreComparisons\?:\{/);
 assert.match(panel,/value:payload\?\.scoreComparisons\?\.year\?\?null/);
 assert.match(panel,/\.slice\(-13\)/);
 assert.doesNotMatch(panel,/const subtract=/);
});
