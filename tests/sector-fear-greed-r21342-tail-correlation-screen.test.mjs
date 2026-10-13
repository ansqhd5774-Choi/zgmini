import test from "node:test";
import assert from "node:assert/strict";
import {
  R21342_FEATURES,
  R21342_REFERENCE_OBSERVATIONS,
  R21342_WINDOW,
  R21342_ROLLING,
  R21342_SHORT,
  buildR21342DailySectorSeries,
  averagePairwiseCorrelationR21342,
  buildR21342RawHistory,
} from "../scripts/pc-writer/sector-fear-greed-r21342-tail-correlation-screen.mjs";

function dates(n){const out=[];const d=new Date("2022-01-03T00:00:00Z");for(let i=0;i<n;i++){out.push(d.toISOString().slice(0,10));d.setUTCDate(d.getUTCDate()+1);}return out;}
function stockRows(n=90,tickers=8){const ds=dates(n),rows=[],byTicker={};for(let k=0;k<tickers;k++){const ticker=`T${k}`;let close=100+k;byTicker[ticker]=[{ticker,sectorId:"technology",dateAdded:"2000-01-01",dateRemoved:null}];rows.push({date:ds[0],ticker,close});for(let i=1;i<n;i++){const common=(i%7===0?-0.025:(i%5===0?0.018:((i%2?1:-1)*0.004)));const idio=((k%3)-1)*0.001*(i%4);close*=1+common+idio;rows.push({date:ds[i],ticker,close});}}return {rows,byTicker,ds};}

test("R2.13.42 preserves diagnostic constants",()=>{
  assert.deepEqual(R21342_FEATURES,["tailExceedanceAsymmetry","internalCorrelationShock"]);
  assert.equal(R21342_REFERENCE_OBSERVATIONS,756);
  assert.equal(R21342_WINDOW,252);
  assert.equal(R21342_ROLLING,60);
  assert.equal(R21342_SHORT,20);
});

test("R2.13.42 builds PIT-active daily returns without fabricating tail flags before prior60",()=>{
  const {rows,byTicker}=stockRows();
  const daily=buildR21342DailySectorSeries({rows,pitHistory:{byTicker},sectorId:"technology"});
  assert.ok(daily.length>60);
  assert.equal(daily[0].tailExceedanceAsymmetry,null);
  assert.ok(daily.some(r=>Number.isFinite(r.tailExceedanceAsymmetry)));
  assert.ok(daily.every(r=>r.memberObservations>=8));
});

test("R2.13.42 average pairwise correlation is one for identical return vectors",()=>{
  const days=[];for(let i=0;i<20;i++){const r=(i%2?1:-1)*(0.01+i*0.0001),returns={};for(let k=0;k<8;k++)returns[`T${k}`]=r;days.push({date:dates(20)[i],returns});}
  const rho=averagePairwiseCorrelationR21342(days);
  assert.ok(Math.abs(rho-1)<1e-10);
});

test("R2.13.42 raw history computes correlation shock only after 60 sector days",()=>{
  const {rows,byTicker}=stockRows(130,8);
  const daily=buildR21342DailySectorSeries({rows,pitHistory:{byTicker},sectorId:"technology"});
  const history=buildR21342RawHistory(daily);
  assert.equal(history.length,daily.length);
  assert.ok(history.slice(0,59).every(r=>r.internalCorrelationShock===null));
  assert.ok(history.slice(59).some(r=>Number.isFinite(r.internalCorrelationShock)));
  assert.ok(history.some(r=>Number.isFinite(r.tailExceedanceAsymmetry)));
});

test("R2.13.42 excludes non-PIT members",()=>{
  const {rows,byTicker}=stockRows(90,9);byTicker.T8=[{ticker:"T8",sectorId:"energy",dateAdded:"2000-01-01",dateRemoved:null}];
  const daily=buildR21342DailySectorSeries({rows,pitHistory:{byTicker},sectorId:"technology"});
  assert.ok(daily.length>0);
  assert.ok(daily.every(r=>r.memberObservations===8));
});
