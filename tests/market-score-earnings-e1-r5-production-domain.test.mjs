import test from "node:test";
import assert from "node:assert/strict";
import {isReadyEarningsE1R5,mergeEarningsProductionCandidate,selectEarningsProductionDomain} from "../lib/market-score/earnings-e1-r5-production-domain.mjs";

const r4={id:"earnings",status:"READY",score:42,methodologyVersion:"E1-R4"};
const r5={id:"earnings",status:"READY",score:61,methodologyVersion:"E1-R5",noReweight:true,missing:[]};

test("only a complete approved E1-R5 candidate is production eligible",()=>{
 assert.equal(isReadyEarningsE1R5(r5),true);
 assert.equal(isReadyEarningsE1R5({...r5,status:"PARTIAL",score:null,missing:["S12"]}),false);
 assert.equal(isReadyEarningsE1R5({...r5,methodologyVersion:"E1-R5-SHADOW"}),false);
 assert.equal(isReadyEarningsE1R5({...r5,noReweight:false}),false);
 assert.equal(isReadyEarningsE1R5({...r5,score:101}),false);
});

test("selector preserves current R4 when R5 is incomplete",()=>{
 const partial={...r5,status:"PARTIAL",score:null,missing:["S12"]};
 assert.equal(selectEarningsProductionDomain({current:r4,candidate:partial}),r4);
 assert.equal(selectEarningsProductionDomain({current:r4,candidate:r5}),r5);
});

test("merge changes only earnings public-domain slot",()=>{
 const collected={series:{A:[1]},external:{foo:"bar",publicDomainScores:{earnings:r4,inflation:{status:"READY",score:50}}}};
 const merged=mergeEarningsProductionCandidate(collected,r5);
 assert.equal(merged.external.publicDomainScores.earnings,r5);
 assert.deepEqual(merged.external.publicDomainScores.inflation,collected.external.publicDomainScores.inflation);
 assert.equal(merged.external.foo,"bar");
 assert.deepEqual(merged.series,collected.series);
});

test("merge is identity-preserving when candidate is not eligible",()=>{
 const collected={external:{publicDomainScores:{earnings:r4}}};
 const partial={...r5,status:"PARTIAL",score:null,missing:["S10"]};
 assert.equal(mergeEarningsProductionCandidate(collected,partial),collected);
});
