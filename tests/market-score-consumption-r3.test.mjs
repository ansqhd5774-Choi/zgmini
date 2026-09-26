import test from "node:test";
import assert from "node:assert/strict";
import {
  C1_R3_CORE95,C1_R3_AXIS_MEMBERSHIP,C1_R3_UI4,
  buildConsumptionC1R3,
} from "../lib/market-score/consumption-c1-r3.mjs";
import {loadStoredConsumptionC1R3} from "../worker/consumption-r3-history-reader.mjs";

const rows=value=>C1_R3_CORE95.map((candidateId,i)=>({
  candidateId,score:typeof value==="function"?value(candidateId,i):value,
  observationDate:"2026-06-30",
}));

test("C1-R3.45P CORE95 -> 7-axis -> Flat-7 equal",()=>{
  const out=buildConsumptionC1R3({scoreRows:rows(50),scoreDate:"2026-06-30"});
  assert.equal(out.status,"READY");
  assert.equal(out.score,50);
  assert.equal(Object.keys(out.axisScores).length,7);
  assert.ok(Object.values(out.axisScores).every(v=>v===50));
  assert.deepEqual(out.indicators.map(x=>x.name),["실질 소매판매","실질 가처분소득","개인저축률","카드 연체율"]);
});

test("C1-R3 missing one CORE95 input is PARTIAL/null without reweight",()=>{
  const input=rows(50).slice(1);
  const out=buildConsumptionC1R3({scoreRows:input,scoreDate:"2026-06-30"});
  assert.equal(out.status,"PARTIAL");
  assert.equal(out.score,null);
  assert.ok(out.missingFactors.includes(C1_R3_CORE95[0]));
});

test("C1-R3 top score is equal mean of seven axis means, not UI4",()=>{
  const values=rows((id)=>{
    const axis=Object.entries(C1_R3_AXIS_MEMBERSHIP).find(([,ids])=>ids.includes(id))[0];
    return {
      "Current Consumption":10,
      "Income & Labor Capacity":20,
      "Household Buffer":30,
      "Credit Use & Capacity":40,
      "Financial Stress":50,
      "Credit Leading":60,
      "Large Purchases":70,
    }[axis];
  });
  const out=buildConsumptionC1R3({scoreRows:values,scoreDate:"2026-06-30"});
  assert.equal(out.score,40);
  const uiAvg=out.indicators.reduce((s,x)=>s+x.score,0)/out.indicators.length;
  assert.notEqual(out.score,uiAvg);
});

test("stored reader has no live fallback and returns complete snapshot only",async()=>{
  const all=C1_R3_CORE95.map((id,i)=>({
    candidate_id:id,score:50,observation_date:"2026-06-30",computed_at:"2026-07-01T00:00:00Z",source_snapshot_sha256:"x"
  }));
  const db={
    prepare(sql){
      return {
        bind(...args){
          return {async all(){
            if(sql.includes("GROUP BY score_date"))return {results:[{score_date:"2026-06-30",computed_at:"2026-07-01T00:00:00Z",row_count:95}]};
            return {results:all};
          }};
        }
      };
    }
  };
  const out=await loadStoredConsumptionC1R3(db,{asOf:"2026-09-24"});
  assert.equal(out.status,"READY");
  assert.equal(out.score,50);
  assert.equal(out.methodologyVersion,"R3.45P");
});

test("stored reader DB unavailable returns PARTIAL/null",async()=>{
  const out=await loadStoredConsumptionC1R3(null,{asOf:"2026-09-24"});
  assert.equal(out.status,"PARTIAL");
  assert.equal(out.score,null);
});
