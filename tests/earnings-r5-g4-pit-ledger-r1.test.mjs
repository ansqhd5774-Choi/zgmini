import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  E1_R5_G4_PIT_R1_CONTRACT,
  E1_R5_G4_PIT_R1_VERSION,
  appendG4PitSnapshot,
  buildG4PitSnapshot,
  buildSecS1S2FromDocuments,
  runG4PitLedgerR1,
} from "../scripts/pc-writer/earnings-r5-g4-pit-ledger-r1.mjs";

const fact=({start,end,filed,val,unit="USD",form="10-Q"})=>({start,end,filed,val,form,accn:`${filed}-${end}-${val}`,fy:Number(end.slice(0,4)),fp:"Q2"});
function companyFacts({cik,revenueCurrent,revenuePrior,epsCurrent,epsPrior}){
  return {
    cik,
    facts:{"us-gaap":{
      RevenueFromContractWithCustomerExcludingAssessedTax:{units:{USD:[
        fact({start:"2025-04-01",end:"2025-06-30",filed:"2025-08-01",val:revenuePrior}),
        fact({start:"2026-04-01",end:"2026-06-30",filed:"2026-08-01",val:revenueCurrent}),
      ]}},
      EarningsPerShareDiluted:{units:{"USD/shares":[
        fact({start:"2025-04-01",end:"2025-06-30",filed:"2025-08-01",val:epsPrior,unit:"USD/shares"}),
        fact({start:"2026-04-01",end:"2026-06-30",filed:"2026-08-01",val:epsCurrent,unit:"USD/shares"}),
      ]}},
    }},
  };
}
const component=(value,source)=>({value,status:"READY",reason:null,source,sourceAsOf:"2026-10-16T00:00:00.000Z",sourceStoredAt:"2026-10-16T00:00:00.000Z",sourceHash:"a".repeat(64)});

test("G4 PIT contract is append-only research storage only",()=>{
  assert.equal(E1_R5_G4_PIT_R1_VERSION,"E1-R5-G4-PIT-R1");
  assert.equal(E1_R5_G4_PIT_R1_CONTRACT.appendOnly,true);
  assert.equal(E1_R5_G4_PIT_R1_CONTRACT.retroactiveBackfill,false);
  assert.equal(E1_R5_G4_PIT_R1_CONTRACT.productionActivation,false);
  assert.equal(E1_R5_G4_PIT_R1_CONTRACT.networkCalls,0);
  assert.equal(E1_R5_G4_PIT_R1_CONTRACT.dbWrites,0);
  assert.equal(E1_R5_G4_PIT_R1_CONTRACT.formulaChanged,false);
  assert.equal(E1_R5_G4_PIT_R1_CONTRACT.weightChanged,false);
  assert.equal(E1_R5_G4_PIT_R1_CONTRACT.normalizationChanged,false);
  assert.deepEqual(E1_R5_G4_PIT_R1_CONTRACT.components,["S1","S2","S6","Growth","S12B"]);
});

test("S1/S2 use approved fiscal common-anchor SEC pairs and filing-time provenance",()=>{
  const out=buildSecS1S2FromDocuments([
    companyFacts({cik:"1",revenueCurrent:120,revenuePrior:100,epsCurrent:1.2,epsPrior:1}),
    companyFacts({cik:"2",revenueCurrent:90,revenuePrior:100,epsCurrent:0.8,epsPrior:1}),
  ],{asOf:"2026-10-16T00:00:00Z"});
  assert.equal(out.eligibleS1,2);
  assert.equal(out.eligibleS2,2);
  assert.equal(out.revenuePairCount,2);
  assert.equal(out.maxCurrentAgeDays,210);
  assert.equal(out.s1SourceAsOf,"2026-08-01T23:59:59.000Z");
  assert.equal(out.s2SourceAsOf,"2026-08-01T23:59:59.000Z");
  assert.ok(Math.abs(out.s2-5)<1e-12);
  assert.ok(Math.abs(out.s1-(-0.02020202020202022))<1e-12);
});

test("snapshot preserves missing values instead of filling or reweighting",()=>{
  const snapshot=buildG4PitSnapshot({recordedAt:"2026-10-16T01:00:00Z",components:{
    S1:component(0.1,"SEC"),
    S2:component(5,"SEC"),
    S6:{...component(0.18,"BEA")},
    Growth:component(42,"ZGMINI"),
    S12B:{value:null,status:"MISSING",reason:"NO_REVISION",source:"CFO",sourceAsOf:null,sourceStoredAt:null,sourceHash:null},
  }});
  assert.equal(snapshot.status,"PARTIAL");
  assert.deepEqual(snapshot.missing,["S12B"]);
  assert.equal(snapshot.state.S12B.value,null);
  assert.equal(snapshot.productionActivation,false);
});

test("same-day unchanged PIT state has a stable checkpoint and NOOPs",()=>{
  const components={S1:component(1,"a"),S2:component(2,"b"),S6:component(3,"c"),Growth:component(4,"d"),S12B:component(5,"e")};
  const a=buildG4PitSnapshot({recordedAt:"2026-10-16T01:00:00Z",components});
  const b=buildG4PitSnapshot({recordedAt:"2026-10-16T02:00:00Z",components});
  assert.equal(a.checkpoint,b.checkpoint);
  const first=appendG4PitSnapshot({ledger:null,snapshot:a});
  const second=appendG4PitSnapshot({ledger:first.ledger,snapshot:b});
  assert.equal(second.status,"NOOP");
  assert.equal(second.ledger.snapshots.length,1);
});

test("append dedupes checkpoints and rejects retroactive writes",()=>{
  const a=buildG4PitSnapshot({recordedAt:"2026-10-16T01:00:00Z",components:{S1:component(1,"a"),S2:component(2,"b"),S6:component(3,"c"),Growth:component(4,"d"),S12B:component(5,"e")}});
  const first=appendG4PitSnapshot({ledger:null,snapshot:a});
  assert.equal(first.status,"STORED");
  const duplicate=appendG4PitSnapshot({ledger:first.ledger,snapshot:a});
  assert.equal(duplicate.status,"NOOP");
  const older=buildG4PitSnapshot({recordedAt:"2026-10-15T23:00:00Z",components:{S1:component(9,"a"),S2:component(2,"b"),S6:component(3,"c"),Growth:component(4,"d"),S12B:component(5,"e")}});
  assert.throws(()=>appendG4PitSnapshot({ledger:first.ledger,snapshot:older}),/G4_PIT_RETROACTIVE_WRITE_FORBIDDEN/);
});

test("runner stores only the approved local ledger and supports reader isolation",()=>{
  const base=fs.mkdtempSync(path.join(os.tmpdir(),"zgmini-g4-test-"));
  const ledgerFile=path.join(base,"manual-input","e1-r5","g4-pit-r1","snapshots.json");
  const readers={
    sec:()=>({S1:component(0.11,"SEC"),S2:component(6.2,"SEC")}),
    s6:()=>component(0.18,"BEA"),
    growth:()=>component(55,"GROWTH"),
    s12b:()=>component(0.375,"CFO"),
  };
  try{
    const one=runG4PitLedgerR1({base,recordedAt:"2026-10-16T02:00:00Z",ledgerFile,readers});
    assert.equal(one.status,"STORED");
    assert.equal(one.snapshot.status,"READY");
    assert.equal(one.snapshotCount,1);
    assert.equal(one.networkCalls,0);
    assert.equal(one.dbWrites,0);
    assert.equal(one.productionActivation,false);
    const two=runG4PitLedgerR1({base,recordedAt:"2026-10-16T02:00:00Z",ledgerFile,readers});
    assert.equal(two.status,"NOOP");
    assert.equal(JSON.parse(fs.readFileSync(ledgerFile,"utf8")).snapshots.length,1);
  }finally{fs.rmSync(base,{recursive:true,force:true});}
});
