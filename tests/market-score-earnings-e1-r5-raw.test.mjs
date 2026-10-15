import test from "node:test";
import assert from "node:assert/strict";
import {buildEarningsE1R5RawActual} from "../lib/market-score/earnings-e1-r5-raw.mjs";

const near=(a,b,t=1e-10)=>assert.ok(Math.abs(a-b)<=t,`${a} != ${b}`);

function issuer(cik,{eps,revenue,op,net,cfo,capex,priorEps,priorRevenue,priorOp,priorNet,isFinancial=false,sectorId="D"}){
  return {cik,isFinancial,sectorId,current:{eps,revenue,operatingIncome:op,netIncome:net,operatingCashFlow:cfo,capex},priorYear:{eps:priorEps,revenue:priorRevenue,operatingIncome:priorOp,netIncome:priorNet}};
}

test("raw actual calculator preserves approved S1-S11 semantics",()=>{
  const rows=[
    issuer("1",{eps:3,revenue:120,op:24,net:12,cfo:20,capex:5,priorEps:2,priorRevenue:100,priorOp:15,priorNet:10,sectorId:"D"}),
    issuer("2",{eps:1,revenue:90,op:9,net:-2,cfo:10,capex:4,priorEps:2,priorRevenue:100,priorOp:12,priorNet:1,sectorId:"I"}),
    issuer("3",{eps:2,revenue:110,op:null,net:5,cfo:null,capex:null,priorEps:2,priorRevenue:100,priorOp:null,priorNet:4,isFinancial:true,sectorId:"H"}),
  ];
  const result=buildEarningsE1R5RawActual({
    issuerRows:rows,
    beaCorporateProfits:{current:120,priorYear:100},
    producerIndustries:[
      {priorRevenue:100,inputCurrent:110,inputLag3m:100,outputCurrent:105,outputLag3m:100},
      {priorRevenue:200,inputCurrent:120,inputLag3m:100,outputCurrent:110,outputLag3m:100},
    ],
    unitLaborCostYoY:1.4,
  });
  assert.equal(result.status,"READY");
  near(result.components.S1.raw,0);
  near(result.components.S2.raw,10);
  near(result.components.S3.raw,15);
  near(result.components.S4.raw,1.5);
  near(result.components.S5.raw,(12.5+6.666666666666667)/2);
  near(result.components.S6.raw,2*(120-100)/(120+100));
  near(result.components.S7.raw,100/3);
  near(result.components.S8.raw,200/3);
  near(result.components.S9.raw,50);
  assert.equal(result.components.S11.raw,1.4);
  assert.equal(result.quality.issuerCount,3);
  assert.equal(result.quality.nonFinancialCount,2);
});

test("raw calculator fails closed on missing required source",()=>{
  const rows=[issuer("1",{eps:1,revenue:100,op:10,net:5,cfo:10,capex:2,priorEps:1,priorRevenue:90,priorOp:9,priorNet:4})];
  const result=buildEarningsE1R5RawActual({issuerRows:rows,beaCorporateProfits:null,producerIndustries:[],unitLaborCostYoY:null});
  assert.equal(result.status,"PARTIAL");
  assert.deepEqual(result.missing,["S6","S10","S11"]);
});

test("duplicate CIK is rejected instead of double weighted",()=>{
  const base=issuer("1",{eps:1,revenue:100,op:10,net:5,cfo:10,capex:2,priorEps:1,priorRevenue:90,priorOp:9,priorNet:4});
  const result=buildEarningsE1R5RawActual({issuerRows:[base,base]});
  assert.equal(result.status,"INVALID");
  assert.equal(result.reason,"DUPLICATE_ISSUER_CIK");
});
