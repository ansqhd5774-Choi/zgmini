import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const guide=readFileSync('app/beginner-risk-guide.tsx','utf8');
const topics=['inflation','recession','liquidity-crisis','credit-risk','debt-risk','asset-bubble','supply-shock','earnings-recession'];

test('method explanation and history are shared by all eight beginner pages',()=>{
 assert.match(guide,/const methodologyExplanations:Record<Topic,MethodologyExplanation>/);
 for(const topic of topics){
  assert.ok(guide.includes(topic+':{')||guide.includes('"'+topic+'":{'),topic);
 }
 assert.match(guide,/이 점수는 어떻게 계산하나요\?/);
 assert.match(guide,/산출식 개선 이력/);
 for(const section of ['① 사용하는 지표','② 평가 방법','③ 점수 읽는 법','④ 주식시장에서','⑤ 결측·한계']){
  assert.ok(guide.includes(section),section);
 }
});

test('displayed current methodology version comes from stored API, never a hard-coded active version',()=>{
 assert.match(guide,/reportedMethodologyVersion\(topic,payload\)/);
 assert.match(guide,/payload\?\.methodologyVersion/);
 assert.match(guide,/payload\?\.storedE1\?\.status==="READY"/);
 assert.match(guide,/currentVersion\?\?"버전 미확인"/);
 assert.match(guide,/isCandidateVersion\?" · 연구 후보"/);
 assert.match(guide,/data-testid="current-methodology-version"/);
});

test('history only displays version-matched and verified entries, preserving uncertainty',()=>{
 assert.match(guide,/verifiedImprovements:Partial<Record<Topic,VerifiedImprovement\[\]>>/);
 assert.match(guide,/item\.version===currentVersion/);
 assert.match(guide,/공개 검증된 산출식 변경 이력은 정리 중입니다/);
 assert.match(guide,/최신 버전이 항상 더 정확한 예측을 의미하지는 않습니다/);
 assert.match(guide,/2026-10-09/);
 assert.match(guide,/2026-10-15/);
 assert.match(guide,/현재 수정 자료 기반이며 발표 당시 자료로 검증한 백테스트는 아닙니다/);
});

test('methodology education does not alter scoring, storage or shared beginner copy',()=>{
 assert.match(guide,/validBeginnerCopy\(payload\?\.beginnerCopy\)/);
 assert.match(guide,/data-copy-source=\{storedCopy\?"stored":"deterministic"\}/);
 assert.doesNotMatch(guide,/fetch\(.*\/api\/.*\{method:"POST"/);
 assert.doesNotMatch(guide,/\bE1_R5_WEIGHTS\b|\bINFLATION_R2_AXES\b/);
});
