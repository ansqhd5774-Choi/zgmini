import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {marketDetailRows} from '../lib/market-score/detail-catalog.mjs';
import {projectV9PublicDomain,V9_METHOD} from '../worker/breadth-v9-public-view.mjs';

const publicRecord={
 version:1,methodologyVersion:V9_METHOD,source:'PC_LOCAL_B1_R3_STORED_TIME_LABELED_NOT_OFFICIAL_PIT_ATTESTED',
 asOfDate:'2026-10-19',observationDate:'2026-10-16',score:55.243075316,phase:'CARRY_FORWARD',
 trend:[{label:'2026-10-15',value:54},{label:'2026-10-16',value:55.243075316}],
 factors:{F1:60,F2:51,F3:56,F4:54,F5:55}
};
test('V9 public domain displays exactly five real factors on dashboard with nonblank scores',()=>{
 const domain=projectV9PublicDomain(publicRecord);
 assert.equal(domain.status,'READY');assert.equal(domain.indicators.length,5);
 const rows=marketDetailRows('breadth',domain.indicators);
 assert.deepEqual(rows.map(x=>x.label),['상승종목 비율','상승 거래대금 비율','단기 수급 흐름','중기 수급 흐름','20회 관측 수급폭']);
 assert.deepEqual(rows.map(x=>x.score),[60,51,56,54,55]);
 assert.deepEqual(rows.map(x=>x.asOfDate),Array(5).fill('2026-10-16'));
 assert.ok(rows.every(x=>x.raw===false));
});
test('legacy B1-R5 representation is untouched when no V9 projection exists',()=>{
 const ids=['breadth-41','breadth-42','breadth-43','breadth-44'];
 const legacy=ids.map((id,i)=>({id,status:'READY',score:i+40,value:i+40}));
 const rows=marketDetailRows('breadth',legacy);
 assert.deepEqual(rows.map(x=>x.label),['오른 종목 비율','상승 거래비중','5일 수급 추세','20일 수급 추세']);
 assert.deepEqual(rows.map(x=>x.score),[40,41,42,43]);
});
test('do not silently display partial invalid V9 as valid numeric factors',()=>{
 const domain=projectV9PublicDomain(publicRecord);
 const rows=marketDetailRows('breadth',domain.indicators.map((x,i)=>i===2?{...x,status:'PARTIAL',score:null}:x));
 assert.equal(rows.length,5);assert.equal(rows[2].score,null);
});
test('home arrows use V9 observation delta, not B1-R5 publication arrow state',()=>{
 const ui=readFileSync(new URL('../app/dashboard-ui.tsx',import.meta.url),'utf8');
 assert.match(ui,/const directionDelta=v9Breadth\?v9Movement:/);
 assert.match(ui,/data-arrow-active=\{v9Breadth\?false:/);
 assert.match(ui,/직전 유효 V9 관측 대비/);
 assert.match(ui,/V9는 검증된 5개 구성 지표를 사용합니다/);
});
