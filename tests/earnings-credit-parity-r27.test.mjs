import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const read=path=>readFileSync(path,'utf8');
const earnings=read('app/earnings-recession/earnings-recession-panel.tsx');
const credit=read('app/credit-risk/credit-risk-panel.tsx');
const css=read('app/earnings-recession/earnings-indicator-r2.css');
const creditCss=read('app/credit-risk/credit-indicator-r2.css');
test('R27 matches credit table 10-column order, including dev rows and accessible original values',()=>{
 const e=earnings.match(/<thead><tr>(.*?)<\/tr><\/thead>/s)?.[1];
 const c=credit.match(/<thead><tr>(.*?)<\/tr><\/thead>/s)?.[1];
 assert.ok(e&&c);
 const headers=x=>[...x.matchAll(/<th>(.*?)<\/th>/g)].map(y=>y[1]).filter(y=>!y.includes('<'));
 assert.deepEqual(headers(e),['지표','내용','기준','이전','현재','발표','판단','미니차트(1Y)']);
 assert.deepEqual(headers(e),headers(c));
 assert.match(e,/EarningsFavoriteHeaderIcon/);
 assert.match(e,/도움말/);
 assert.equal((earnings.match(/<col className="earnings-col-/g)||[]).length,10);
 assert.equal((credit.match(/<col className="credit-col-/g)||[]).length,10);
 assert.equal((earnings.match(/activeOrder\.map\(id=>/g)||[]).length,2);
 assert.doesNotMatch(earnings,/E1-R5":"E1-R4"\} 저장 지표/);
 assert.match(earnings,/dateLabel\(r\?\.observationDate\)/);
 assert.match(earnings,/priorFmt\(r\)/);
 assert.match(earnings,/sourceHistory1Y/);
 assert.match(earnings,/hasIndicatorHistory\(r\)\?r\?\.sourceHistory1Y:undefined/);
 assert.match(earnings,/r\?\.nextReleaseDate/);
});
test('R27 has exactly the same column proportions as credit risk and retains 390px card layout',()=>{
 const e=[...css.matchAll(/\.earnings-r2-indicators \.earnings-r2-table col:nth-child\(\d+\)\{width:(\d+)%!important\}/g)].map(m=>Number(m[1]));
 const c=[...creditCss.matchAll(/\.credit-r2-indicators \.credit-indicator-table-r2 col:nth-child\(\d+\)\{width:(\d+)%!important\}/g)].map(m=>Number(m[1]));
 assert.deepEqual(e,c);assert.equal(e.reduce((a,b)=>a+b,0),100);
 assert.match(css,/\.earnings-r2-mobile-metrics\{grid-template-columns:repeat\(3,minmax\(0,1fr\)\)\}/);
 assert.match(earnings,/earnings-r2-mobile-spark/);
 assert.doesNotMatch(earnings,/fakeMiniTrend|synthesizedPrior/);
});

test('R45 aligns earnings table with inflation while keeping all 13 source-backed histories untouched',()=>{
 assert.doesNotMatch(earnings,/earnings-r2-data-caption/);
 assert.match(earnings,/<ContentHelp label="실적 지표 저장 자료 안내">/);
 assert.match(earnings,/분석 모집단 \{stored\.universeCount\.toLocaleString/);
 assert.match(earnings,/유효 기업 \{stored\.issuerCount\.toLocaleString/);
 assert.doesNotMatch(css,/earnings-r2-data-caption/);
 assert.doesNotMatch(earnings,/1년 원자료 추이/);
 assert.match(earnings,/S6·S11은 원자료 관측기간, 나머지는 저장 자료로 재구성한 평가 시점 기준/);
 assert.match(earnings,/earningsKstToday\(\)/);
 assert.match(earnings,/earningsReleaseInfo\(r,id,today\)/);
 assert.match(earnings,/const date=\(id==="S6"\|\|id==="S11"\)\?r\?\.nextReleaseDate:null/);
 assert.match(earnings,/일정 미정/);
 assert.match(earnings,/일정 재확인/);
 assert.match(earnings,/release-\$\{release\.urgency\}/);
 assert.match(css,/\.earnings-r2-indicators \.earnings-r2-table td\.earnings-r2-release\.release-imminent small/);
 assert.equal((earnings.match(/earningsReleaseInfo\(r,id,today\)/g)||[]).length,2);
 assert.equal((earnings.match(/points=\{hasIndicatorHistory\(r\)\?r\?\.sourceHistory1Y:undefined\}/g)||[]).length,2);
 assert.deepEqual((earnings.match(/<th>미니차트\(1Y\)<\/th>/g)||[]).length,1);
});

test('R45 renders countdown only for verified stored S6/S11 dates, including past and absent dates',()=>{
 const from=earnings.indexOf('function earningsReleaseInfo(');
 const to=earnings.indexOf('function HelpTip(',from);
 assert.ok(from>=0&&to>from);
 const code=ts.transpileModule(earnings.slice(from,to)+'\nexports.earningsReleaseInfo=earningsReleaseInfo;',{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},
 }).outputText;
 const m={exports:{}};
 new Function('exports',code)(m.exports);
 const release=m.exports.earningsReleaseInfo;
 assert.deepEqual(release({nextReleaseDate:'2026-11-25'},'S6','2026-10-20'),{
  cadence:'분기',label:'11.25 · D-36',urgency:'distant',
 });
 assert.deepEqual(release({nextReleaseDate:'2026-10-21'},'S11','2026-10-20'),{
  cadence:'분기',label:'10.21 · D-1',urgency:'imminent',
 });
 assert.equal(release({nextReleaseDate:'2026-10-19'},'S6','2026-10-20').label,'10.19 · 일정 재확인');
 for(const date of [null,'2026-02-30','not-a-date']){
  assert.deepEqual(release({nextReleaseDate:date},'S11','2026-10-20'),{cadence:'—',label:'일정 미정',urgency:'unknown'});
 }
 assert.deepEqual(release({nextReleaseDate:'2026-11-25'},'S1','2026-10-20'),{cadence:'—',label:'일정 미정',urgency:'unknown'});
});
