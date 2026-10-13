import test from "node:test";
import assert from "node:assert/strict";
import {
  R21345_FEATURE,
  R21345_REFERENCE_OBSERVATIONS,
  R21345_FIVE_RAW_WINDOW,
  R21345_HORIZONS,
  futureEndDateR21345,
  selectPreDiscoveryCommonDatesR21345,
  summarizeHoldoutR21345,
} from "../scripts/pc-writer/sector-fear-greed-r21345-pre-discovery-holdout-validation.mjs";

function dates(startDay,count){return Array.from({length:count},(_,i)=>`2026-01-${String(startDay+i).padStart(2,"0")}`);}

test("R2.13.45 preserves the locked diagnostic contract",()=>{
  assert.equal(R21345_FEATURE,"internalCorrelationShock");
  assert.equal(R21345_REFERENCE_OBSERVATIONS,756);
  assert.equal(R21345_FIVE_RAW_WINDOW,252);
  assert.deepEqual([...R21345_HORIZONS],[5,20,60]);
});

test("R2.13.45 future-end helper identifies horizon end without inventing dates",()=>{
  const rows=dates(1,20).map(date=>({date}));
  assert.equal(futureEndDateR21345(rows,"2026-01-03",5),"2026-01-08");
  assert.equal(futureEndDateR21345(rows,"2026-01-18",5),null);
});

test("R2.13.45 common holdout dates are strictly before discovery start",()=>{
  const a=["2026-01-01","2026-01-02","2026-01-03","2026-01-04"].map(date=>({date}));
  const b=["2026-01-02","2026-01-03","2026-01-04","2026-01-05"].map(date=>({date}));
  assert.deepEqual(selectPreDiscoveryCommonDatesR21345({a,b},"2026-01-04"),["2026-01-02","2026-01-03"]);
});

test("R2.13.45 purges outcomes whose horizon end reaches the discovery window",()=>{
  const ids=["a","b","c","d","e","f"],priceDates=dates(1,20),rowsBySector={},fiveBySector={},priceBySector={};
  for(let s=0;s<ids.length;s++){
    const id=ids[s];
    rowsBySector[id]=dates(5,6).map((date,d)=>({date,score:s+d*.01,forwardDrawdown5:-(s+d*.01)}));
    fiveBySector[id]=dates(5,6).map((date,d)=>({date,score:(s%3)+d*.02}));
    priceBySector[id]=priceDates.map(date=>({date}));
  }
  const x=summarizeHoldoutR21345({rowsBySector,fiveBySector,priceBySector,discoveryStart:"2026-01-15",horizon:5});
  assert.ok(x.crossSectional.detail.every(r=>futureEndDateR21345(priceBySector.a,r.date,5)<"2026-01-15"));
  assert.ok(x.crossSectional.detail.some(r=>r.date==="2026-01-09"));
  assert.ok(!x.crossSectional.detail.some(r=>r.date==="2026-01-10"));
});

test("R2.13.45 synthetic inverse drawdown relationship remains negative",()=>{
  const ids=["a","b","c","d","e","f","g"],priceDates=dates(1,25),rowsBySector={},fiveBySector={},priceBySector={};
  for(let s=0;s<ids.length;s++){
    const id=ids[s];
    rowsBySector[id]=dates(3,8).map((date,d)=>({date,score:s+d*.03,forwardDrawdown5:-(s+d*.03)}));
    fiveBySector[id]=dates(3,8).map((date,d)=>({date,score:((s*2)%7)+d*.01}));
    priceBySector[id]=priceDates.map(date=>({date}));
  }
  const x=summarizeHoldoutR21345({rowsBySector,fiveBySector,priceBySector,discoveryStart:"2026-01-20",horizon:5});
  assert.ok(x.crossSectional.summary.median<0);
  assert.equal(x.loso.summary.positive,0);
});
