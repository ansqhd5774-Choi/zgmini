import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  resolveMarketParquetKey,
  parseMarketParquetManifest,
  extractTargetEtfRows,
  mergeSectorPriceHistory,
  collectSectorFearGreedR1Shadow,
} from "../scripts/pc-writer/collect-sector-fear-greed-r1-shadow.mjs";
import {SECTOR_FEAR_GREED_R1_ETFS} from "../lib/market-score/sector-fear-greed-r1-shadow.mjs";

const targets=["SPY",...Object.values(SECTOR_FEAR_GREED_R1_ETFS)];
const gics=["Information Technology","Communication Services","Consumer Discretionary","Consumer Staples","Financials","Health Care","Industrials","Energy","Materials","Real Estate","Utilities"];
function universeCsv(){
  const rows=["Symbol,Security,GICS Sector"];
  for(let i=0;i<495;i++)rows.push(`T${String(i).padStart(3,"0")},Company ${i},${gics[i%gics.length]}`);
  return rows.join("\n");
}
function responseText(text,status=200){return {status,headers:{get:()=>String(Buffer.byteLength(text))},text:async()=>text};}
function manifestResponse(files){return {status:200,headers:{get:()=>null},json:async()=>({files})};}
function fileResponse(){return {status:200,headers:{get:()=>"8"},arrayBuffer:async()=>new Uint8Array([80,65,82,49,0,0,0,0]).buffer};}
function parsedRows(date){return targets.map((symbol,i)=>({date,symbol,asset_type:"ETF",close:100+i,volume:1000+i}));}

test("MarketParquet key discovery is local-only and supports the canonical name",()=>{
  assert.equal(resolveMarketParquetKey({MARKETPARQUET_API_KEY:"bt_test"}),"bt_test");
  assert.equal(resolveMarketParquetKey({MARKET_PARQUET_API_KEY:"legacy"}),"legacy");
  assert.equal(resolveMarketParquetKey({}),null);
});

test("manifest is bounded, HTTPS-only and sorted by date",()=>{
  const out=parseMarketParquetManifest({files:[
    {filename:"2026-10-09.parquet",download_url:"https://example.test/b"},
    {filename:"2026-10-08.parquet",download_url:"https://example.test/a"},
  ]});
  assert.deepEqual(out.map(x=>x.date),["2026-10-08","2026-10-09"]);
  assert.throws(()=>parseMarketParquetManifest({files:[{filename:"2026-10-09.parquet",download_url:"http://example.test/a"}]}),/DOWNLOAD_URL_INVALID/);
});

test("ETF parser requires SPY plus all eleven sector ETFs",()=>{
  const date="2026-10-09",out=extractTargetEtfRows(parsedRows(date),date);
  assert.equal(Object.keys(out).length,12);
  assert.equal(out.SPY.close,100);
  assert.equal(out.XLK.volume,1001);
  assert.throws(()=>extractTargetEtfRows(parsedRows(date).slice(1),date),/TARGETS_MISSING/);
});

test("price history is idempotent and conflicting provider revisions fail closed",()=>{
  const date="2026-10-09",append=Object.fromEntries(targets.map((ticker,i)=>[ticker,[{date,close:100+i,volume:1000+i}]]));
  const first={series:mergeSectorPriceHistory(null,append)};
  const second=mergeSectorPriceHistory(first,append);
  assert.equal(second.SPY.length,1);
  const conflict=structuredClone(append);conflict.SPY[0].close=999;
  assert.throws(()=>mergeSectorPriceHistory(first,conflict),/HISTORY_CONFLICT/);
});

test("without a local MarketParquet key collector stores current GICS only and makes no MarketParquet request",async()=>{
  const base=fs.mkdtempSync(path.join(os.tmpdir(),"zgmini-sector-collect-no-key-"));
  fs.writeFileSync(path.join(base,"providers.env"),"FRED_API_KEY=fixture\n");
  const calls=[];
  try{
    const out=await collectSectorFearGreedR1Shadow(base,{now:new Date("2026-10-12T12:00:00Z"),fetchImpl:async(url)=>{calls.push(String(url));return responseText(universeCsv());}});
    assert.equal(out.status,"PARTIAL_API_KEY_MISSING");
    assert.equal(out.universe.members,495);
    assert.equal(out.marketParquet.keyPresent,false);
    assert.equal(calls.length,1);
    assert.ok(fs.existsSync(path.join(base,"local-sector-fear-greed-r1-universe.csv")));
    assert.equal(fs.existsSync(path.join(base,"local-sector-fear-greed-r1-price-history.json")),false);
  }finally{fs.rmSync(base,{recursive:true,force:true});}
});

test("with local key collector writes one normalized ETF session and never sends bearer token to file URL",async()=>{
  const base=fs.mkdtempSync(path.join(os.tmpdir(),"zgmini-sector-collect-key-"));
  fs.writeFileSync(path.join(base,"providers.env"),"MARKETPARQUET_API_KEY=bt_fixture_secret\n");
  const requests=[];
  try{
    const out=await collectSectorFearGreedR1Shadow(base,{
      now:new Date("2026-10-12T12:00:00Z"),
      fetchImpl:async(url,init={})=>{
        requests.push({url:String(url),auth:init.headers?.Authorization??null});
        if(String(url).includes("raw.githubusercontent.com"))return responseText(universeCsv());
        if(String(url).includes("/manifest/etf_daily"))return manifestResponse([{filename:"2026-10-09.parquet",download_url:"https://files.example.test/2026-10-09.parquet"}]);
        return fileResponse();
      },
      parquetReader:async()=>parsedRows("2026-10-09"),
    });
    assert.equal(out.status,"COMPLETE_FREE_WINDOW");
    assert.equal(out.providerRequests,3);
    assert.equal(out.marketParquet.downloadedFiles,1);
    const stored=JSON.parse(fs.readFileSync(path.join(base,"local-sector-fear-greed-r1-price-history.json"),"utf8"));
    assert.equal(stored.series.SPY.length,1);
    assert.equal(stored.series.XLU.length,1);
    assert.match(requests[1].auth,/^Bearer bt_fixture_secret$/);
    assert.equal(requests[2].auth,null);
    assert.doesNotMatch(JSON.stringify(out),/bt_fixture_secret/);
  }finally{fs.rmSync(base,{recursive:true,force:true});}
});
