import test from "node:test";
import assert from "node:assert/strict";
import {splitChronologicalR24,summarizeR24Segment,maxFiniteR24} from "../lib/market-score/sector-fear-greed-r24-validation.mjs";

test("R2.4 validation split is chronological and deterministic",()=>{const rows=[{date:"2026-01-03",score:60},{date:"2026-01-01",score:40},{date:"2026-01-04",score:70},{date:"2026-01-02",score:50}];const out=splitChronologicalR24(rows);assert.deepEqual(out.first.map(x=>x.date),["2026-01-01","2026-01-02"]);assert.deepEqual(out.second.map(x=>x.date),["2026-01-03","2026-01-04"]);});

test("R2.4 segment summary keeps 50 as neutral center without fabrication",()=>{const rows=[{date:"2026-01-01",score:40,lotterySuperiority:30,volumeSuperiority:50},{date:"2026-01-02",score:50,lotterySuperiority:50,volumeSuperiority:50},{date:"2026-01-03",score:60,lotterySuperiority:70,volumeSuperiority:50}];const s=summarizeR24Segment(rows);assert.equal(s.n,3);assert.equal(s.scoreMean,50);assert.equal(s.scoreMedian,50);assert.equal(s.absBias,0);assert.equal(s.lotteryMean,50);assert.equal(s.volumeMean,50);assert.equal(s.neutralShare,1/3);});

test("R2.4 empty segment stays unavailable",()=>{assert.deepEqual(summarizeR24Segment([]),{n:0,dateStart:null,dateEnd:null,scoreMean:null,scoreMedian:null,scoreStd:null,absBias:null,lotteryMean:null,volumeMean:null,neutralShare:null,extremeShare:null});});

test("R2.4 max helper ignores nonfinite values only",()=>{assert.equal(maxFiniteR24([null,0.2,NaN,0.7]),0.7);assert.equal(maxFiniteR24([null,NaN]),null);});
