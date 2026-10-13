import test from "node:test";
import assert from "node:assert/strict";
import {
  R21341_FEATURES,
  R21341_REFERENCE_OBSERVATIONS,
  R21341_WINDOW,
  R21341_ROLLING,
  R21341_MIN_MEMBERS,
  buildR21341DailySectorSeries,
  buildR21341RawHistory,
} from "../scripts/pc-writer/sector-fear-greed-r21341-stock-internal-crowding-screen.mjs";
import {scoreR21340Feature} from "../scripts/pc-writer/sector-fear-greed-r21340-internal-fragility-screen.mjs";

function dates(n){const out=[];const d=new Date("2022-01-01T00:00:00Z");for(let i=0;i<n;i++){out.push(d.toISOString().slice(0,10));d.setUTCDate(d.getUTCDate()+1);}return out;}
function fixture(n=140){const ds=dates(n),rows=[],byTicker={};for(let k=0;k<8;k++){const ticker=`T${k}`,phase=k%3;let close=100+k;rows.push({date:ds[0],ticker,close,volume:1_000_000});for(let i=1;i<n;i++){const market=i%4<2?-.006-.0002*(i%5):.005+.00015*(i%7),idios=((i+k+phase)%7-3)*.00035,load=market<0?1.15+k*.015:.85+k*.01;close*=1+load*market+idios;rows.push({date:ds[i],ticker,close,volume:1_000_000+i*100+k*1000});}byTicker[ticker]=[{ticker,sectorId:"technology",dateAdded:"2000-01-01",dateRemoved:null}];}return {rows,pitHistory:{byTicker},ds};}

test("R2.13.41 preserves diagnostic constants",()=>{
  assert.deepEqual(R21341_FEATURES,["downsideSignSynchronizationAsymmetry","crossSectionalDispersionShock"]);
  assert.equal(R21341_REFERENCE_OBSERVATIONS,756);
  assert.equal(R21341_WINDOW,252);
  assert.equal(R21341_ROLLING,60);
  assert.equal(R21341_MIN_MEMBERS,8);
});

test("R2.13.41 builds PIT-active daily sector returns",()=>{
  const {rows,pitHistory}=fixture(90),daily=buildR21341DailySectorSeries({rows,pitHistory,sectorId:"technology"});
  assert.equal(daily.length,89);
  assert.ok(daily.every(r=>r.memberObservations===8));
  assert.ok(daily.every(r=>Number.isFinite(r.sectorMeanReturn)));
  assert.ok(daily.every(r=>Number.isFinite(r.crossSectionalDispersion)));
});

test("R2.13.41 rolling history computes both stock-internal features",()=>{
  const {rows,pitHistory}=fixture(150),daily=buildR21341DailySectorSeries({rows,pitHistory,sectorId:"technology"}),history=buildR21341RawHistory(daily);
  assert.equal(history.length,daily.length-59);
  assert.ok(history.some(r=>Number.isFinite(r.downsideSignSynchronizationAsymmetry)));
  assert.ok(history.some(r=>Number.isFinite(r.crossSectionalDispersionShock)));
  assert.ok(history.every(r=>r.downDays>=10&&r.upDays>=10));
});

test("R2.13.41 excludes non-PIT members",()=>{
  const {rows,pitHistory}=fixture(90);pitHistory.byTicker.T7=[{ticker:"T7",sectorId:"technology",dateAdded:"2099-01-01",dateRemoved:null}];
  const daily=buildR21341DailySectorSeries({rows,pitHistory,sectorId:"technology"});
  assert.equal(daily.length,0);
});

test("R2.13.41 keeps the approved 756-observation inverted percentile",()=>{
  const history=[],ds=dates(760);for(let i=0;i<760;i++)history.push({date:ds[i],crossSectionalDispersionShock:i+1});
  const scored=scoreR21340Feature(history,"crossSectionalDispersionShock");
  assert.equal(scored.length,5);
  assert.ok(scored.at(-1).score<1);
  assert.ok(scored.at(-1).score>=0);
});

test("R2.13.41 does not fabricate rolling features before 60 sector days",()=>{
  const {rows,pitHistory}=fixture(50),daily=buildR21341DailySectorSeries({rows,pitHistory,sectorId:"technology"});
  assert.equal(buildR21341RawHistory(daily).length,0);
});
