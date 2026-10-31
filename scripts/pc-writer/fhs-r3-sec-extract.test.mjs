import test from 'node:test';
import assert from 'node:assert/strict';
import {extractFhsR3Annual} from './fhs-r3-sec-extract.mjs';
import {scoreFhsR3} from './fhs-r3-score.mjs';
const cik='0000000123',asOf='2026-10-31';
const make=(value,end='2025-12-31',start=null,accn='123-26-0001')=>({val:value,end,filed:'2026-02-15',form:'10-K',accn,...(start?{start}:{})});
const X=(list)=>({units:{USD:list}});
const doc=()=>({cik:123,facts:{'us-gaap':{
 Assets:X([make(200),make(180,'2024-12-31')]),
 AssetsCurrent:X([make(140)]),LiabilitiesCurrent:X([make(70)]),
 CashAndCashEquivalentsAtCarryingValue:X([make(35)]),Liabilities:X([make(100)]),
 NetCashProvidedByUsedInOperatingActivities:X([make(30,'2025-12-31','2025-01-01'),make(-3,'2024-12-31','2024-01-01')])
 }}});
test('strict available SEC annual report yields provisional score only',()=>{const res=extractFhsR3Annual(doc(),cik,asOf);assert.equal(res.status,'R3_SEC_INPUT_CANDIDATE');const s=scoreFhsR3(res.financial,{asOf});assert.equal(s.score,100);assert.equal(s.publishReady,false);assert.equal(s.status,'PROVISIONAL_UNVERIFIED');});
test('missing Liabilities is not computed from Assets minus Equity',()=>{const x=doc();delete x.facts['us-gaap'].Liabilities;assert.equal(extractFhsR3Annual(x,cik,asOf).reason,'MISSING_TOTALLIABILITIES');});
test('quarterly OCF never substitutes annual cashflow',()=>{const x=doc();x.facts['us-gaap'].NetCashProvidedByUsedInOperatingActivities=X([make(7,'2025-12-31','2025-10-01')]);assert.equal(extractFhsR3Annual(x,cik,asOf).reason,'MISSING_OPERATINGCASHFLOW');});
test('filing mismatch for current fields is not silently mixed',()=>{const x=doc();x.facts['us-gaap'].LiabilitiesCurrent=X([make(50,'2025-12-31',null,'123-25-9999')]);assert.equal(extractFhsR3Annual(x,cik,asOf).reason,'MISSING_CURRENTLIABILITIES');});
test('same filing contradictory facts block and missing is not zero',()=>{const x=doc();x.facts['us-gaap'].Liabilities=X([make(100),make(110)]);assert.equal(extractFhsR3Annual(x,cik,asOf).reason,'CONFLICT_TOTALLIABILITIES');});
test('future filing and wrong CIK fail closed',()=>{assert.equal(extractFhsR3Annual(doc(),'0000000987',asOf).reason,'CIK_MISMATCH');const x=doc();x.facts['us-gaap'].Assets=X([make(200,'2025-12-31',null,'123-26-0001'),make(180,'2024-12-31')]);x.facts['us-gaap'].Assets.units.USD[0].filed='2026-11-01';assert.equal(extractFhsR3Annual(x,cik,asOf).status,'NOT_READY');});
test('no accession does not assert same filing context',()=>{const x=doc();for(const fact of x.facts['us-gaap'].Assets.units.USD)delete fact.accn;assert.equal(extractFhsR3Annual(x,cik,asOf).reason,'NO_VERIFIABLE_ANNUAL_ANCHOR');});
