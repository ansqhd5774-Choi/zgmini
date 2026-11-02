import test from 'node:test';
import assert from 'node:assert/strict';
import {completedR10BreadthQuarterScores} from '../scripts/pc-writer/build-asset-r10-release.mjs';
import {isMarketSession} from '../lib/market-score/breadth-b1-r3-calendar.mjs';

const lastSession=month=>{
 const [year,number]=month.split('-').map(Number);
 const date=new Date(Date.UTC(year,number,0));
 while(!isMarketSession(date.toISOString().slice(0,10)))date.setUTCDate(date.getUTCDate()-1);
 return date.toISOString().slice(0,10);
};

function history(months){
 const qualityRows=[],breadthRows=[];
 for(const [month,score,observations=300] of months){
  const date=lastSession(month);
  qualityRows.push({observationDate:date,coverage:1,participation:.75});
  breadthRows.push({observationDate:date,rankObservations:observations,researchSafetyScore:score});
 }
 return {qualityRows,breadthRows};
}

test('R10 B preserves 2025-Q2/Q3 null and validates three finished month-ends before Q4/Q1/Q2',()=>{
 const months=[
  ['2025-04',90,200],['2025-05',90,220],['2025-06',90,230],
  ['2025-07',90,240],['2025-08',90,250],['2025-09',90,264],
  ['2025-10',80],['2025-11',82],['2025-12',84],
  ['2026-01',75],['2026-02',77],['2026-03',79],
  ['2026-04',70],['2026-05',73],['2026-06',76],
 ];
 const scores=completedR10BreadthQuarterScores({...history(months),asOfDate:'2026-11-01'});
 assert.equal(scores.has('2025-Q2'),false);
 assert.equal(scores.has('2025-Q3'),false);
 assert.equal(scores.get('2025-Q4'),82);
 assert.equal(scores.get('2026-Q1'),77);
 assert.equal(scores.get('2026-Q2'),73);
});

test('first December score cannot masquerade as December month-end or publish 2026-Q4 early',()=>{
 const base=history([['2026-10',80],['2026-11',82]]);
 const decemberFirst={observationDate:'2026-12-01',rankObservations:320,researchSafetyScore:84};
 const qualityFirst={observationDate:'2026-12-01',coverage:1,participation:.8};
 const sample={breadthRows:[...base.breadthRows,decemberFirst],qualityRows:[...base.qualityRows,qualityFirst]};
 assert.equal(completedR10BreadthQuarterScores({...sample,asOfDate:'2026-12-02'}).has('2026-Q4'),false);
 assert.equal(completedR10BreadthQuarterScores({...sample,asOfDate:'2027-01-01'}).has('2026-Q4'),false);
 const decemberEnd=lastSession('2026-12');
 const complete={breadthRows:[...sample.breadthRows,{observationDate:decemberEnd,rankObservations:330,researchSafetyScore:86}],qualityRows:[...sample.qualityRows,{observationDate:decemberEnd,coverage:1,participation:.82}]};
 assert.equal(completedR10BreadthQuarterScores({...complete,asOfDate:'2026-12-31'}).has('2026-Q4'),false);
 assert.equal(completedR10BreadthQuarterScores({...complete,asOfDate:'2027-01-01'}).get('2026-Q4'),(80+82+86)/3);
});

test('R10 B last valid scored day is date-based, not input order, and respects quality 98% gate',()=>{
 const base=history([['2026-07',80],['2026-08',82],['2026-09',84]]);
 const extra={observationDate:'2026-09-10',rankObservations:280,researchSafetyScore:5};
 const valid={breadthRows:[...base.breadthRows,extra],qualityRows:[...base.qualityRows,{observationDate:extra.observationDate,coverage:1,participation:.8}]};
 assert.equal(completedR10BreadthQuarterScores({...valid,asOfDate:'2026-11-01'}).get('2026-Q3'),82);
 valid.qualityRows[2].coverage=.97;
 assert.equal(completedR10BreadthQuarterScores({...valid,asOfDate:'2026-11-01'}).get('2026-Q3'),(80+82+5)/3);
 valid.qualityRows[3].coverage=.97;
 assert.equal(completedR10BreadthQuarterScores({...valid,asOfDate:'2026-11-01'}).has('2026-Q3'),false);
});

test('R10 B never creates a quarter from missing final-month PIT verification',()=>{
 const base=history([['2026-07',80],['2026-08',82],['2026-09',84]]);
 base.qualityRows[2].observationDate='2026-09-03';
 base.breadthRows[2].observationDate='2026-09-03';
 assert.equal(completedR10BreadthQuarterScores({...base,asOfDate:'2026-10-01'}).has('2026-Q3'),false);
});
