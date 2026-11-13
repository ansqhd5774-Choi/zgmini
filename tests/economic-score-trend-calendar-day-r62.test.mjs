import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {isRealEconomicScoreDay} from '../lib/economic-score-trend-date.mjs';
import {economicOneYearChart} from '../lib/economic-trend-chart-r60.mjs';

const panel=()=>readFileSync(new URL('../app/economic-indicators/economic-detail-panel.tsx',import.meta.url),'utf8');

test('valid UTC score observation days include leap year and month boundaries',()=>{
 for(const day of ['2024-02-29','2025-12-31','2026-01-01','2026-04-30','2026-10-31'])
  assert.equal(isRealEconomicScoreDay(day),true,day);
});

test('impossible observation dates are rejected instead of normalized into future points',()=>{
 for(const day of ['2026-02-29','2026-02-31','2026-04-31','2026-11-31','2024-02-30'])
  assert.equal(isRealEconomicScoreDay(day),false,day);
 assert.equal(new Date(Date.parse('2026-02-31T00:00:00Z')).toISOString().slice(0,10),'2026-03-03');
});

test('invalid formats and types do not become score timeline dates',()=>{
 for(const day of ['2026-13-01','2026-00-01','2026-02-00','2026-1-01','2026-01-1','2026-02','not-a-date','',null,undefined,0,NaN])
  assert.equal(isRealEconomicScoreDay(day),false,String(day));
});

test('a malformed last observation cannot replace the last genuine score day',()=>{
 const source=[{date:'2026-10-31',score:53},{date:'2026-11-31',score:99},{date:'2026-11-01',score:54}];
 const valid=source.filter(p=>isRealEconomicScoreDay(p.date)).sort((a,b)=>a.date.localeCompare(b.date));
 assert.deepEqual(valid.map(p=>p.date),['2026-10-31','2026-11-01']);
 assert.equal(valid.at(-1).score,54);
});

test('economic detail score trend validates real days, gaps, and latest valid marker',()=>{
 const source=panel();
 assert.match(source,/import \{isRealEconomicScoreDay\} from "\.\.\/\.\.\/lib\/economic-score-trend-date\.mjs";/);
 assert.match(source,/const dated=\(s:unknown\):s is string=>isRealEconomicScoreDay\(s\);/);
 assert.match(source,/if\(dated\(d\)&&validScore\(v\)\)byDay\.set\(d,v\)/);
 assert.match(source,/\(dated\(date\)\|\|\(typeof date===/);
 assert.match(source,/const last=chart\.findLast\(point=>validScore\(point\.score\)\)/);
 const timeline=economicOneYearChart([
  {date:'2026-02-30',score:99},
  {date:'2026-02-27',score:51},
  {date:'2026-02-28',score:null,value:83},
  {date:'2026-03-01',score:58},
  {date:'2026-03-02',score:null,value:83},
 ]);
 assert.deepEqual(timeline,[
  {date:'2026-02-27',score:51},
  {date:'2026-02-28',score:null},
  {date:'2026-03-01',score:58},
  {date:'2026-03-02',score:null},
 ]);
 assert.deepEqual(timeline.findLast(p=>typeof p.score==='number'),{date:'2026-03-01',score:58});
});

test('month-only raw trends remain distinct from daily score history',()=>{
 const source=panel();
 assert.match(source,/typeof date==="string"&&\/\^\\d\{4\}-\(0\[1-9\]\|1\[0-2\]\)\$\//);
 assert.equal(isRealEconomicScoreDay('2026-10'),false,'daily score history does not fabricate YYYY-MM-DD');
});

test('stored-only score selection and raw chart values preserve null and zero',()=>{
 const source=panel();
 assert.match(source,/useStoredIndex<Snapshot>\("\/api\/market-score"\)/);
 assert.match(source,/domain\?\.status==="READY"&&validScore\(domain\.score\)/);
 assert.match(source,/const chart:MarketFearGreedChartPoint\[\]=useMemo\(\(\)=>economicOneYearChart\(domain\?\.trend\)/);
 assert.match(source,/<MarketFearGreedChart data=\{chart\}/);
 const chart=economicOneYearChart([
  {date:'2026-10-01',value:27},
  {date:'2026-10-02',score:null,value:83},
  {date:'2026-10-03',score:0,value:83},
 ]);
 assert.deepEqual(chart.map(p=>p.score),[27,null,0]);
});

