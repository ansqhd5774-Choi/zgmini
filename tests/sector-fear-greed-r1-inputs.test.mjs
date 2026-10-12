import test from "node:test";
import assert from "node:assert/strict";
import {parseSectorUniverseCsv,buildCurrentUniverseSectorInputs} from "../lib/market-score/sector-fear-greed-r1-inputs.mjs";

const sectors=[
  ["Information Technology","AAA"],
  ["Communication Services","BBB"],
  ["Consumer Discretionary","CCC"],
  ["Consumer Staples","DDD"],
  ["Financials","EEE"],
  ["Health Care","FFF"],
  ["Industrials","GGG"],
  ["Energy","HHH"],
  ["Materials","III"],
  ["Real Estate","JJJ"],
  ["Utilities","KKK"],
];

function fixtureCsv(){
  return ["Symbol,Security,GICS Sector",...sectors.map(([sector,ticker],i)=>`${ticker},\"Company ${i}, Inc.\",${sector}`)].join("\n");
}
function dateAt(index){return new Date(Date.UTC(2025,0,1)+index*86400000).toISOString().slice(0,10)}
function storedRows(days=260){
  const rows=[];
  for(let i=0;i<days;i++){
    for(let s=0;s<sectors.length;s++){
      const ticker=sectors[s][1];
      const close=100+s*3+i*0.2+(i%9===0?0.5:0);
      rows.push({tradeDate:dateAt(i),ticker,currentClose:close,currentVolume:1000+s*100+i});
    }
  }
  return rows;
}

test("sector universe parser preserves Symbol and exact GICS mapping without changing the production universe store",()=>{
  const out=parseSectorUniverseCsv(fixtureCsv(),{requireSp500Size:false});
  assert.equal(out.memberCount,11);
  assert.equal(out.byTicker.AAA.sectorId,"technology");
  assert.equal(out.byTicker.JJJ.sectorId,"realEstate");
  assert.equal(out.counts.utilities,1);
  assert.equal(out.currentUniverseOnly,true);
  assert.equal(out.pointInTimeSectorHistoryVerified,false);
});

test("unknown GICS sector fails closed instead of assigning a synthetic sector",()=>{
  const csv=fixtureCsv().replace("Information Technology","Unknown Sector");
  assert.throws(()=>parseSectorUniverseCsv(csv,{requireSp500Size:false}),/SECTOR_UNIVERSE_GICS_UNSUPPORTED/);
});

test("stored rows generate raw sector breadth and volume-demand inputs with explicit coverage only",()=>{
  const universe=parseSectorUniverseCsv(fixtureCsv(),{requireSp500Size:false});
  const out=buildCurrentUniverseSectorInputs({rows:storedRows(260),universe});
  assert.equal(out.noProviderCalls,true);
  assert.equal(out.noPublish,true);
  assert.equal(out.dbSchemaChanged,false);
  assert.equal(out.currentUniverseOnly,true);
  assert.equal(out.pointInTimeSectorHistoryVerified,false);
  assert.match(out.warning,/NOT_FOR_PRODUCTION_BACKTEST/);
  const latest=out.sectors.technology.at(-1);
  assert.equal(latest.coverage.memberCount,1);
  assert.equal(latest.coverage.ma50Ratio,1);
  assert.equal(latest.coverage.ma200Ratio,1);
  assert.equal(latest.coverage.highLow52wRatio,1);
  assert.equal(latest.b50,1);
  assert.equal(latest.b200,1);
  assert.equal(latest.highLowNet,1);
  assert.equal(latest.volumeBreadth,1);
});

test("missing stored history remains visible in coverage and does not become a fake zero",()=>{
  const universe=parseSectorUniverseCsv(fixtureCsv(),{requireSp500Size:false});
  const rows=storedRows(260).filter(row=>!(row.ticker==="AAA"&&row.tradeDate>dateAt(100)&&row.tradeDate<dateAt(259)));
  const out=buildCurrentUniverseSectorInputs({rows,universe});
  const latest=out.sectors.technology.at(-1);
  assert.equal(latest.coverage.ma50Ratio,1);
  assert.equal(latest.coverage.ma200Ratio,0);
  assert.equal(latest.coverage.highLow52wRatio,0);
  assert.equal(latest.b200,null);
  assert.equal(latest.highLowNet,null);
});

test("conflicting duplicate stored observations fail closed",()=>{
  const universe=parseSectorUniverseCsv(fixtureCsv(),{requireSp500Size:false});
  const rows=storedRows(2);
  rows.push({...rows[0],currentClose:999});
  assert.throws(()=>buildCurrentUniverseSectorInputs({rows,universe}),/SECTOR_INPUT_DUPLICATE_CONFLICT/);
});
