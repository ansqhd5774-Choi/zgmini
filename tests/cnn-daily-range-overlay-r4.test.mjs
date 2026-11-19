import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

// Execute the actual observedRanges useMemo expression from the production
// CNN card. A fake range is never added when real intraday points were plotted.
const panel=readFileSync(new URL('../app/fear-greed/usa/cnn-panel.tsx',import.meta.url),'utf8');
const beginning=panel.indexOf('  const observedRanges = useMemo(');
const ending=panel.indexOf("  // CNN's previous_close",beginning);
assert.ok(beginning>=0&&ending>beginning,'production observedRanges expression must exist');
const expression=panel.slice(beginning,ending);
const compute=new Function('observedSidecarReady','selectedPeriod','archiveHistory',
  'combinedObserved','payload','history','useMemo',
  expression+'\nreturn observedRanges;');
const date='2026-11-16';
const range={date,first:{observedAt:date+'T15:00:00.000Z',score:36},
  last:{observedAt:date+'T16:00:00.000Z',score:40},
  low:{observedAt:date+'T15:00:00.000Z',score:34},
  high:{observedAt:date+'T16:00:00.000Z',score:45}};
const observed=[{date:date+'T15:00:00.000Z',time:Date.parse(date+'T15:00:00Z'),score:36},
  {date:date+'T16:00:00.000Z',time:Date.parse(date+'T16:00:00Z'),score:40}];
const daily={date,score:40,time:Date.parse(date+'T00:00:00Z')};
const display=(period,history,combined=observed,archive=observed.slice(0,1),ranges=[range])=>
  compute(true,period,archive,combined,{dailyObservedRanges:ranges},history,fn=>fn());

test('W06 #36 one archived + one sidecar source point must not also draw their daily high/low range',()=>{
 for(const period of ['1W','1M','3M']){
  assert.deepEqual(display(period,observed),[],period);
 }
});
test('W06 #36 long 6M/1Y daily-close charts preserve actual daily high/low ranges',()=>{
 for(const period of ['6M','1Y']){
  assert.deepEqual(display(period,[daily]),[{date,low:34,high:45}],period);
 }
});
test('W06 #36 only one observed point never suppresses the daily range',()=>{
 assert.deepEqual(display('1W',[daily],observed.slice(0,1)),[{date,low:34,high:45}]);
});
test('W06 #36 only days replaced by real intraday observations lose their daily range',()=>{
 const other='2026-11-13';
 const otherDaily={date:other,score:41,time:Date.parse(other+'T00:00:00Z')};
 const otherRange={...range,date:other};
 const records=[otherDaily,...observed];
 assert.deepEqual(display('1W',records,observed,observed.slice(0,1),[otherRange,range]),
  [{date:other,low:34,high:45}]);
});
test('W06 #36 invalid/missing range values and disabled sidecar never add overlay',()=>{
 assert.deepEqual(display('1W',[daily],[],[],[{...range,low:{score:-1}}]),[]);
 assert.deepEqual(compute(false,'1W',[],observed,{dailyObservedRanges:[range]},observed,fn=>fn()),[]);
});
