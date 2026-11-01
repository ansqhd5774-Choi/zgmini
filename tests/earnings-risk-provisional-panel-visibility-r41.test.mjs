import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const panel=readFileSync(new URL('../app/earnings-recession/earnings-risk-provisional-panel.tsx',import.meta.url),'utf8');
const diagnostic=readFileSync(new URL('../app/earnings-recession/earnings-risk-only-panel.tsx',import.meta.url),'utf8');

test('provisional status is visible rather than silently hidden on unavailable or inconsistent public data',()=>{
 assert.match(panel,/function ProvisionalNotice/);
 assert.match(panel,/data-testid="earnings-risk-provisional" data-state="unavailable"/);
 assert.match(panel,/관측 자료 확인 중/);
 assert.match(panel,/잠정 관측 자료를 불러오지 못했습니다/);
 assert.match(panel,/잠정 관측 자료 검증 대기/);
 assert.doesNotMatch(panel,/return null\s*;/);
});

test('valid provisional observations remain implemented but are not mounted in the confirmed R4 page',()=>{
 assert.match(panel,/points\.length>=2/);
 assert.match(panel,/color="#e2c574" dashed/);
 assert.match(panel,/payload\.score\.toFixed\(1\)/);
 assert.doesNotMatch(diagnostic,/EarningsRiskProvisionalPanel/);
 assert.match(diagnostic,/data-testid="earnings-risk-only-hero"/);
});
