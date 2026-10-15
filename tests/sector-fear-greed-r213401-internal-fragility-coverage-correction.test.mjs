import test from "node:test";
import assert from "node:assert/strict";
import {
  R213401_FEATURES,
  R213401_REFERENCE_OBSERVATIONS,
  R213401_WINDOW,
  R213401_STOCK_WINDOW,
  buildR213401StockFeature,
  buildR213401SectorHistory,
} from "../scripts/pc-writer/sector-fear-greed-r213401-internal-fragility-coverage-correction.mjs";
import {scoreR21340Feature} from "../scripts/pc-writer/sector-fear-greed-r21340-internal-fragility-screen.mjs";

function dates(n){const out=[];const d=new Date("2022-01-01T00:00:00Z");for(let i=0;i<n;i++){out.push(d.toISOString().slice(0,10));d.setUTCDate(d.getUTCDate()+1);}return out;}
function syntheticSeries(n=70,scale=1){const ds=dates(n),stock=[],etf=new Map();let sc=100,ec=100;stock.push({date:ds[0],ticker:"AAA",close:sc,volume:1000000});etf.set(ds[0],ec);for(let i=1;i<n;i++){const sign=i%2===0?1:-1,mag=.004+(i%7)*.001,er=sign*mag,sr=er<0?1.25*er+(i%3)*.0002:-.8*er+(i%5)*.0001;ec*=1+er;sc*=1+scale*sr;stock.push({date:ds[i],ticker:"AAA",close:sc,volume:1000000+i*1000});etf.set(ds[i],ec);}return {stock,etf,dates:ds};}

test("R2.13.40.1 preserves diagnostic constants",()=>{
  assert.deepEqual(R213401_FEATURES,["liquidityFragility","downsideCorrelationAsymmetry"]);
  assert.equal(R213401_REFERENCE_OBSERVATIONS,756);
  assert.equal(R213401_WINDOW,252);
  assert.equal(R213401_STOCK_WINDOW,60);
});

test("R2.13.40.1 computes both features when ETF window is complete",()=>{
  const {stock,etf}=syntheticSeries();
  const row=buildR213401StockFeature(stock,etf,69);
  assert.ok(Number.isFinite(row.liquidityFragility));
  assert.ok(Number.isFinite(row.downsideCorrelationAsymmetry));
  assert.equal(row.etfWindowComplete,true);
  assert.equal(row.liquidityWindowComplete,true);
});

test("R2.13.40.1 keeps liquidity when ETF history is missing",()=>{
  const {stock}=syntheticSeries();
  const row=buildR213401StockFeature(stock,new Map(),69);
  assert.ok(Number.isFinite(row.liquidityFragility));
  assert.equal(row.downsideCorrelationAsymmetry,null);
  assert.equal(row.etfWindowComplete,false);
  assert.equal(row.liquidityWindowComplete,true);
});

test("R2.13.40.1 still rejects incomplete stock windows",()=>{
  const {stock,etf}=syntheticSeries();
  assert.equal(buildR213401StockFeature(stock,etf,59),null);
});

test("R2.13.40.1 keeps approved 756-observation inverted percentile",()=>{
  const history=[];const ds=dates(760);for(let i=0;i<760;i++)history.push({date:ds[i],liquidityFragility:i+1});
  const scored=scoreR21340Feature(history,"liquidityFragility");
  assert.equal(scored.length,5);
  assert.ok(scored.at(-1).score<1);
  assert.ok(scored.at(-1).score>=0);
});

test("R2.13.40.1 sector history preserves liquidity without ETF coverage",()=>{
  const rows=[],byTicker={};
  for(let k=0;k<8;k++){const ticker=`T${k}`,s=syntheticSeries(70,1+k*.01).stock.map(r=>({...r,ticker,volume:r.volume+k*5000}));rows.push(...s);byTicker[ticker]=[{ticker,sectorId:"technology",dateAdded:"2000-01-01",dateRemoved:null}];}
  const history=buildR213401SectorHistory({rows,etfRows:[],pitHistory:{byTicker},sectorId:"technology"});
  assert.ok(history.length>0);
  assert.ok(history.some(r=>Number.isFinite(r.liquidityFragility)));
  assert.ok(history.every(r=>r.downsideCorrelationAsymmetry===null));
  assert.ok(history.every(r=>r.downsideSyncReady===0));
});

test("R2.13.40.1 sector history aggregates both when ETF coverage exists",()=>{
  const ds=dates(70),rows=[],byTicker={};let etfClose=100;const etfRows=[{date:ds[0],close:etfClose}];
  for(let i=1;i<70;i++){const sign=i%2===0?1:-1,mag=.004+(i%7)*.001;etfClose*=1+sign*mag;etfRows.push({date:ds[i],close:etfClose});}
  for(let k=0;k<8;k++){const ticker=`T${k}`,s=syntheticSeries(70,1+k*.01).stock.map(r=>({...r,ticker,volume:r.volume+k*5000}));rows.push(...s);byTicker[ticker]=[{ticker,sectorId:"technology",dateAdded:"2000-01-01",dateRemoved:null}];}
  const history=buildR213401SectorHistory({rows,etfRows,pitHistory:{byTicker},sectorId:"technology"});
  assert.ok(history.some(r=>Number.isFinite(r.liquidityFragility)));
  assert.ok(history.some(r=>Number.isFinite(r.downsideCorrelationAsymmetry)));
});
