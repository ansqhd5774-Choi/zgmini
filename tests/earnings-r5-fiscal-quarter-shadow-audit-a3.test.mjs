import test from "node:test";
import assert from "node:assert/strict";
import {cohortOverlap,readyForComponent} from "../scripts/pc-writer/earnings-r5-fiscal-quarter-shadow-audit-a3.mjs";

function row(cik,{eps=true,revenue=true,margin=true,fcf=true,net=true,sector=true}={}){
  return {
    cik:String(cik).padStart(10,"0"),isFinancial:false,sectorId:sector?"D":null,
    current:{
      eps:eps?2:null,revenue:revenue?100:null,operatingIncome:margin?20:null,
      operatingCashFlow:fcf?25:null,capex:fcf?5:null,netIncome:net?10:null,
    },
    priorYear:{eps:eps?1:null,revenue:revenue?90:null,operatingIncome:margin?15:null,netIncome:net?8:null},
  };
}

test("A3 readiness follows existing component semantics",()=>{
  const a=row(1);
  assert.equal(readyForComponent(a,"S1"),true);
  assert.equal(readyForComponent(a,"S3"),true);
  assert.equal(readyForComponent(a,"S5"),true);
  assert.equal(readyForComponent(a,"S8"),true);
  assert.equal(readyForComponent(a,"S9"),true);
  const missingFcf=row(2,{fcf:false});
  assert.equal(readyForComponent(missingFcf,"S5"),false);
});

test("A3 cohort overlap separates fixed-only and fiscal-only issuers",()=>{
  const fixed=[row(1),row(2),row(3,{eps:false})];
  const fiscal=[row(1),row(2,{eps:false}),row(3)];
  const overlap=cohortOverlap(fixed,fiscal,"S1");
  assert.deepEqual({fixed:overlap.fixed,fiscal:overlap.fiscal,both:overlap.both,fixedOnly:overlap.fixedOnly,fiscalOnly:overlap.fiscalOnly,union:overlap.union},{fixed:2,fiscal:2,both:1,fixedOnly:1,fiscalOnly:1,union:3});
  assert.equal(overlap.jaccard,1/3);
  assert.equal(overlap.fixedRetention,1/2);
});

test("A3 does not treat financial issuers as margin or FCF eligible",()=>{
  const a=row(1);a.isFinancial=true;
  assert.equal(readyForComponent(a,"S3"),false);
  assert.equal(readyForComponent(a,"S4"),false);
  assert.equal(readyForComponent(a,"S5"),false);
});
