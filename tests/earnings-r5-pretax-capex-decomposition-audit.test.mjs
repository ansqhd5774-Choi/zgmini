import test from "node:test";
import assert from "node:assert/strict";
import {operatingCandidates,decomposeProductiveAssets} from "../scripts/pc-writer/earnings-r5-pretax-capex-decomposition-audit.mjs";

test("pretax minus nonoperating reconstructs operating income",()=>{
  const r=operatingCandidates({pretax:34301,nonop:-3660});
  assert.equal(r.PRETAX_MINUS_NONOP,37961);
});

test("pretax excluding equity plus equity minus nonoperating reconstructs operating income",()=>{
  const r=operatingCandidates({pretaxExEq:300,equity:20,nonop:-30});
  assert.equal(r.PRETAX_EXEQ_PLUS_EQ_MINUS_NONOP,350);
});

test("net plus tax minus nonoperating is arithmetic-only research candidate",()=>{
  const r=operatingCandidates({net:100,tax:20,nonop:-5});
  assert.equal(r.NET_PLUS_TAX_MINUS_NONOP,125);
});

test("productive-assets decomposition requires disclosed non-PPE components",()=>{
  assert.equal(decomposeProductiveAssets(100,[]),null);
  assert.equal(decomposeProductiveAssets(100,[20,5]),75);
});
