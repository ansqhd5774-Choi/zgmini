import test from "node:test";
import assert from "node:assert/strict";
import {buildApprovedSicNaics3Document,parseCensusConcordanceWorkbook,resolveSicTo2022Naics3,validate2017To2022DirectionalConcordance} from "../lib/market-score/earnings-e1-r5-sic-naics3-concordance.mjs";

function relation(pairs){const map=new Map();for(const [from,to] of pairs){const set=map.get(from)??new Set();set.add(to);map.set(from,set);}return {status:"PASS",map};}

test("official Census workbook parser locates labeled code columns and keeps many-to-many links",()=>{
  const report=parseCensusConcordanceWorkbook({Concordance:[
    ["1987 SIC Code","1987 SIC Description","2002 NAICS Code","2002 NAICS Description"],
    ["1234","old a","111111","new a"],
    ["1234","old a","111112","new b"],
    ["5678","old b","222222","new c"],
  ]},{fromYear:1987,toYear:2002,fromSystem:"sic",toSystem:"naics",fromDigits:4,toDigits:6});
  assert.equal(report.status,"PASS");
  assert.deepEqual([...report.map.get("1234")].sort(),["111111","111112"]);
  assert.deepEqual([...report.map.get("5678")],["222222"]);
});

test("legacy XLS numeric SIC cells recover the official four-digit leading-zero code",()=>{
  const report=parseCensusConcordanceWorkbook({Concordance:[
    ["1987 SIC Code","1987 SIC Description","2002 NAICS Code","2002 NAICS Description"],
    [111,"Wheat","111140","Wheat Farming"],
    [112,"Rice","111160","Rice Farming"],
  ]},{fromYear:1987,toYear:2002,fromSystem:"sic",toSystem:"naics",fromDigits:4,toDigits:6});
  assert.equal(report.status,"PASS");
  assert.deepEqual([...report.map.get("0111")],["111140"]);
  assert.deepEqual([...report.map.get("0112")],["111160"]);
});

test("approved rule accepts multiple official paths only when all end in one 2022 NAICS3",()=>{
  const chain={
    sic1987To2002:relation([["1234","111111"],["1234","111112"]]),
    naics2002To2007:relation([["111111","111121"],["111112","111122"]]),
    naics2007To2012:relation([["111121","111131"],["111122","111132"]]),
    naics2012To2017:relation([["111131","111141"],["111132","111142"]]),
    naics2017To2022Changes:relation([["111141","112111"],["111142","112112"]]),
  };
  const result=resolveSicTo2022Naics3("1234",chain);
  assert.equal(result.status,"EXACT");
  assert.equal(result.naics3,"112");
  assert.deepEqual(result.naics2022,["112111","112112"]);
});

test("approved rule rejects a SIC when official paths split across different 2022 NAICS3 groups",()=>{
  const chain={
    sic1987To2002:relation([["1234","111111"],["1234","111112"]]),
    naics2002To2007:relation([["111111","111121"],["111112","111122"]]),
    naics2007To2012:relation([["111121","111131"],["111122","111132"]]),
    naics2012To2017:relation([["111131","111141"],["111132","111142"]]),
    naics2017To2022Changes:relation([["111141","112111"],["111142","113111"]]),
  };
  const result=resolveSicTo2022Naics3("1234",chain);
  assert.equal(result.status,"AMBIGUOUS");
  assert.deepEqual(result.naics3,["112","113"]);
});

test("2017 to 2022 forward and reverse changes tables must be symmetric",()=>{
  const forward=relation([["111111","112111"],["111112","112112"]]);
  const reverse=relation([["112111","111111"],["112112","111112"]]);
  assert.equal(validate2017To2022DirectionalConcordance(forward,reverse).status,"PASS");
  const broken=relation([["112111","111111"]]);
  assert.equal(validate2017To2022DirectionalConcordance(forward,broken).reason,"CENSUS_2017_2022_DIRECTIONAL_MISMATCH");
});

test("approved document contains only exact SIC mappings and leaves ambiguous cases explicit",()=>{
  const sic1987To2002=relation([["1234","111111"],["5678","211111"],["5678","311111"]]);
  const naics2002To2007=relation([["111111","111121"],["211111","211121"],["311111","311121"]]);
  const naics2007To2012=relation([["111121","111131"],["211121","211131"],["311121","311131"]]);
  const naics2012To2017=relation([["111131","111141"],["211131","211141"],["311131","311141"]]);
  const naics2017To2022Changes=relation([["111141","112111"],["211141","212111"],["311141","312111"]]);
  const naics2022To2017Changes=relation([["112111","111141"],["212111","211141"],["312111","311141"]]);
  const document=buildApprovedSicNaics3Document({sic1987To2002,naics2002To2007,naics2007To2012,naics2012To2017,naics2017To2022Changes,naics2022To2017Changes});
  assert.equal(document.status,"APPROVED");
  assert.deepEqual(document.rows,[{sic:"1234",naics3:"112",approved:true}]);
  assert.equal(document.summary.exact,1);
  assert.equal(document.summary.ambiguous,1);
  assert.equal(document.summary.noNaics,0);
});

test("unchanged 2017 codes use identity only when absent from the complete changes table",()=>{
  const chain={
    sic1987To2002:relation([["1234","444111"]]),
    naics2002To2007:relation([["444111","444121"]]),
    naics2007To2012:relation([["444121","444131"]]),
    naics2012To2017:relation([["444131","444141"]]),
    naics2017To2022Changes:relation([["999999","888888"]]),
  };
  const result=resolveSicTo2022Naics3("1234",chain);
  assert.equal(result.status,"EXACT");
  assert.equal(result.naics3,"444");
  assert.deepEqual(result.naics2022,["444141"]);
});
