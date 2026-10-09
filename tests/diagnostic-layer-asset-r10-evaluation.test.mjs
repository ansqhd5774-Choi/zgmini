import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildR10ValuationCandidate,
  evaluateAssetBubbleR10Candidate,
} from '../lib/diagnostic-layer/asset-bubble-r10-evaluation.mjs';

test('R10 valuation corrects Z.1 million USD against GDP billion USD',()=>{
 const financial=[{observationDate:'2026-01-01',value:2000000}];
 const nonfinancial=[{observationDate:'2026-01-01',value:4000000}];
 const gdp=[{observationDate:'2026-01-01',value:30000}];
 const out=buildR10ValuationCandidate({publicFinancialEquity:financial,publicNonfinancialEquity:nonfinancial,nominalGdp:gdp});
 assert.equal(out.raw.length,1);
 assert.equal(out.raw[0].value,0.2);
 assert.equal(out.score.length,0); // warmup: 12 observations
});
test('stored SP500 history is research-only and cannot itself make six-factor R10 READY',()=>{
 const priceRows=Array.from({length:100},(_,i)=>({
  observationDate:new Date(Date.UTC(2015+Math.floor(i/12),i%12,28)).toISOString().slice(0,10),
  value:100+i+(i*i/100),
 }));
 const out=evaluateAssetBubbleR10Candidate({sp500ShadowRows:priceRows,asOfDate:'2026-10-09'});
 assert.equal(out.inputStatus.priceMonths,88);
 assert(out.inputStatus.priceScoreQuarters>0);
 assert.equal(out.status,'PARTIAL');
 assert.equal(out.score,null);
 assert.equal(out.productionEligible,false);
 assert.equal(out.externalRightsCleared,false);
 assert.equal(out.providerRequests,0);
 assert.equal(out.dbWrites,0);
 assert(out.rows.at(-1).missing.includes('breadthDivergence'));
});
test('public B1 or unverified PIT breadth is not substituted for R10 breadth divergence',()=>{
 const rows=[{quarter:'2026-Q1',score:90}];
 const bad=evaluateAssetBubbleR10Candidate({breadthScoreRows:rows,breadthEvidence:{status:'READY',membershipLookAheadSafe:true,methodology:'PUBLIC_B1'},asOfDate:'2026-10-09'});
 assert.equal(bad.inputStatus.breadthValidated,false);
 assert.equal(bad.score,null);
 assert.equal(bad.status,'PARTIAL');
 const good=evaluateAssetBubbleR10Candidate({breadthScoreRows:rows,breadthEvidence:{status:'READY',membershipLookAheadSafe:true,methodology:'ASSET_BUBBLE_R10_BREADTH_DIVERGENCE'},asOfDate:'2026-10-09'});
 assert.equal(good.inputStatus.breadthValidated,true);
 assert.equal(good.status,'PARTIAL'); // All other inputs missing.
 assert.equal(good.productionEligible,false);
});
test('out-of-range asOf and absent raw input are never fabricated',()=>{
 assert.throws(()=>evaluateAssetBubbleR10Candidate({asOfDate:'yesterday'}),/ASSET_BUBBLE_R10_ASOF_INVALID/);
 const empty=evaluateAssetBubbleR10Candidate({asOfDate:'2026-10-09'});
 assert.equal(empty.rows.length,0);
 assert.equal(empty.score,null);
});

test('Q4 price does not imply quarterly macro observations have Q4 coverage',()=>{
 const quarters=[],m2=[],prices=[];
 for(let y=2015;y<=2026;y++){
  for(let m=1;m<=12;m++){
   if(y===2026&&m>10)break;
   const month=String(m).padStart(2,'0');
   prices.push({observationDate:`${y}-${month}-28`,value:100+((y-2015)*12+m)*2});
   if(y===2026&&m>9)continue;
   m2.push({observationDate:`${y}-${month}-01`,value:10000+(y-2015)*280+m*7});
   if(m%3===1)quarters.push({observationDate:`${y}-${month}-01`,value:4000+(y-2015)*180+m*12});
  }
 }
 const macroSeries={
   GDP:quarters.map((r,i)=>({...r,value:18000+i*95})),
   BOGZ1LM793164115Q:quarters.map((r,i)=>({...r,value:13000000+i*80000})),
   BOGZ1LM103164115Q:quarters.map((r,i)=>({...r,value:18000000+i*90000})),
   BOGZ1FL153064486Q:quarters.map((r,i)=>({...r,value:28+i*0.15})),
   BOGZ1FA153064475Q:quarters.map((r,i)=>({...r,value:10000+i*250})),
   BOGZ1FL153064475Q:quarters.map((r,i)=>({...r,value:5500000+i*24000})),
   M2SL:m2,
 };
 const out=evaluateAssetBubbleR10Candidate({macroSeries,sp500ShadowRows:prices,asOfDate:'2026-10-09'});
 assert.equal(out.lastQuarter,'2026-Q4');
 assert.equal(out.inputStatus.latestQuarterByFactor.priceAcceleration,'2026-Q4');
 for(const id of ['valuationPressure','riskAssetShare','speculativeFlows','excessLiquidity']){
  assert.equal(out.inputStatus.latestQuarterByFactor[id],'2026-Q3');
 }
 const latest=out.rows.at(-1);
 assert.equal(latest.knownWeight,0.2);
 assert.deepEqual(latest.missing,[
   'valuationPressure','riskAssetShare','speculativeFlows','breadthDivergence','excessLiquidity',
 ]);
 const q3=out.rows.find(row=>row.quarter==='2026-Q3');
 assert.equal(q3.knownWeight,0.85);
 assert.deepEqual(q3.missing,['breadthDivergence']);
 assert.equal(q3.score,null); // never reweight or mislabel historical Q3 as current Q4
});
