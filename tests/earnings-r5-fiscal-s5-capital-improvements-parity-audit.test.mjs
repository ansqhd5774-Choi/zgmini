import test from "node:test";
import assert from "node:assert/strict";
import {historicalParity,conservativeDecision,TARGET_TAG} from "../scripts/pc-writer/earnings-r5-fiscal-s5-capital-improvements-parity-audit.mjs";

function fact(start,end,val,filed="2026-08-01"){return {start,end,val,filed,form:"10-Q"};}

test("capital improvements parity accepts exact same-period approved CAPEX",()=>{
  const doc={facts:{"us-gaap":{
    [TARGET_TAG]:{units:{USD:[fact("2026-01-01","2026-06-30",100)]}},
    PaymentsToAcquirePropertyPlantAndEquipment:{units:{USD:[fact("2026-01-01","2026-06-30",100)]}},
  }}};
  const p=historicalParity(doc,"2026-10-12");
  assert.equal(p.overlap,1);assert.equal(p.exact,1);assert.equal(p.within1pct,1);
});

test("presentation-only evidence requires total labels and no competing capex lines",()=>{
  assert.equal(conservativeDecision({parity:{overlap:0,within1pct:0},currentTotal:true,priorTotal:true,currentCompeting:[],priorCompeting:[]}).eligible,true);
  assert.equal(conservativeDecision({parity:{overlap:0,within1pct:0},currentTotal:true,priorTotal:true,currentCompeting:[{tag:"Other"}],priorCompeting:[]}).eligible,false);
});

test("strong parity can qualify when presentation history is incomplete",()=>{
  assert.equal(conservativeDecision({parity:{overlap:2,within1pct:2},currentTotal:false,priorTotal:false,currentCompeting:[],priorCompeting:[]}).eligible,true);
});
