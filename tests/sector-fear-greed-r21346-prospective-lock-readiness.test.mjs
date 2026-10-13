import test from "node:test";
import assert from "node:assert/strict";
import {R21346_FEATURE,R21346_REFERENCE_OBSERVATIONS,R21346_HORIZONS,R21346_EXPECTED_IC_DIRECTION,R21346_PRIMARY_OUTCOME,buildLockContractR21346,contractHashR21346,validateExistingLockR21346} from "../scripts/pc-writer/sector-fear-greed-r21346-prospective-lock-readiness.mjs";

test("R2.13.46 preserves frozen prospective constants",()=>{
  assert.equal(R21346_FEATURE,"internalCorrelationShock");
  assert.equal(R21346_REFERENCE_OBSERVATIONS,756);
  assert.deepEqual([...R21346_HORIZONS],[5,20,60]);
  assert.equal(R21346_EXPECTED_IC_DIRECTION,"NEGATIVE");
  assert.equal(R21346_PRIMARY_OUTCOME,"FORWARD_DRAWDOWN");
});

test("R2.13.46 builds a lock from exactly 252 discovery dates",()=>{
  const dates=Array.from({length:252},(_,i)=>`2026-${String(Math.floor(i/28)+1).padStart(2,"0")}-${String(i%28+1).padStart(2,"0")}`);
  const c=buildLockContractR21346({source42:{definitions:{internalCorrelationShock:"LOCKED_DEFINITION"}},source43:{dates}});
  assert.equal(c.feature,"internalCorrelationShock");
  assert.equal(c.definition,"LOCKED_DEFINITION");
  assert.equal(c.normalizationReference,756);
  assert.equal(c.discoveryStart,dates[0]);
  assert.equal(c.discoveryEnd,dates.at(-1));
});

test("R2.13.46 contract hash is deterministic across object key order",()=>{
  const a={z:1,a:{y:2,x:3}},b={a:{x:3,y:2},z:1};
  assert.equal(contractHashR21346(a),contractHashR21346(b));
});

test("R2.13.46 accepts an identical existing lock",()=>{
  const contract={feature:"internalCorrelationShock",discoveryEnd:"2026-10-09",x:1};
  const existing={contractHash:contractHashR21346(contract),contract,createdAt:"2026-10-14T00:00:00.000Z"};
  const r=validateExistingLockR21346(existing,contract);
  assert.equal(r.exists,true);
  assert.equal(r.valid,true);
});

test("R2.13.46 rejects a changed existing lock",()=>{
  const contract={feature:"internalCorrelationShock",discoveryEnd:"2026-10-09",x:1};
  const changed={...contract,x:2};
  const existing={contractHash:contractHashR21346(changed),contract:changed};
  assert.throws(()=>validateExistingLockR21346(existing,contract),/R21346_EXISTING_LOCK_CONTRACT_MISMATCH/);
});
