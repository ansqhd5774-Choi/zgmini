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


test('inflation R2 includes verified dated changes rather than an empty history',()=>{
 const timeline=guide.split(' inflation:[',2)[1]?.split('\n ],\n "supply-shock"')[0]??'';
 assert.ok(timeline,'inflation timeline must be present');
 const versions=[...timeline.matchAll(/version:"INFLATION_R2_R29_56",date:"(\d{4}-\d{2}-\d{2})"/g)];
 assert.equal(versions.length,6,'six corroborated production and supporting-data milestones');
 const dates=versions.map(m=>m[1]);
 assert.deepEqual(dates,[...dates].sort().reverse(),'newest entries are first');
 for(const text of ['R2 운영 산출식 도입','발표 당시 자료 복구 경로 보정','월간 1년 차트의 기간 보정','개별 경제지표의 1년 추이 표시','5개 기간의 점수 변화폭 제공']){
  assert.ok(timeline.includes(text),text);
 }
 assert.match(timeline,/category:"산출 방식"/);
 assert.match(timeline,/category:"저장·검증"/);
 assert.match(timeline,/category:"데이터·추이"/);
 assert.match(timeline,/category:"화면·해석"/);
 assert.match(timeline,/산출식과 가중치는 변경하지 않았습니다/);
 assert.doesNotMatch(timeline,/INFLATION_R3|SHADOW_ONLY/);
 assert.match(guide,/item\.version===currentVersion/);
});

test('methodology education does not alter scoring, storage or shared beginner copy',()=>{
 assert.match(guide,/validBeginnerCopy\(payload\?\.beginnerCopy\)/);
 assert.match(guide,/data-copy-source=\{storedCopy\?"stored":"deterministic"\}/);
 assert.doesNotMatch(guide,/fetch\(.*\/api\/.*\{method:"POST"/);
 assert.doesNotMatch(guide,/\bE1_R5_WEIGHTS\b|\bINFLATION_R2_AXES\b/);
});

test('methodology history has an accessible bottom collapse control without scrolling upward',()=>{
 const css=readFileSync('app/beginner-methodology-accordion.css','utf8');
 assert.match(guide,/ref=\{historyDetailsRef\} className="zg-method-history/);
 assert.match(guide,/<summary className="zg-method-history-summary/);
 assert.match(guide,/aria-label="산출식 개선 이력 접기"/);
 assert.match(guide,/onClick=\{\(\)=>\{if\(historyDetailsRef\.current\)historyDetailsRef\.current\.open=false;\}\}/);
 assert.match(guide,/<ChevronUp aria-hidden="true" size=\{16\}\/>/);
 assert.match(css,/\.zg-method-history::details-content/);
 assert.match(css,/\.zg-method-history\[open\]::details-content/);
 assert.match(css,/interpolate-size:allow-keywords/);
 assert.match(css,/content-visibility 420ms allow-discrete/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.doesNotMatch(guide,/scrollTo\(|scrollIntoView\(/);
});

test('calculation and history accordions share the same accessible expand/collapse UI on all eight pages',()=>{
 const css=readFileSync('app/beginner-methodology-accordion.css','utf8');
 assert.match(guide,/ref=\{calculationDetailsRef\} className="zg-method-history rounded-lg/);
 assert.match(guide,/data-testid=\{`beginner-methodology-explanation-\$\{topic\}`\}/);
 assert.equal((guide.match(/<summary className="zg-method-history-summary/g)||[]).length,2);
 assert.equal((guide.match(/<ChevronDown aria-hidden="true" className="zg-method-history-chevron"\/>/g)||[]).length,2);
 assert.equal((guide.match(/className="zg-method-history-close-row"/g)||[]).length,2);
 assert.equal((guide.match(/className="zg-method-history-close"/g)||[]).length,2);
 assert.ok(guide.includes('aria-label={topic==="earnings-recession"?"E1 저장 점수는 어떻게 계산하나요? 접기":"이 점수는 어떻게 계산하나요? 접기"}'));
 assert.match(guide,/onClick=\{\(\)=>\{if\(calculationDetailsRef\.current\)calculationDetailsRef\.current\.open=false;\}\}/);
 assert.match(guide,/aria-label="산출식 개선 이력 접기"/);
 assert.match(guide,/onClick=\{\(\)=>\{if\(historyDetailsRef\.current\)historyDetailsRef\.current\.open=false;\}\}/);
 assert.match(css,/\.zg-method-history\[open\] \.zg-method-history-chevron\{transform:rotate\(180deg\)\}/);
 assert.match(css,/\.zg-method-history-close:focus-visible/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.doesNotMatch(guide,/scrollTo\(|scrollIntoView\(/);
});

test('opening either accordion preserves the clicked header while content expands downward',()=>{
 const css=readFileSync('app/beginner-methodology-accordion.css','utf8');
 assert.equal((guide.match(/onClick=\{event=>preserveAccordionSummaryOnOpen\(event\.currentTarget\)\}/g)||[]).length,2);
 assert.match(guide,/function preserveAccordionSummaryOnOpen\(summary:HTMLElement\)/);
 assert.match(guide,/if\(!\(details instanceof HTMLDetailsElement\)\|\|details\.open\)return/);
 assert.match(guide,/const initialTop=summary\.getBoundingClientRect\(\)\.top/);
 assert.match(guide,/summary\.getBoundingClientRect\(\)\.top-initialTop/);
 assert.match(guide,/window\.scrollBy\(\{top:shift,behavior:"instant"\}\)/);
 assert.match(guide,/performance\.now\(\)-start<480/);
 for(const name of ['wheel','touchmove','keydown']){
  assert.ok(guide.includes(`window.addEventListener("${name}",stop`));
  assert.ok(guide.includes(`window.removeEventListener("${name}",stop)`));
 }
 assert.match(css,/transition:block-size 420ms/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.doesNotMatch(guide,/scrollIntoView\(|window\.scrollTo\(/);
});
