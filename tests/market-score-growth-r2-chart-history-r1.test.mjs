import test from "node:test";
import assert from "node:assert/strict";
import {buildStoredGrowthR2Domain} from "../lib/market-score/growth-r2-worker-domain-r1.mjs";
import {GROWTH_R2_FEATURE_IDS} from "../lib/market-score/growth-r2-contract.mjs";

function fixture(){
  const current=[],trendRows=[];
  for(const [j,id] of GROWTH_R2_FEATURE_IDS.entries()){
    for(let m=1;m<=6;m++){
      current.push({candidateId:id,observationDate:`2026-${String(m).padStart(2,"0")}-01`,availableAt:`2026-${String(m+1).padStart(2,"0")}-05T00:00:00.000Z`,pitEligible:true,harmonizedValue:j*10+m,sourceHash:`${id}-${m}`,frequency:"MONTHLY"});
      trendRows.push({candidateId:id,observationDate:`2026-${String(m).padStart(2,"0")}-01`,availableAt:"2026-10-01T00:00:00.000Z",pitEligible:false,harmonizedValue:j*10+m,sourceHash:`chart-${id}-${m}`,frequency:"MONTHLY"});
    }
  }
  return {current,trendRows};
}

test("Growth R2 READY exposes multi-point stored trend and preserves current score",async()=>{
  const {current,trendRows}=fixture();
  const r=await buildStoredGrowthR2Domain(current,{asOf:"2026-07-01",trendRows});
  assert.equal(r.status,"READY");
  assert.equal(r.coverage,24);
  assert.ok(r.trend.length>1,"chart must have more than one point");
  assert.equal(r.trend.at(-1).label,"2026-07-01");
  assert.equal(r.trend.at(-1).value,r.score);
  assert.deepEqual(r.indicators.map(x=>x.id),GROWTH_R2_FEATURE_IDS);
  assert.equal(r.indicators.length,24);
  assert.ok(r.indicators.every(x=>x.status==="READY"&&Number.isFinite(x.score)&&x.observationDate&&x.source));
});
