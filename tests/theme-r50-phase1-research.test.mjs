import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {THEME_R50_PHASE1_RESEARCH,THEME_R50_PHASE1_RESEARCH_VERSION,findThemeR50ResearchCandidate,auditThemeR50ResearchCatalog} from '../lib/market-score/theme-r50-phase1-research.mjs';

const text=fs.readFileSync(new URL('../components/market-explorer-catalog.ts',import.meta.url),'utf8');
const portion=text.match(/export const THEME_GROUPS=\[([\s\S]*?)\] as const;/)?.[1];
assert.ok(portion,'main catalog must retain THEME_GROUPS');
const names=[...portion.matchAll(/items:\[([^\]]+)\]/g)].flatMap(x=>[...x[1].matchAll(/'([^']+)'/g)].map(y=>y[1]));

test('research scope: 30 canonical names and only 12 phase-1 candidates',()=>{
 const out=auditThemeR50ResearchCatalog(names);
 assert.equal(out.catalogThemes,30);
 assert.equal(out.researchCandidates,12);
 assert.equal(out.status,'RESEARCH_ONLY_NO_PUBLICATION');
 assert.equal(out.liveReadinessChecked,false);
 assert.equal(out.r21FiveAxisCompletedAtSnapshot,0);
});
test('prioritized candidates match approved R21 paired-ETF universe without approving ETFs',()=>{
 assert.deepEqual(THEME_R50_PHASE1_RESEARCH.map(r=>r.theme),[
  '사이버보안','AI 신약개발','원전·SMR','로봇·자동화','AI 반도체','자율주행',
  '클라우드·SaaS','바이오테크','게임·e스포츠','핀테크','방산','블록체인·디지털자산',
 ]);
 assert.deepEqual(findThemeR50ResearchCandidate('핀테크').etfs,['FINX','ARKF']);
 assert.equal(findThemeR50ResearchCandidate('양자컴퓨팅'),null);
 assert.match(THEME_R50_PHASE1_RESEARCH_VERSION,/RESEARCH/);
});
test('R22 divergence is audit ordering, not a score or approval threshold',()=>{
 const gaps=THEME_R50_PHASE1_RESEARCH.map(p=>p.maxPriceAxisGap);
 assert.deepEqual(gaps,[...gaps].sort((a,b)=>a-b));
 assert.equal(THEME_R50_PHASE1_RESEARCH[0].maxPriceAxisGap,4.21);
 assert.equal(THEME_R50_PHASE1_RESEARCH.at(-1).maxPriceAxisGap,66.96);
 for(const item of THEME_R50_PHASE1_RESEARCH){
   assert.equal(item.state,'PRICE_3_AXIS_RESEARCH_ONLY');
   assert.equal('score' in item,false);
   assert.equal('publicReady' in item,false);
 }
});
test('shared ETF exposure is explicitly auditable without changing candidate pairs',()=>{
 const out=auditThemeR50ResearchCatalog(names);
 assert.deepEqual(out.repeatedResearchEtfs,[
   {etf:'GNOM',usedBy:2},{etf:'BOTZ',usedBy:2},{etf:'ARKF',usedBy:2},
 ]);
});
test('catalog drift rejects missing, duplicate, and unknown names',()=>{
 assert.throws(()=>auditThemeR50ResearchCatalog(names.slice(1)),/CATALOG_NOT_30_UNIQUE/);
 assert.throws(()=>auditThemeR50ResearchCatalog([...names.slice(0,29),names[0]]),/CATALOG_NOT_30_UNIQUE/);
 assert.throws(()=>auditThemeR50ResearchCatalog(names.map(x=>x==='사이버보안'?'다른테마':x)),/CANDIDATE_NOT_IN_CATALOG/);
});
test('candidate inventory is immutable to prevent incidental approval/weight edits',()=>{
 assert.ok(Object.isFrozen(THEME_R50_PHASE1_RESEARCH));
 assert.ok(Object.isFrozen(THEME_R50_PHASE1_RESEARCH[0]));
 assert.ok(Object.isFrozen(THEME_R50_PHASE1_RESEARCH[0].etfs));
 assert.throws(()=>{THEME_R50_PHASE1_RESEARCH[0].etfs[0]='OTHER';},TypeError);
});
