import test from "node:test";
import assert from "node:assert/strict";
import {NARROW_CAPEX_TAGS,selectNarrowCapexFlow,buildFiscalS5NarrowCapexAudit} from "../scripts/pc-writer/earnings-r5-fiscal-s5-narrow-capex-audit.mjs";

function docForTag(tag,{approved=false}={}){const facts={
  RevenueFromContractWithCustomerExcludingAssessedTax:{units:{USD:[
    {start:"2026-04-01",end:"2026-06-30",filed:"2026-07-20",form:"10-Q",val:100},
    {start:"2025-04-01",end:"2025-06-30",filed:"2025-07-20",form:"10-Q",val:90},
  ]}},
  NetCashProvidedByUsedInOperatingActivities:{units:{USD:[{start:"2026-01-01",end:"2026-06-30",filed:"2026-07-20",form:"10-Q",val:50},{start:"2026-01-01",end:"2026-03-31",filed:"2026-04-20",form:"10-Q",val:20}]}},
  [tag]:{units:{USD:[{start:"2026-01-01",end:"2026-06-30",filed:"2026-07-20",form:"10-Q",val:14},{start:"2026-01-01",end:"2026-03-31",filed:"2026-04-20",form:"10-Q",val:5}]}},
};if(approved)facts.PaymentsToAcquirePropertyPlantAndEquipment={units:{USD:[{start:"2026-01-01",end:"2026-06-30",filed:"2026-07-20",form:"10-Q",val:14},{start:"2026-01-01",end:"2026-03-31",filed:"2026-04-20",form:"10-Q",val:5}]}};return {cik:"1",facts:{"us-gaap":facts}};}

test("narrow capex selector reconstructs aligned quarter from cumulative facts",()=>{const tag=NARROW_CAPEX_TAGS[0],doc=docForTag(tag),target={start:"2026-04-01",end:"2026-06-30",duration:91};const r=selectNarrowCapexFlow(doc,{tag,target,asOf:"2026-10-12"});assert.equal(r.method,"CUMULATIVE_DELTA");assert.equal(r.value,9);});

test("narrow audit recovers capex-only missing issuer without changing policy",()=>{const tag=NARROW_CAPEX_TAGS[0],members=[{cik:1,ticker:"AAA"}],factsByCik=new Map([["0000000001",docForTag(tag)]]),submissionsByCik=new Map([["0000000001",{sic:"2000"}]]);const r=buildFiscalS5NarrowCapexAudit({members,factsByCik,submissionsByCik,asOf:"2026-10-12",ageDays:210});assert.equal(r.status,"PASS");assert.equal(r.counts.nonFinancial,1);assert.equal(r.counts.baselineReady,0);assert.equal(r.counts.capexOnlyMissing,1);assert.equal(r.union.recovered,1);assert.equal(r.union.combinedReady,1);assert.equal(r.policies.accepted,false);assert.equal(r.policies.inputContractChanged,false);assert.equal(r.policies.productiveAssetsAccepted,false);});

test("productive assets is not in narrow candidate set",()=>{assert.equal(NARROW_CAPEX_TAGS.includes("PaymentsToAcquireProductiveAssets"),false);});
