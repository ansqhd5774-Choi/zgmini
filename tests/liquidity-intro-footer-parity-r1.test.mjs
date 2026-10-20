import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const read=p=>readFileSync(p,'utf8');
const page=read('app/stagflation-risk/page.tsx'),panel=read('app/stagflation-risk/stagflation-panel.tsx'),legacy=read('app/liquidity-crisis/liquidity-crisis-panel.tsx');
test('replacement risk intro explains the new topic and the old address redirects',()=>{
 assert.match(read('app/search-intent-intro.tsx'),/미국의 고물가와 성장·고용 둔화가 겹치는 위험/);
 assert.match(page,/<SearchIntentIntro topic="stagflation-risk"\/>/);
 assert.match(read('app/liquidity-crisis/page.tsx'),/permanentRedirect\('\/stagflation-risk\/'\)/);
 for(const topic of ['inflation','recession'])assert.ok(read(`app/${topic}/page.tsx`).includes(`<SearchIntentIntro topic="${topic}"/>`));
});
test('replacement uses shared beginner cards and structured metadata rather than legacy liquidity explanations',()=>{
 assert.match(page,/<RiskDetailBeginnerLayout><StagflationPanel\/><BeginnerRiskGuide topic="stagflation-risk"\/>/);
 assert.match(page,/inflation-beginner-reading-r1\.css/);assert.match(page,/<WebPageJsonLd/);
 assert.match(page,/variant="beginner"/);assert.match(page,/displayTitle="스태그플레이션 점수, 처음이라면 이렇게 보세요"/);
 assert.doesNotMatch(page,/Repo·은행 준비금·TGA·M2/);
});
test('replacement retains a return CTA, four questions and official sources in the shared lower-page order',()=>{
 assert.ok(panel.indexOf('stagflation-axes')<panel.indexOf('className="cnn-return-cta"'));
 assert.ok(page.indexOf('<RiskDetailBeginnerLayout>')<page.indexOf('<DetailReadingGuide title='));
 assert.equal((page.match(/\{title:"[^"]+\?",text:/g)||[]).length,4);
 for(const id of ['PCEPI','INDPRO','PAYEMS'])assert.ok(page.includes('https://fred.stlouisfed.org/series/'+id));
 assert.equal((page.match(/메인 대시보드로 돌아가기/g)||[]).length,0);assert.equal((panel.match(/메인 대시보드로 돌아가기/g)||[]).length,1);
 for(const topic of ['inflation','recession'])assert.match(read(`app/${topic}/${topic}-panel.tsx`),/className="cnn-return-cta"/);
});
test('legacy liquidity input component and old saved API remain preserved separately',()=>{
 assert.match(legacy,/useStoredIndex<Payload>\('\/api\/liquidity-crisis-detail'\)/);assert.match(legacy,/const order=\["sofrIorb","obfrIorb","repoGap"/);assert.match(legacy,/const dev=\[/);assert.match(legacy,/comparisonItems=\{scoreComparisonItems\}/);
 assert.ok(read('components/market-explorer-catalog.ts').includes("href:'/economic-indicators/liquidity/'"));
});
test('new explanations distinguish observation month, reconstructed history and missing values',()=>{
 for(const phrase of ['월별 재구성','발표 당시 점수','‘—’는 0이 아니라'])assert.ok(page.includes(phrase));
 assert.match(panel,/api\/stagflation-risk-detail/);assert.match(panel,/성장 둔화가 곧 경제의 수축을 뜻하지는 않습니다/);assert.match(panel,/현재 개정치/);
});
