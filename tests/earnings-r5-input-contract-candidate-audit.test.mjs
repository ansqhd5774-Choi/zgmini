import test from "node:test";
import assert from "node:assert/strict";
import {CAPEX_CANDIDATES,selectAsFiledEpsUsd} from "../scripts/pc-writer/earnings-r5-input-contract-candidate-audit.mjs";

test("EPS USD counterfactual selects only qtrs=1 row near fixed frame without accepting contract change",()=>{
  const rows=[
    {tag:"EarningsPerShareDiluted",unit:"USD",qtrs:1,val:2.5,ddate:"2026-06-30",filed:"2026-08-10",adsh:"a"},
    {tag:"EarningsPerShareDiluted",unit:"USD",qtrs:2,val:4.9,ddate:"2026-06-30",filed:"2026-08-10",adsh:"a"},
    {tag:"EarningsPerShareDiluted",unit:"USD/shares",qtrs:1,val:2.4,ddate:"2026-06-30",filed:"2026-08-10",adsh:"a"},
  ];
  const fact=selectAsFiledEpsUsd(rows,{frameEnd:"2026-06-30",asOf:"2026-10-12"});
  assert.equal(fact.val,2.5);
  assert.equal(fact.unit,"USD");
  assert.equal(fact.qtrs,1);
});

test("EPS USD counterfactual returns missing when equally preferred filings conflict",()=>{
  const rows=[
    {tag:"EarningsPerShareDiluted",unit:"USD",qtrs:1,val:2.5,ddate:"2026-06-30",filed:"2026-08-10",adsh:"a"},
    {tag:"EarningsPerShareDiluted",unit:"USD",qtrs:1,val:2.7,ddate:"2026-06-30",filed:"2026-08-10",adsh:"b"},
  ];
  assert.equal(selectAsFiledEpsUsd(rows,{frameEnd:"2026-06-30",asOf:"2026-10-12"}),null);
});

test("CAPEX candidate set keeps noncash incurred-but-unpaid item as audit-only candidate",()=>{
  assert.ok(CAPEX_CANDIDATES.includes("PaymentsToAcquireOtherPropertyPlantAndEquipment"));
  assert.ok(CAPEX_CANDIDATES.includes("PaymentsToAcquireProductiveAssets"));
  assert.ok(CAPEX_CANDIDATES.includes("CapitalExpendituresIncurredButNotYetPaid"));
});
