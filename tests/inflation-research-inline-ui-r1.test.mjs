import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const file=fs.readFileSync(path.resolve('app/economic-indicators/economic-detail-panel.tsx'),'utf8');

test('inflation research 19 displayed before original four IN THE SAME table and mobile list',()=>{
 assert.match(file,/displayObservations=id==="inflation"\?\[\.\.\.researchRows,\.\.\.observations\]:observations/);
 assert.equal((file.match(/displayObservations\.map\(/g)||[]).length,2);
 assert.match(file,/수집 원자료 19개/);
 assert.match(file,/기존 평가점수/);
 assert.match(file,/경제|물가 관련 지표/);
 assert.doesNotMatch(file,/<InflationResearchInputs\s*\/>/);
});
test('calculation and scoring logic uses original stored rows only',()=>{
 assert.match(file,/const scored=storedObservations\.filter/);
 assert.match(file,/const observations=id==="employment"\?employmentListRows\(storedObservations\):storedObservations/);
 assert.match(file,/researchRows=id==="inflation"/);
 assert.match(file,/id==="inflation"\&\&i<researchRows\.length/);
});
test('month-resolution source does not gain fabricated daily observation date',()=>{
 assert.match(file,/^const dateLabel=.*\d\{4\}.*월/m);
 const graph=fs.readFileSync(path.resolve('app/inflation/inflation-mini-chart.tsx'),'utf8');
 assert.match(graph,/point\.date\.length===7\?point\.date\+"-01":point\.date/);
});
