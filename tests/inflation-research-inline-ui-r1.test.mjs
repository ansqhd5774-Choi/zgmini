import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const file=fs.readFileSync(path.resolve('app/economic-indicators/economic-detail-panel.tsx'),'utf8');

test('inflation research 19 replace the legacy four in the table and mobile list',()=>{
 assert.match(file,/displayObservations=id==="inflation"\?researchRows:id==="employment"\?employmentListRows\(employmentData\?\.indicators\?\?\[\]\):observations/);
 assert.equal((file.match(/displayObservations\.map\(/g)||[]).length,2);
 assert.match(file,/수집 원자료 19개/);
 assert.doesNotMatch(file,/기존 평가점수/);
 assert.match(file,/경제|물가 관련 지표/);
 assert.doesNotMatch(file,/<InflationResearchInputs\s*\/>/);
});
test('calculation and scoring logic uses original stored rows only',()=>{
 assert.match(file,/const scored=storedObservations\.filter/);
 assert.match(file,/const observations=storedObservations/);
 assert.match(file,/useStoredIndex<EmploymentR6Display>\("\/api\/employment-r6\/observations",null,id==="employment"\)/);
 assert.doesNotMatch(file,/employmentListRows\(storedObservations\)/);
 assert.match(file,/researchRows=id==="inflation"/);
 assert.match(file,/id==="inflation"\&\&i<researchRows\.length/);
});
test('month-resolution source does not gain fabricated daily observation date',()=>{
 assert.match(file,/^const dateLabel=.*월/m);
 const graph=fs.readFileSync(path.resolve('app/inflation/inflation-mini-chart.tsx'),'utf8');
 assert.match(graph,/point\.date\.length===7\?point\.date\+"-01":point\.date/);
});

test('inflation table and mobile cards use criterion / previous / current wording and show observed dates and sources',()=>{
 assert.match(file,/id==="inflation"\?"기준":"평가 기준"/);
 assert.match(file,/id==="inflation"\?"이전":"이전 원값"/);
 assert.match(file,/id==="inflation"\?"현재":"현재 원값\/점수"/);
 assert.match(file,/observedPeriodLabel\(item,item.previousObservationDate\)/);
 assert.match(file,/isResearch&&item.sourceDisplay&&<small title=/);
 assert.equal((file.match(/isResearch&&item\.sourceDisplay&&<small title=/g)||[]).length,2);
 assert.match(file,/const scored=storedObservations\.filter/);
});

test('research judgment is independent of R2 score and colors are existing positive/negative chart tones',()=>{
 assert.equal((file.match(/item\.researchJudgement\?\?/g)||[]).length,2);
 assert.match(file,/researchObservationPeriod\(date,item.releaseCadence\)/);
 const spark=fs.readFileSync(path.resolve('app/inflation/inflation-mini-chart-r1.css'),'utf8');
 assert.match(spark,/\[data-judgement="positive"\].*inflation-mini-chart-line/);
 assert.match(spark,/\[data-judgement="negative"\].*inflation-mini-chart-line/);
});
