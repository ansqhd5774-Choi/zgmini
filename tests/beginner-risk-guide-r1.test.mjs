import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(path,'utf8');
const guide=read('app/beginner-risk-guide.tsx');
const topics=[
 ['inflation','app/inflation/page.tsx','/api/inflation-detail'],
 ['recession','app/recession/page.tsx','/api/recession-detail'],
 ['liquidity-crisis','app/liquidity-crisis/page.tsx','/api/liquidity-crisis-detail'],
 ['credit-risk','app/credit-risk/page.tsx','/api/credit-risk-detail'],
 ['debt-risk','app/debt-risk/page.tsx','/api/debt-risk-detail'],
 ['asset-bubble','app/asset-bubble/page.tsx','/api/asset-bubble-detail'],
 ['supply-shock','app/supply-shock/page.tsx','/api/supply-shock-detail'],
 ['earnings-recession','app/earnings-recession/page.tsx','/api/earnings-recession-detail'],
];

test('beginner guide covers all eight approved risk detail pages',()=>{
 for(const [topic,page,endpoint] of topics){
  const source=read(page);
  assert.ok(source.includes('BeginnerRiskGuide'));
  assert.ok(source.includes(`topic="${topic}"`));
  assert.ok(guide.includes(endpoint));
 }
});

test('beginner guide is a read-only interpretation layer',()=>{
 assert.ok(guide.includes('점수·가중치·판정을 새로 계산하지 않고'));
 assert.ok(guide.includes('fetch(config.endpoint,{cache:"no-store"'));
 assert.ok(!guide.includes('startStoredRefresh'));
 assert.ok(!guide.includes('ollama'));
 assert.ok(!guide.includes('/api/generate'));
});

test('beginner guide keeps public explanations free of model weights',()=>{
 assert.ok(!guide.includes('가중치 35%'));
 assert.ok(!guide.includes('가중치 25%'));
 assert.ok(!guide.includes('가중치 15%'));
 assert.ok(!guide.includes('가중치 10%'));
 assert.ok(guide.includes('factorIds:["G","E","O","P","I"]'));
});

test('beginner guide explains score direction and stock-market caveat',()=>{
 assert.ok(guide.includes('높을수록'));
 assert.ok(guide.includes('낮을수록'));
 assert.ok(guide.includes('이 지표 하나만으로 주가 방향을 확정하지 않습니다.'));
 assert.ok(guide.includes('왜 {score===null?"이 점수":score.toFixed(1)+"점"}인가요?'));
});

test('earnings beginner guide uses only the independent four-factor risk contract and headline score',()=>{
 assert.match(guide,/factorIds:\["epsGrowth","margin","revenueGrowth","earningsGrowthBreadth"\]/);
 assert.match(guide,/payload\?\.riskFactorsMethodologyVersion===payload\?\.methodologyVersion/);
 assert.match(guide,/payload\?\.riskFactors\?\?\[\]/);
 assert.doesNotMatch(guide,/earningsStoredScore|payload\?\.storedE1\?\.indicators/);
 assert.match(guide,/침체 방어력이 높은 지표/);
 assert.match(guide,/상대적으로 취약한 진단 지표/);
 assert.match(guide,/const earningsRelativeBottom=useMemo/);
 assert.match(guide,/const displayedLower=topic==="earnings-recession"\?earningsRelativeBottom:negative/);
 assert.match(guide,/const negative=useMemo\(\(\)=>factors\.filter\(x=>x\.score<45\)/);
 assert.match(guide,/<span>이 점수는 어떻게 계산하나요\?<\/span>/);
 assert.match(guide,/aria-label="이 점수는 어떻게 계산하나요\? 접기"/);
 assert.match(guide,/왜 \{score===null\?"이 점수":score\.toFixed\(1\)\+"점"\}인가요/);
 assert.match(guide,/8대 위험 지표 전용 4개 진단 점수입니다/);
});

test('earnings guide has short, verified factor descriptions for all 13 E1-R5 indicators while leaving other topics unchanged',()=>{
 const start=guide.indexOf('"earnings-recession":{');
 const end=guide.indexOf('};\n\ntype MethodologyExplanation',start);
 const earnings=guide.slice(start,end);
 assert.match(earnings,/factorDescriptions:\{/);
 for(let i=1;i<=13;i++)assert.ok(earnings.includes('S'+i+':"'),'S'+i);
 assert.match(guide,/function FactorListItem/);
});
