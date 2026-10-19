import test from 'node:test';
import assert from 'node:assert/strict';
import {provisionalIran19Backcast,IRAN_PROVISIONAL_ANCHOR_R1 as ANCHOR}
 from '../lib/iran-progress/provisional-19-backcast-r1.mjs';
import {iranView} from '../lib/iran-progress/view.mjs';
import {kstCalendarDate} from '../lib/iran-progress/chart-history.mjs';
import {FLOW_WEIGHTS} from '../lib/iran-progress/reference-flow-r1.mjs';
const DAY=86400000,stamp=d=>Date.parse(d+'T00:00:00Z');
const observed=[
 {date:'2026-10-12',value:47.1,delta:-2.9},
 {date:'2026-10-18',value:38.7,delta:-8.4},
];
const input=()=>({version:'IRAN_REFERENCE_FLOW_R3',classifierVersion:'IRAN_EVENT_RULES_R3_3',
 asOfDate:'2026-10-19',score:38.7,history:observed});
test('19-point anchor reconstructs all 14 calendar dates, not a seven-point chart',()=>{
 const result=provisionalIran19Backcast(input());
 assert.equal(result.score,19);assert.equal(result.rawScore,38.7);
 assert.equal(result.historyDayCount,14);assert.equal(result.history.length,14);
 assert.equal(result.history[0].date,'2026-10-06');assert.equal(result.history.at(-1).date,'2026-10-19');
 assert.equal(result.history.at(-1).value,19);
 assert.equal(result.history.find(x=>x.date==='2026-10-18').value,19);
 assert.equal(result.history.find(x=>x.date==='2026-10-17').value,27.4);
 assert.equal(result.history.find(x=>x.date==='2026-10-11').value,30.3);
 assert.equal(result.history.find(x=>x.date==='2026-10-12').value,27.4);
 assert.equal(result.history[0].phase,'EARLY_WINDOW_NO_DATED_REPORT');
 assert.equal(result.history.find(x=>x.date==='2026-10-12').phase,'R3_PUBLICATION_DATE_DELTA');
 assert.equal(result.history.at(-1).phase,'NO_NEW_RECORDED_CHANGE');
 assert.ok(result.history.every(x=>x.estimated&&!x.measured));
 assert.equal(result.probability,false);assert.equal(result.calibrated,false);
});
test('source R3 records and 50-point model baseline are not mutated or used as the visual start',()=>{
 const before=input(),snapshot=structuredClone(before);
 const result=provisionalIran19Backcast(before);
 assert.deepEqual(before,snapshot);assert.notEqual(result.history[0].value,50);
 assert.equal(result.anchorR3Score,37.9);assert.equal(result.anchorScore,19);
});
test('future source changes relative to fixed approved 2026-10-19 anchor, not frozen at 19',()=>{
 const x=input();x.asOfDate='2026-10-20';x.score=40;
 x.history=[...observed,{date:'2026-10-20',value:40,delta:1.3}];
 const result=provisionalIran19Backcast(x);
 assert.equal(result.score,20.3);
 assert.equal(result.history.at(-1).value,20.3);
 assert.equal(result.history[0].date,'2026-10-07');
});
test('wrong R3 method/classifier or missing changes must not manufacture an anchored curve',()=>{
 for(const patch of [
  {version:'IRAN_REFERENCE_FLOW_R2'},
  {classifierVersion:'IRAN_EVENT_RULES_R3_2'},
  {asOfDate:'2026-10-18'},
  {history:[]},
  {score:null},
  {history:[observed[1],observed[0]]},
  {history:[{date:'2026-10-18',value:38.7,delta:Infinity}]},
 ])assert.equal(provisionalIran19Backcast({...input(),...patch}),null);
});
const body=()=>({
 ...input(),status:'REFERENCE',baseline:50,baselineDate:'2026-09-09',
 publishedAt:stamp('2026-10-19')+2*3600000,collectionCheckedAt:stamp('2026-10-19')+3600000,
 displaySensitivity:1,historyMode:'RETROSPECTIVE_PUBLICATION_DATE',eventCount:10,
 probability:false,officialPeaceDetermination:false,
 observedDomains:['MARITIME','MILITARY'],unobservedDomains:['CEASEFIRE','DIPLOMACY','NUCLEAR'],
 saturatedDomains:[],weights:FLOW_WEIGHTS,
 domains:{DIPLOMACY:50,CEASEFIRE:50,MILITARY:16,MARITIME:20,NUCLEAR:50},
 newsCollection:{status:'UPDATED'},events:[],
});
test('validated R3_3 API score 38.7 remains raw; labelled home/detail presentation is 19',()=>{
 const raw=body(),now=stamp('2026-10-19')+3*3600000;
 const before=structuredClone(raw),view=iranView(raw,now);
 assert.equal(view.methodVersion,'R3');
 assert.equal(view.rawScore,38.7);
 assert.equal(view.score,19);
 assert.equal(view.chartHistory.length,14);
 assert.equal(view.chartHistory.at(-1).value,view.score);
 assert.equal(view.displayEstimate.version,ANCHOR.version);
 assert.equal(view.displayEstimate.historyMode,'PROVISIONAL_REVERSED_FROM_USER_ANCHOR');
 assert.match(view.message,/잠정 19점/);
 assert.deepEqual(raw,before);
});
test('invalid R3 transport input fails closed before applying 19 anchor',()=>{
 const invalid={...body(),score:79};
 const view=iranView(invalid,stamp('2026-10-19')+3*3600000);
 assert.equal(view.score,null);
});

test('V58 real 2026-10-19 R3_3 raw 37.9 / 12 events anchors at 19.0 (no stale 38.7 offset)',()=>{
 const x=input();
 x.score=37.9;
 x.history=[...observed,{date:'2026-10-19',value:37.9,delta:-0.8}];
 const before=structuredClone(x),result=provisionalIran19Backcast(x);
 assert.equal(result.anchorInWindow,true);
 assert.equal(result.score,19);
 assert.equal(result.history.length,14);
 assert.equal(result.history.at(-1).date,'2026-10-19');
 assert.equal(result.history.at(-1).value,19);
 assert.equal(result.history.at(-2).date,'2026-10-18');
 assert.equal(result.history.at(-2).value,19.8);
 assert.equal(result.history[0].date,'2026-10-06');
 assert.equal(result.history[0].phase,'EARLY_WINDOW_NO_DATED_REPORT');
 assert.deepEqual(x,before);
});
test('late same-day R3 reports do not shift approved Oct 19 anchor, subsequent dated events still move it',()=>{
 const a=input(),b=input();
 a.score=37.9;a.history=[...observed,{date:'2026-10-19',value:37.9,delta:-0.8}];
 b.asOfDate='2026-10-20';b.score=37.1;
 b.history=[...a.history,{date:'2026-10-20',value:37.1,delta:-0.8}];
 const anchored=provisionalIran19Backcast(a),updated=provisionalIran19Backcast(b);
 assert.equal(anchored.score,19);
 assert.equal(updated.score,18.2);
 assert.equal(updated.history.find(x=>x.date==='2026-10-19').value,19);
 assert.equal(updated.history.at(-1).value,18.2);
});
test('validated V58 37.9 input keeps API raw 37.9 and renders provisional 19 endpoint',()=>{
 const raw=body();
 raw.score=37.9;raw.eventCount=12;raw.domains.MILITARY=12;
 raw.history=[...observed,{date:'2026-10-19',value:37.9,delta:-0.8}];
 const before=structuredClone(raw),view=iranView(raw,stamp('2026-10-19')+3*3600000);
 assert.equal(view.rawScore,37.9);
 assert.equal(view.score,19);
 assert.equal(view.chartHistory.length,14);
 assert.equal(view.chartHistory.at(-1).value,19);
 assert.equal(view.chartHistory.at(-2).value,19.8);
 assert.equal(view.history.at(-1).value,19);
 assert.deepEqual(raw,before);
});

test('KST midnight advances only the 14-day view; UTC source and 19-point anchor remain intact',()=>{
 const source=body();
 source.score=37.9;source.eventCount=12;source.domains.MILITARY=12;
 source.history=[...observed,{date:'2026-10-19',value:37.9,delta:-0.8}];
 const original=structuredClone(source);
 const before=iranView(source,Date.parse('2026-10-19T14:59:59Z'));
 const after=iranView(source,Date.parse('2026-10-19T15:00:01Z'));
 assert.equal(kstCalendarDate(Date.parse('2026-10-19T14:59:59Z')),'2026-10-19');
 assert.equal(kstCalendarDate(Date.parse('2026-10-19T15:00:01Z')),'2026-10-20');
 assert.equal(before.chartHistory[0].date,'2026-10-06');
 assert.equal(before.chartHistory.at(-1).date,'2026-10-19');
 assert.equal(after.chartHistory[0].date,'2026-10-07');
 assert.equal(after.chartHistory.at(-1).date,'2026-10-20');
 assert.equal(after.chartHistory.at(-1).phase,'NO_NEW_RECORDED_CHANGE');
 assert.equal(after.chartHistory.at(-1).carried,true);
 assert.equal(after.chartHistory.at(-1).measured,false);
 assert.equal(after.chartHistory.at(-1).value,19);
 assert.equal(after.chartHistory.length,14);
 assert.equal(after.score,19);
 assert.equal(after.rawScore,37.9);
 assert.equal(source.asOfDate,'2026-10-19');
 assert.deepEqual(source,original);
});
test('KST rolling horizon continues applying actual R3 publication-day changes after anchor',()=>{
 const source=body();
 source.asOfDate='2026-10-20';
 source.publishedAt=Date.parse('2026-10-20T03:00:00Z');
 source.collectionCheckedAt=source.publishedAt;
 source.score=37.9;source.domains.MILITARY=12;
 source.history=[...observed,{date:'2026-10-19',value:38.7,delta:0},{date:'2026-10-20',value:37.9,delta:-0.8}];
 const original=structuredClone(source);
 const view=iranView(source,Date.parse('2026-10-20T03:01:00Z'));
 assert.equal(view.rawScore,37.9);
 assert.equal(view.score,18.2);
 assert.equal(view.chartHistory.length,14);
 assert.equal(view.chartHistory[0].date,'2026-10-07');
 assert.equal(view.chartHistory.at(-1).date,'2026-10-20');
 assert.equal(view.chartHistory.at(-1).phase,'R3_PUBLICATION_DATE_DELTA');
 assert.equal(view.chartHistory.at(-1).value,18.2);
 assert.deepEqual(source,original);
});
