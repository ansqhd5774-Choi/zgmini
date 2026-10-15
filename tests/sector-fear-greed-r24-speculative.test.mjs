import test from "node:test";
import assert from "node:assert/strict";
import {rankSuperiorityScoreR24,buildSectorSpeculativeCandidateR24,SECTOR_FEAR_GREED_R24_WEIGHTS} from "../lib/market-score/sector-fear-greed-r24-speculative-shadow.mjs";

const isoDay=i=>{const d=new Date(Date.UTC(2024,0,1+i));return d.toISOString().slice(0,10);};
function fixture(days=120){
  const spyRows=[],etfRows=[],rows=[],tickers=Array.from({length:12},(_,i)=>`T${i}`),pitHistory={byTicker:{}};let spy=100,etf=100;const stock=Object.fromEntries(tickers.map((ticker,i)=>[ticker,50+i]));
  for(const ticker of tickers)pitHistory.byTicker[ticker]=[{ticker,sectorId:"technology",dateAdded:"2020-01-01",dateRemoved:null}];
  for(let i=0;i<days;i++){
    const date=isoDay(i),spyRet=0.0007+0.002*Math.sin(i/4)+0.0005*Math.cos(i/11),etfRet=0.0009+0.0023*Math.cos(i/5)+0.0004*Math.sin(i/7);spy*=1+spyRet;etf*=1+etfRet;spyRows.push({date,close:spy});etfRows.push({date,close:etf});
    for(let j=0;j<tickers.length;j++){
      const amp=0.00045+0.00042*j,ret=0.8*etfRet+amp*Math.sin(i/(2.8+j*0.07)+j*0.6)+0.00025*Math.cos(i/3+j);stock[tickers[j]]*=1+ret;
      const base=90000*(1+j*0.03),cycle=1+0.12*Math.sin(i/6+j*0.35)+0.05*Math.cos(i/13+j*0.2),volume=Math.max(1000,base*cycle);rows.push({tradeDate:date,ticker:tickers[j],currentClose:stock[tickers[j]],currentVolume:volume});
    }
  }
  return {rows,spyRows,etfRows,pitHistory,sectorId:"technology"};
}

test("R2.4 superiority is bounded and neutral on ties",()=>{assert.equal(rankSuperiorityScoreR24([3,4],[1,2]),100);assert.equal(rankSuperiorityScoreR24([1,2],[3,4]),0);assert.equal(rankSuperiorityScoreR24([2,2],[2,2]),50);assert.equal(rankSuperiorityScoreR24([], [1]),null);});

test("R2.4 keeps equal weights with no historical ECDF gate",()=>{const out=buildSectorSpeculativeCandidateR24(fixture());assert.deepEqual(out.weights,{lotterySuperiority:0.5,volumeSuperiority:0.5});assert.deepEqual(SECTOR_FEAR_GREED_R24_WEIGHTS,{lotterySuperiority:0.5,volumeSuperiority:0.5});assert.equal(out.historicalReferenceRequired,false);assert.equal(out.status,"READY_CROSS_SECTION");assert.ok(out.history.length>0);assert.ok(out.score>=0&&out.score<=100);assert.equal(out.score,0.5*out.metrics.lotterySuperiority+0.5*out.metrics.volumeSuperiority);});

test("R2.4 past scores are prefix-stable",()=>{const short=buildSectorSpeculativeCandidateR24(fixture(105)),full=buildSectorSpeculativeCandidateR24(fixture(120));assert.ok(short.history.length>0);const byDate=new Map(full.history.map(row=>[row.date,row]));for(const row of short.history){const later=byDate.get(row.date);assert.ok(later);assert.equal(later.lotterySuperiority,row.lotterySuperiority);assert.equal(later.volumeSuperiority,row.volumeSuperiority);assert.equal(later.score,row.score);}});

test("R2.4 fails closed without sector ETF benchmark",()=>{const input=fixture();input.etfRows=[];const out=buildSectorSpeculativeCandidateR24(input);assert.equal(out.status,"PARTIAL");assert.equal(out.score,null);assert.equal(out.history.length,0);});
