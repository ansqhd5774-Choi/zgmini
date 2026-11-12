import test from "node:test";
import assert from "node:assert/strict";
import {rankSuperiorityScore,buildSectorSpeculativeCandidateR23,SECTOR_FEAR_GREED_R23_WEIGHTS} from "../lib/market-score/sector-fear-greed-r23-speculative-shadow.mjs";

const isoDay=i=>{const d=new Date(Date.UTC(2024,0,1+i));return d.toISOString().slice(0,10);};
function fixture(days=90){
  const spyRows=[],etfRows=[],rows=[],tickers=Array.from({length:12},(_,i)=>`T${i}`),pitHistory={byTicker:{}};let spy=100,etf=100;const stock=Object.fromEntries(tickers.map((ticker,i)=>[ticker,50+i]));
  for(const ticker of tickers)pitHistory.byTicker[ticker]=[{ticker,sectorId:"technology",dateAdded:"2020-01-01",dateRemoved:null}];
  for(let i=0;i<days;i++){
    const date=isoDay(i),spyRet=0.0008+0.002*Math.sin(i/4)+0.0007*Math.cos(i/9),etfRet=0.001+0.0025*Math.cos(i/5)+0.0005*Math.sin(i/7);spy*=1+spyRet;etf*=1+etfRet;spyRows.push({date,close:spy});etfRows.push({date,close:etf});
    for(let j=0;j<tickers.length;j++){
      const amp=0.0005+0.00045*j,ret=0.75*etfRet+amp*Math.sin(i/(2.5+j*0.08)+j*0.7)+0.0003*Math.cos(i/3+j);stock[tickers[j]]*=1+ret;const chase=1+0.08*Math.sin(i/5+j*0.4)+0.015*j*Math.max(0,Math.sin(i/8));const volume=Math.max(1000,100000*(1+j*0.02)*chase);rows.push({tradeDate:date,ticker:tickers[j],currentClose:stock[tickers[j]],currentVolume:volume});
    }
  }
  return {rows,spyRows,etfRows,pitHistory,sectorId:"technology"};
}

test("pairwise superiority is naturally bounded with neutral ties",()=>{assert.equal(rankSuperiorityScore([3,4],[1,2]),100);assert.equal(rankSuperiorityScore([1,2],[3,4]),0);assert.equal(rankSuperiorityScore([2,2],[2,2]),50);assert.equal(rankSuperiorityScore([], [1]),null);});

test("R2.3 uses exact equal weights and no historical ECDF gate",()=>{const out=buildSectorSpeculativeCandidateR23(fixture());assert.deepEqual(out.weights,{lotterySuperiority:0.5,volumeSuperiority:0.5});assert.deepEqual(SECTOR_FEAR_GREED_R23_WEIGHTS,{lotterySuperiority:0.5,volumeSuperiority:0.5});assert.equal(out.historicalReferenceRequired,false);assert.equal(out.status,"READY_CROSS_SECTION");assert.ok(out.history.length>0);assert.ok(out.score>=0&&out.score<=100);assert.equal(out.score,0.5*out.metrics.lotterySuperiority+0.5*out.metrics.volumeSuperiority);});

test("R2.3 past scores are prefix-stable when future observations are appended",()=>{const short=buildSectorSpeculativeCandidateR23(fixture(82)),full=buildSectorSpeculativeCandidateR23(fixture(90));assert.ok(short.history.length>0);const byDate=new Map(full.history.map(row=>[row.date,row]));for(const row of short.history){const later=byDate.get(row.date);assert.ok(later);assert.equal(later.lotterySuperiority,row.lotterySuperiority);assert.equal(later.volumeSuperiority,row.volumeSuperiority);assert.equal(later.score,row.score);}});

test("R2.3 cannot fabricate a score without the sector ETF benchmark",()=>{const input=fixture();input.etfRows=[];const out=buildSectorSpeculativeCandidateR23(input);assert.equal(out.status,"PARTIAL");assert.equal(out.score,null);assert.equal(out.history.length,0);});
