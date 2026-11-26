import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mergeCompositeObservedDisplay} from '../lib/market-score/composite-observed-display-r1.mjs';

const daily=[
 {label:'2026-11-15',value:48},
 {label:'2026-11-16',value:50},
];
const observed=[{label:'2026-11-16T12:00:00Z',value:50}];
const at=(time,value)=>({label:'2026-11-16T'+time+'Z',value});

test('published current calculation updates the 1D last point before the 15-minute archive interval',()=>{
 const trend=mergeCompositeObservedDisplay(daily,observed,1,at('12:05:00',53));
 assert.deepEqual(trend.map(p=>p.value),[50,53]);
 assert.equal(trend.at(-1).label,'2026-11-16T12:05:00.000Z');
 assert.equal(observed.length,1,'published current is display-only, not an archive mutation');
});
test('latest published calculation replaces prior ephemeral overlay, not the confirmed archive',()=>{
 const trend=mergeCompositeObservedDisplay(daily,observed,1,at('12:10:00',56));
 assert.deepEqual(trend.map(p=>p.value),[50,56]);
});
test('unchanged published score must not add a synthetic flat observation',()=>{
 assert.deepEqual(mergeCompositeObservedDisplay(daily,observed,1,at('12:10:00',50)).map(p=>p.value),[50]);
});
test('older current response cannot overtake newer saved observation',()=>{
 assert.deepEqual(mergeCompositeObservedDisplay(daily,observed,1,at('11:50:00',56)).map(p=>p.value),[50]);
});
test('null, missing, and invalid current values are not converted to zero',()=>{
 for(const value of [null,undefined,NaN,-1,101]){
  assert.deepEqual(mergeCompositeObservedDisplay(daily,observed,1,at('12:10:00',value)).map(p=>p.value),[50]);
 }
});
test('short multiday curves combine existing history with the latest verified current',()=>{
 const trend=mergeCompositeObservedDisplay(daily,observed,7,at('12:10:00',56));
 assert.deepEqual(trend.map(p=>p.value),[48,50,56]);
 assert.equal(trend.at(-1).label,'2026-11-16T12:10:00.000Z');
});
test('long range continues using only approved daily confirmed points',()=>{
 for(const days of [180,365]){
  const trend=mergeCompositeObservedDisplay(daily,observed,days,at('12:10:00',56));
  assert.deepEqual(trend,daily);
 }
});
test('no archive means one actual verified current calculation, not invented historic points',()=>{
 assert.deepEqual(mergeCompositeObservedDisplay([],[],1,at('12:10:00',56)),
  [{label:'2026-11-16T12:10:00.000Z',value:56}]);
});
test('dashboard passes stored publication score and timestamp, without changing calculation or archive schedule',()=>{
 const page=readFileSync(new URL('../app/dashboard-ui.tsx',import.meta.url),'utf8');
 assert.match(page,/const current=overallScore===null\|\|!market\?\.updatedAt\?null:/);
 assert.match(page,/mergeCompositeObservedDisplay\(daily,archived,periodDays,current\)/);
 assert.match(page,/const overallTrend=\(\(\)=>\{/,'overall history remains derived from verified data');
 const archive=readFileSync(new URL('../lib/composite-observed-history-r1.mjs',import.meta.url),'utf8');
 assert.match(archive,/COMPOSITE_OBSERVED_INTERVAL_MS=15\*60000/);
});

test('1W/1M/3M without intraday observations respect the selected window',()=>{
 const history=[
  {label:'2026-01-01',value:41},
  {label:'2026-08-01',value:43},
  {label:'2026-10-01',value:45},
  {label:'2026-11-10',value:47},
  {label:'2026-11-16',value:50},
 ];
 assert.deepEqual(mergeCompositeObservedDisplay(history,[],7).map(p=>p.value),[47,50]);
 assert.deepEqual(mergeCompositeObservedDisplay(history,[],30).map(p=>p.value),[47,50]);
 assert.deepEqual(mergeCompositeObservedDisplay(history,[],90).map(p=>p.value),[45,47,50]);
 assert.deepEqual(mergeCompositeObservedDisplay(history,[],180),history);
 assert.deepEqual(mergeCompositeObservedDisplay([],[],7),[]);
 assert.deepEqual(mergeCompositeObservedDisplay([...history].reverse(),[],7).map(p=>p.value),[47,50]);
});

// W06 #40: exercise the actual React effect callback, not a duplicated mock
// implementation. The public GET remains read-only and must not erase the
// last verified archive on an incomplete or temporarily unavailable response.
test('W06 #40 transient observations response preserves last verified archive until next READY',async()=>{
 const ts=(await import('typescript')).default;
 const page=readFileSync(new URL('../app/dashboard-ui.tsx',import.meta.url),'utf8');
 const anchor=page.indexOf(' const [compositeArchive,setCompositeArchive]');
 const start=page.indexOf(' useEffect(()=>{',anchor);
 const end=page.indexOf('\n const [market,setMarket]',start);
 assert.ok(anchor>0&&start>anchor&&end>start,'find actual composite archive effect');
 const effectSource=page.slice(start,end);
 const compiled=ts.transpileModule('function run(){'+effectSource+'}',{
  compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None},
 }).outputText;
 let refresh=null;
 let saved=null;
 let payload={status:'READY',period:'1D',points:[{observedAt:'2026-11-16T12:00:00Z',score:50}]};
 const run=new Function('useEffect','startStoredRefresh','fetch','setCompositeArchive','periodDays',
  compiled+';return run;')(
  effect=>effect(),fn=>{refresh=fn;return()=>{};},
  async()=>new Response(JSON.stringify(payload),{status:200,headers:{'content-type':'application/json'}}),
  value=>{saved=value;},1);
 run();
 assert.equal(typeof refresh,'function');
 const signal=new AbortController().signal;
 await refresh(signal);
 assert.equal(saved.points[0].score,50);
 const known=saved;
 payload={status:'PENDING',period:'1D',points:[]};
 await refresh(signal);
 assert.equal(saved,known,'PENDING does not wipe last valid archive');
 payload={status:'READY',period:'1W',points:[]};
 await refresh(signal);
 assert.equal(saved,known,'late wrong-period response does not wipe selected period');
 payload={status:'READY',period:'1D',points:[{observedAt:'2026-11-16T12:05:00Z',score:53}]};
 await refresh(signal);
 assert.deepEqual(saved.points.map(p=>p.score),[53],'next READY read replaces prior stored points');
 payload={status:'READY',period:'1D',points:[]};
 await refresh(signal);
 assert.deepEqual(saved.points,[],'legitimate READY empty archive clears it explicitly');
});
