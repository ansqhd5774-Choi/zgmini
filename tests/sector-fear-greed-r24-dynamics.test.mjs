import test from "node:test";
import assert from "node:assert/strict";
import {quantileR24,pearsonR24,summarizeR24Dynamics} from "../lib/market-score/sector-fear-greed-r24-dynamics.mjs";

test("R2.4 quantiles interpolate deterministically and keep zero",()=>{assert.equal(quantileR24([0,10,20,30,40],0.5),20);assert.equal(quantileR24([0,100],0.25),25);assert.equal(quantileR24([],0.5),null);assert.equal(quantileR24([1,2],2),null);});

test("R2.4 Pearson handles positive relation and rejects constants",()=>{assert.equal(pearsonR24([1,2,3],[2,4,6]),1);assert.equal(pearsonR24([1,1,1],[1,2,3]),null);assert.equal(pearsonR24([1],[2]),null);});

test("R2.4 dynamics uses approved fear-greed bands without fabrication",()=>{const rows=[{date:"2026-01-05",score:80,memberObservations:20,quartileSize:5},{date:"2026-01-01",score:10,memberObservations:18,quartileSize:4},{date:"2026-01-02",score:30,memberObservations:19,quartileSize:4},{date:"2026-01-03",score:50,memberObservations:20,quartileSize:5},{date:"2026-01-04",score:60,memberObservations:21,quartileSize:5}];const s=summarizeR24Dynamics(rows);assert.equal(s.n,5);assert.equal(s.dateStart,"2026-01-01");assert.equal(s.dateEnd,"2026-01-05");assert.equal(s.extremeFearShare,0.2);assert.equal(s.fearShare,0.2);assert.equal(s.neutralShare,0.2);assert.equal(s.greedShare,0.2);assert.equal(s.extremeGreedShare,0.2);assert.equal(s.minMembers,18);assert.equal(s.minQuartileSize,4);assert.equal(s.uniqueScoreCount,5);});

test("R2.4 dynamics empty history stays unavailable",()=>{assert.deepEqual(summarizeR24Dynamics([]),{n:0,dateStart:null,dateEnd:null,min:null,p05:null,p25:null,median:null,p75:null,p95:null,max:null,std:null,p95p05Span:null,extremeFearShare:null,fearShare:null,neutralShare:null,greedShare:null,extremeGreedShare:null,uniqueScoreCount:0,lag1Correlation:null,meanAbsSequentialChange:null,p95AbsSequentialChange:null,minMembers:null,medianMembers:null,minQuartileSize:null,medianQuartileSize:null});});
