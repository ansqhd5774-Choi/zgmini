import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {currentCnnSessionCheckedPoints} from '../lib/cnn-current-session-history-r4.mjs';

// Exercise the actual CNN UI useMemo logic, not a separate chart algorithm.
// A synchronous useMemo adapter is sufficient for deterministic input fixtures.
const panel=readFileSync(new URL('../app/fear-greed/usa/cnn-panel.tsx',import.meta.url),'utf8');
function block(start,next){
 const from=panel.indexOf(start);
 assert.notEqual(from,-1,'CNN UI expression missing: '+start);
 const to=panel.indexOf(next,from);
 assert.ok(to>from,'CNN UI boundary missing: '+next);
 return panel.slice(from,to);
}
const runArchive=new Function('archived','selectedPeriod','normalizeHistory','useMemo',
 block('  const archiveHistory=useMemo(', '  // Archive is an addition')+'\nreturn archiveHistory;');
const runCombined=new Function('archiveHistory','allIntraday','useMemo',
 block('  const combinedObserved=useMemo(', '  const history = useMemo(')+'\nreturn combinedObserved;');
const runHistory=new Function('selectedPeriod','payload','archived','observedSidecarReady',
 'allHistory','allIntraday','archiveHistory','combinedObserved','currentCnnSessionHistory',
 'getMarketPeriodConfig','useMemo',
 block('  const history = useMemo(', '  const observedRanges = useMemo(')+'\nreturn history;');
const runPcLabels=new Function('selectedPeriod','archived','payload','allIntraday',
 'currentCnnSessionCheckedPoints','useMemo',
 block('  const currentSessionPcDates = useMemo(', '  const chartAxis = useMemo(')
  .replaceAll('new Set<string>()','new Set()')+'\nreturn currentSessionPcDates;');
const useMemo=fn=>fn();
const normalizeHistory=(history=[])=>history.flatMap(p=>{
 const date=p?.date??p?.timestamp;
 const score=typeof p?.score==='number'?p.score:p?.value;
 if(typeof date!=='string'||typeof score!=='number'||!Number.isFinite(score)||score<0||score>100)return [];
 const time=Date.parse(date);
 return Number.isFinite(time)?[{date:new Date(time).toISOString(),time,score}]:[];
}).sort((a,b)=>a.time-b.time);
const observedAt='2026-11-16T22:59:30.000Z';
const obs=(observedAt,score)=>({observedAt,score});
const check=(checkedAt,score,sourceObservedAt='2026-11-16T21:30:00.000Z')=>({checkedAt,sourceObservedAt,score});
const checked=[check('2026-11-16T22:00:00.000Z',40),check('2026-11-16T22:15:00.000Z',40)];
const source=[obs('2026-11-16T21:30:00.000Z',40),obs(observedAt,55)];
const daily=normalizeHistory([{timestamp:'2026-11-15T22:00:00.000Z',score:35}]);
const getMarketPeriodConfig=period=>({days:{'1W':7,'1M':30,'3M':90}[period]??7});
function render(period,points,checks=[],sidecar=[],dailyPoints=daily){
 const archived={period,points,checkedPoints:checks};
 const archiveHistory=runArchive(archived,period,normalizeHistory,useMemo);
 const allIntraday=normalizeHistory(sidecar.map(p=>({timestamp:p.observedAt,score:p.score})));
 const combinedObserved=runCombined(archiveHistory,allIntraday,useMemo);
 const history=runHistory(period,{observedAt},archived,true,dailyPoints,allIntraday,
  archiveHistory,combinedObserved,()=>[],getMarketPeriodConfig,useMemo);
 return {archived,archiveHistory,combinedObserved,history};
}

test('two earlier PC checks never replace later authentic CNN 1W/1M/3M observations',()=>{
 for(const period of ['1W','1M','3M']){
  const {archiveHistory,history}=render(period,source,checked);
  assert.deepEqual(archiveHistory.map(p=>p.score),[40,40,40,55],period+' authentic timestamps');
  assert.deepEqual(history.map(p=>p.score),[35,40,40,40,55],period+' plotted history');
  assert.equal(history.at(-1).date,observedAt);
 }
});
test('an authentic CNN score including zero overrides a same-time PC check',()=>{
 const {archiveHistory,history}=render('1W',[
  obs('2026-11-16T22:00:00.000Z',0),obs(observedAt,55),
 ],checked);
 assert.deepEqual(archiveHistory.map(p=>p.score),[0,40,55]);
 assert.deepEqual(history.map(p=>p.score),[35,0,40,55]);
});
test('one PC check cannot create an unverified synthetic point',()=>{
 const {archiveHistory,history}=render('1W',source,[checked[0]]);
 assert.deepEqual(archiveHistory.map(p=>p.score),[40,55]);
 assert.deepEqual(history.map(p=>p.score),[35,40,55]);
});
test('one archive observation plus one real sidecar is a genuine two-point trend',()=>{
 const {archiveHistory,combinedObserved,history}=render('1W',[source[0]],[],[source[1]],[]);
 assert.equal(archiveHistory.length,1);
 assert.deepEqual(combinedObserved.map(p=>p.score),[40,55]);
 assert.deepEqual(history.map(p=>p.score),[40,55]);
});
test('CNN source timestamp cannot be mislabelled PC verification in the 1D tooltip',()=>{
 const at='2026-11-16T22:00:00.000Z';
 const archive={period:'1D',points:[obs(at,0)],checkedPoints:[
  check(at,40),check('2026-11-16T22:15:00.000Z',40),
 ]};
 const labels=runPcLabels('1D',archive,{observedAt},[],currentCnnSessionCheckedPoints,useMemo);
 assert.equal(labels.has(at),false,'source is genuine CNN, not a PC check');
 assert.equal(labels.has('2026-11-16T22:15:00.000Z'),true);
});
