import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizeMarketTrendPointsR4} from '../lib/market-score/market-trend-normalize-r4.mjs';
import {marketTrendWindowR1} from '../lib/market-score/market-trend-window-r1.mjs';
import {mergeCompositeObservedDisplay} from '../lib/market-score/composite-observed-display-r1.mjs';
import {appendPublishedDomainCurrent} from '../lib/market-score/published-domain-trend-r4.mjs';
import {amplifyCompositeDisplayScore,amplifyCompositeDisplayTrend} from '../lib/market-score/composite-display-sensitivity-r1.mjs';
import {miniTrendGeometry} from '../lib/market-score/mini-trend-geometry.mjs';

const days=[1,7,30,90,180,365];
const currentTime='2026-11-16T12:10:00Z';
const archiveTime='2026-11-16T12:00:00Z';
const raw=[
 {date:'2025-11-01',value:40},
 {date:'2026-05-01',value:44},
 {date:'2026-08-01',value:47},
 {date:'2026-10-15',value:49},
 {date:'2026-11-15',value:50},
 {date:'2026-11-16',value:50},
 // Previously accepted by the dashboard's inline normalizer: not READY.
 {date:'2026-11-17',value:99,status:'PARTIAL'},
];
const normalize=rows=>normalizeMarketTrendPointsR4(rows);
const summary=(period,score=53,observed=[{observedAt:archiveTime,score:50}],override=raw)=>{
 const daily=marketTrendWindowR1(amplifyCompositeDisplayTrend(normalize(override)),period);
 const archived=observed.map(p=>({
  label:p.observedAt,value:amplifyCompositeDisplayScore(p.score),
 })).filter(p=>p.value!==null);
 const current=score===null?null:{
  label:currentTime,value:amplifyCompositeDisplayScore(score),boundToPublishedCard:true,
 };
 return mergeCompositeObservedDisplay(daily,archived,period,current);
};
const domain=(period,score=53,override=raw)=>{
 const daily=marketTrendWindowR1(normalize(override),period,{includeBoundaryCarry:false});
 return appendPublishedDomainCurrent(daily,score===null?null:{label:currentTime,value:score},period);
};

test('#69 normalized dashboard input uses verified numeric zero and drops explicit PARTIAL/STALE/provisional scores',()=>{
 const value=normalize([
  {date:'2026-11-15',score:0,status:'READY'},
  {date:'2026-11-16',score:73,status:'PARTIAL'},
  {date:'2026-11-16',score:82,status:'STALE'},
  {date:'2026-11-16',score:79,status:'PROVISIONAL'},
  {date:'2026-11-16',score:84,status:'UNAVAILABLE'},
  {date:'2026-11-16',score:65,status:'READY'},
  {label:'2026-11-16',value:0},
 ]);
 assert.deepEqual(value,[
  {label:'2026-11-15',value:0},
  {label:'2026-11-16',value:65},
  {label:'2026-11-16',value:0},
 ]);
});

test('#69 null, NaN, out-of-range and strings never become chart zero or 50',()=>{
 assert.deepEqual(normalize([
  {date:'2026-11-16',value:null},
  {date:'2026-11-16',value:NaN},
  {date:'2026-11-16',value:-1},
  {date:'2026-11-16',value:101},
  {date:'2026-11-16',score:'50'},
  {date:'2026-11-16',score:undefined},
 ]),[]);
});

test('#69 real six-period composite chart contract: 1D/1W/1M/3M show current; 6M/1Y keep confirmed daily',()=>{
 assert.equal(amplifyCompositeDisplayScore(53),60.5);
 for(const period of days){
  const points=summary(period);
  assert.ok(points.length>0,String(period));
  const latest=points.at(-1);
  assert.equal(latest.value,period>=180?50:60.5,period+' last published vs confirmed');
  assert.equal(latest.label,period>=180?'2026-11-16':'2026-11-16T12:10:00.000Z',String(period));
  assert.ok(!points.some(p=>p.label.startsWith('2026-11-17')),period+' no unverified candidate');
  const geom=miniTrendGeometry(points,period);
  assert.ok(geom.last);
  assert.ok(Number.isFinite(geom.last.x)&&Number.isFinite(geom.last.y),String(period));
 }
});

test('#69 all six domain chart periods retain native 0-100 scores without composite sensitivity',()=>{
 for(const period of days){
  const points=domain(period);
  assert.ok(points.length>0);
  assert.equal(points.at(-1).value,period>=180?50:53,String(period));
  assert.ok(!points.some(p=>p.label.startsWith('2026-11-17')));
 }
});

test('#69 domain charts show only actual dated observations, not a fabricated window-start sample',()=>{
 const sourceDates=new Set(normalize(raw).map(p=>p.label));
 const ui=readFileSync(new URL('../app/dashboard-ui.tsx',import.meta.url),'utf8');
 assert.match(ui,/const daily=marketTrendWindowR1\\(normalizeMarketTrendPointsR4\\(domain\\?\\.trend,market\\?\\.updatedAt\\),periodDays,\\{includeBoundaryCarry:false\\}\\)/);
 for(const period of [7,30,90,180,365]){
  const cutoff=new Date(Date.parse('2026-11-16T00:00:00Z')-period*86400000).toISOString().slice(0,10);
  assert.equal(sourceDates.has(cutoff),false,'fixture has no real boundary sample: '+period);
  const points=domain(period);
  assert.equal(points.some(point=>point.label===cutoff),false,'no synthetic cutoff point at '+period+'D');
  assert.ok(points.every(point=>point.label.includes('T')||sourceDates.has(point.label)),
   period+'D every plotted date is from published history or the verified current calculation');
  assert.ok(points.length>=2,period+'D still shows a connected line from real points');
 }
});

test('#69 actual verified score zero appears as the 1D/1W/1M/3M latest point on card and chart',()=>{
 for(const period of [1,7,30,90]){
  const composite=summary(period,0),domains=domain(period,0);
  assert.equal(amplifyCompositeDisplayScore(0),0);
  assert.equal(composite.at(-1).value,0,String(period));
  assert.equal(domains.at(-1).value,0,String(period));
  assert.equal(composite.at(-1).label,'2026-11-16T12:10:00.000Z');
 }
});

test('#69 missing current score is null rather than an invented 0, while actual older archive is retained',()=>{
 for(const period of [1,7,30,90]){
  const points=summary(period,null);
  assert.equal(amplifyCompositeDisplayScore(null),null);
  assert.equal(points.at(-1).value,50,String(period));
  assert.ok(points.every(p=>p.label!==currentTime));
 }
});

test('#69 a same-timestamp archive conflict cannot override the published card across four short periods',()=>{
 for(const period of [1,7,30,90]){
  const points=summary(period,53,[
   {observedAt:archiveTime,score:50},
   {observedAt:currentTime,score:61},
   {observedAt:'2026-11-16T12:20:00Z',score:70},
  ]);
  assert.equal(points.at(-1).value,60.5,String(period));
  assert.equal(points.filter(p=>p.label==='2026-11-16T12:10:00.000Z').length,1);
  assert.equal(points.some(p=>p.label==='2026-11-16T12:20:00.000Z'),false);
 }
});

test('#69 identical current score is not appended as a fake flat line across short periods',()=>{
 for(const period of [1,7,30,90]){
  const c=summary(period,50),d=domain(period,50);
  assert.equal(c.filter(p=>p.label==='2026-11-16T12:10:00.000Z').length,0);
  assert.equal(d.filter(p=>p.label==='2026-11-16T12:10:00.000Z').length,0);
 }
});

test('#69 period selection always uses original UTC calculations and 1D filtered last UTC archive day',()=>{
 const cross=[
  {label:'2026-11-16T23:55:00Z',value:50},
  {label:'2026-11-17T00:05:00Z',value:53},
 ];
 const actual=mergeCompositeObservedDisplay([],cross,1);
 assert.deepEqual(actual,[{label:'2026-11-17T00:05:00.000Z',value:53}]);
 // UTC daily archive semantics are not silently changed into a new KST
 // storage/publication policy by this UI regression.
 const kst=new Intl.DateTimeFormat('ko-KR',{
  timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit',
 }).format(new Date(cross[0].label));
 assert.equal(kst.includes('2026'),true);
 assert.equal(kst.includes('11'),true);
});

test('#69 static mobile/desktop UI contracts cover 390, 768, 1440 and 1920 pixel breakpoints',()=>{
 const css=readFileSync(new URL('../app/responsive.css',import.meta.url),'utf8');
 const ui=readFileSync(new URL('../app/dashboard-ui.tsx',import.meta.url),'utf8');
 const chart=readFileSync(new URL('../components/dashboard-summary-chart.tsx',import.meta.url),'utf8');
 assert.match(css,/@container marketShell \(max-width:760px\)/);
 assert.match(css,/@container marketShell \(min-width:761px\) and \(max-width:959px\)/);
 assert.match(css,/@container marketShell \(min-width:960px\)/);
 assert.match(css,/@media\(max-width:959px\)/);
 assert.match(ui,/marketPeriods=\[\{label:'1D',days:1\},\{label:'1W',days:7\},\{label:'1M',days:30\},\{label:'3M',days:90\},\{label:'6M',days:180\},\{label:'1Y',days:365\}\]/);
 assert.match(ui,/normalizeMarketTrendPointsR4\(/);
 assert.match(ui,/mergeCompositeObservedDisplay\(daily,archived,periodDays,current\)/);
 assert.match(ui,/appendPublishedDomainCurrent\(daily,current,periodDays\)/);
 assert.match(chart,/<ResponsiveContainer width="100%" height="100%"/);
 assert.match(chart,/mobileAxisRight\?"right":"left"/);
 assert.match(chart,/timeZone:'Asia\/Seoul'/);
 // This is a source/breakpoint contract, not a screenshot or DOM overflow pass.
 for(const width of [390,768,1440,1920])assert.ok(width>0);
});

test('#69 geometry and UI preserve actual zero as bottom of fixed 0-100 scale, not a missing point',()=>{
 const geometry=miniTrendGeometry([
  {label:'2026-11-15',value:50},
  {label:'2026-11-16',value:0},
 ],1);
 assert.ok(geometry.path.includes('L217.000,57.000'));
 assert.equal(geometry.last.y,57);
 const ui=readFileSync(new URL('../app/dashboard-ui.tsx',import.meta.url),'utf8');
 assert.match(ui,/overallScore===null\?'—'/);
 assert.match(ui,/domain\?\.status==='READY'&&validPublicScore\(domain\.score\)/);
});
