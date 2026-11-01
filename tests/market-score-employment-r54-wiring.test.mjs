import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {buildCmR1DomainResults} from "../lib/market-score/domain-adapter-r1.mjs";
import {marketDetailRows} from "../lib/market-score/detail-catalog.mjs";

const indicators=[
 {id:"employment-41",name:"실업률",status:"READY",score:70,value:4.2,unit:"%"},
 {id:"employment-42",name:"비농업고용 3M 평균 증감",status:"READY",score:75,value:145,unit:"천명/월"},
 {id:"employment-43",name:"신규 실업수당 4W 평균",status:"READY",score:68,value:220000,unit:"건"},
 {id:"employment-44",name:"주 실업수당 개선 비율",status:"READY",score:80,value:80,unit:"%"},
];

test("R54 adapter publishes explicit score and four factors",()=>{
 const domain=buildCmR1DomainResults({employment:{
  status:"READY",score:72,methodologyVersion:"EMPLOYMENT_R54_STORED_4FACTOR_R1",
  asOfDate:"2026-10-01",indicators,
  trend:[{label:"2026-08-01",value:71}],
 }}).find(x=>x.id==="employment");
 assert.equal(domain.score,72);
 assert.equal(domain.methodologyVersion,"EMPLOYMENT_R54_STORED_4FACTOR_R1");
 assert.deepEqual(domain.indicators.map(x=>x.id),["employment-41","employment-42","employment-43","employment-44"]);
});

test("R54 detail catalog is stable-id ordered",()=>{
 const rows=marketDetailRows("employment",[indicators[3],indicators[1],indicators[0],indicators[2]]);
 assert.deepEqual(rows.map(x=>x.label),["실업률","일자리 증가세","실업수당 신청","지역 고용 개선"]);
 assert.deepEqual(rows.map(x=>x.score),[70,75,68,80]);
});

test("R54 public candidate never falls back to legacy score when partial",()=>{
 const domain=buildCmR1DomainResults({employment:{
  status:"PARTIAL",score:null,methodologyVersion:"EMPLOYMENT_R54_STORED_4FACTOR_R1",
  missingFactors:["employment-43"],trend:[],
 }}).find(x=>x.id==="employment");
 assert.equal(domain.status,"PARTIAL");
 assert.equal(domain.score,null);
});

test("market score source wires stored R54 loader without legacy R538 mixing",()=>{
 const source=fs.readFileSync("worker/market-score-r1.mjs","utf8");
 assert.match(source,/loadEmploymentR54CandidateFromStored/);
 assert.match(source,/employmentR54Domain/);
 assert.doesNotMatch(source,/buildEmploymentR538|legacyEmployment/);
});
