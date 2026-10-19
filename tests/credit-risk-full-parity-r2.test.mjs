import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {creditReleaseInfo} from "../app/credit-risk/credit-release-calendar.mjs";
import {requiresCreditR2DisplayRefresh} from "../scripts/pc-writer/credit-r2-refresh.mjs";
import {enrichLiquidityDisplayRows,liquidityStoredScoreComparisons} from "../worker/projection-builders/liquidity-stored-history.mjs";
const read=path=>readFileSync(path,"utf8");
const panel=read("app/credit-risk/credit-risk-panel.tsx");
const page=read("app/credit-risk/page.tsx");
const css=read("app/credit-risk/credit-indicator-r2.css");
const favorite=read("app/credit-risk/credit-favorite-button.tsx");
const guide=read("app/beginner-risk-guide.tsx");
const notes=read("app/detail-investor-notes.tsx");
const intro=read("app/search-intent-intro.tsx");
const builder=read("worker/projection-builders/creditRisk.ts");
const writer=read("scripts/pc-writer/run-local.mjs");
const ids=["hyCmdi","igCmdi","totalCmdi","bondVolatility","nfciCredit","bond2y","bond5y","bond10y","bond30y"];
const pending=["HY OAS","IG OAS","Corporate Default Rate","CDX HY / IG","SLOOS 기업대출 기준"];
test("credit detail matches the full inflation/recession structure from hero to final reading guide",()=>{
 assert.match(intro,/if\(topic==="credit-risk"\)/);
 assert.match(intro,/미국 회사채, <span className="text-sky-300">신용 위험은\?<\/span>/);
 assert.match(panel,/className="cnn-reference-panel fg-card fg-shared-shell credit-risk-target-card"/);
 assert.match(panel,/<MarketScoreOrb[^\n]*comparisonItems=\{scoreComparisonItems\}/);
 assert.match(panel,/<MarketFearGreedChart showExtrema/);
 assert.match(panel,/source=""/);
 assert.doesNotMatch(panel,/metaDate=|내부점수|정규화 60점↑/);
 assert.match(panel,/className="inflation-explainer"/);
 assert.match(panel,/className="inflation-indicator-section credit-r2-indicators"/);
 assert.match(panel,/className="cnn-return-cta"/);
 assert.match(page,/<BeginnerRiskGuide topic="credit-risk"\/>/);
 assert.match(page,/displayTitle="미국 신용 위험 점수, 처음이라면 이렇게 보세요"/);
 assert.match(page,/<DetailInvestorNotes topic="credit-risk"\/>/);
 assert.match(notes,/topic==="credit-risk"\|\|topic==="earnings-recession"\?"beginner":"default"/);
 assert.match(notes,/신용 위험 표, 쉽게 알아보기/);
 assert.ok(page.indexOf('<BeginnerRiskGuide topic="credit-risk"/>')<page.indexOf('displayTitle="미국 신용 위험 점수, 처음이라면 이렇게 보세요"'));
 assert.ok(page.indexOf('displayTitle="미국 신용 위험 점수, 처음이라면 이렇게 보세요"')<page.indexOf('<DetailInvestorNotes topic="credit-risk"/>'));
 assert.equal((page.match(/\{title:"[^"]+\?",text:/g)||[]).length,4);
 for(const url of ["https://www.newyorkfed.org/research/policy/cmdi","https://www.chicagofed.org/research/data/nfci/current-data","https://www.federalreserve.gov/releases/h15/"])assert.ok(page.includes(url),url);
 assert.equal((panel.match(/메인 대시보드로 돌아가기/g)||[]).length,1);
});
test("nine stored indicators and five development candidates keep their original identities and ordering",()=>{
 const names=panel.match(/const order=\[([^\]]+)\] as const;/)?.[1];
 assert.ok(names);
 const actual=[...names.matchAll(/"([^"]+)"/g)].map(x=>x[1]);
 assert.deepEqual(actual,ids);
 for(const n of pending)assert.ok(panel.includes(n),n);
 assert.equal((panel.match(/dev\.map\(/g)||[]).length,2);
 assert.equal((panel.match(/order\.map\(/g)||[]).length,2);
 assert.match(favorite,/zgmini:credit:favorites:v1/);
 assert.match(favorite,/leftDevelopment!==rightDevelopment/);
 assert.doesNotMatch(favorite,/zgmini:liquidity:favorites:v1/);
});
test("ten-column table, prior values and real 1Y charts are present on both desktop and mobile",()=>{
 for(const column of ["즐겨찾기","지표","내용","기준","이전","현재","발표","판단","미니차트(1Y)"])assert.ok(panel.includes(column),column);
 assert.match(panel,/<colgroup>/);
 assert.equal((panel.match(/<col className="credit-col-/g)||[]).length,10);
 assert.match(panel,/className="credit-r2-mobile-list"/);
 assert.equal((panel.match(/points=\{row\?\.trend\}/g)||[]).length,2);
 assert.equal((panel.match(/fmtValue\(row\?\.previousValue,row\?\.unit\)/g)||[]).length,2);
 assert.equal((panel.match(/creditReleaseInfo\(id,today,row\?\.nextReleaseDate\)/g)||[]).length,2);
 assert.match(css,/min-width:1090px!important/);
 assert.match(css,/@media\(max-width:767px\)/);
 assert.match(css,/\bcredit-r2-mobile-list\{display:grid/);
 assert.match(css,/col:nth-child\(10\)\{width:4%!important/);
 assert.match(panel,/useStoredIndex<Payload>\('\/api\/credit-risk-detail'\)/);
});
test("score factors have a human explanation for all nine credit inputs",()=>{
 const start=guide.indexOf(' "credit-risk":{'),end=guide.indexOf(' "debt-risk":{',start),scope=guide.slice(start,end);
 const names=scope.match(/factorNames:\{([^}]+)\}/)?.[1],descriptions=scope.match(/factorDescriptions:\{([\s\S]*?)\n  \}/)?.[1];
 assert.ok(names&&descriptions);
 const found=s=>[...s.matchAll(/\b([a-zA-Z][a-zA-Z0-9]*):"/g)].map(x=>x[1]).sort();
 assert.deepEqual(found(names),[...ids].sort());
 assert.deepEqual(found(descriptions),[...ids].sort());
 for(const id of ids)assert.match(panel,new RegExp("\\b"+id+":\\{label:"));
 assert.match(guide,/const description=config\.factorDescriptions\?\.\[item\.id\]/);
});
test("publication calendar distinguishes expected days from explicit official dates",()=>{
 assert.deepEqual(creditReleaseInfo("hyCmdi","2026-10-19"),{cadence:"월간",next:"2026-10-28",basis:"expected",text:"10.28 · 예상"});
 assert.equal(creditReleaseInfo("igCmdi","2026-10-29").next,"2026-11-25");
 assert.equal(creditReleaseInfo("nfciCredit","2026-10-19").next,"2026-10-21");
 assert.equal(creditReleaseInfo("bond2y","2026-10-19").next,"2026-10-20");
 assert.equal(creditReleaseInfo("bond10y","2026-11-10").next,"2026-11-12");
 assert.equal(creditReleaseInfo("bond30y","2026-10-19","2026-10-22").basis,"official");
 assert.equal(creditReleaseInfo("unknown","2026-10-19").next,null);
});
test("actual history is additive, missing aggregate history stays null, not fake",()=>{
 const result=enrichLiquidityDisplayRows([
  {id:"hyCmdi",observationDate:"2026-10-15",value:0.2,score:72},
  {id:"bondVolatility",observationDate:"2026-10-15",value:null,score:64}
 ],[
  [[{observationDate:"2026-09-15",raw:{hy:0.3}},{observationDate:"2026-10-15",raw:{hy:0.2}},{observationDate:"2026-11-01",raw:{hy:4}}],r=>r.raw?.hy],
  [[],()=>null]
 ],"2026-10-19");
 assert.equal(result[0].previousValue,0.3);
 assert.equal(result[0].trend.at(-1).value,0.2);
 assert.equal(result[0].score,72);
 assert.equal(result[1].previousValue,null);
 assert.deepEqual(result[1].trend,[]);
 assert.equal(result[1].score,64);
 const compared=liquidityStoredScoreComparisons([{label:"2026-09-15",value:55},{label:"2026-10-15",value:57}],"2026-10-19",56);
 assert.deepEqual(compared,{week:null,month:null,threeMonth:null,sixMonth:null,year:null});
});
test("existing R1 four-axis weights, scores and credit method remain unchanged",()=>{
 assert.match(builder,/creditRiskDefense\(\{/);
 for(const [id,weight] of [["hyCmdi","0.35"],["igCmdi","0.35"],["totalCmdi","0.10"],["bondVolatility","0.20"]]){
  assert.match(builder,new RegExp('id:"'+id+'"[^\\n]*weight:'+weight.replace('.','\\.')));
 }
 assert.match(builder,/const score=publicDiag\?\.status==="READY"/);
 assert.match(builder,/const display=enrichLiquidityDisplayRows\(\[\.\.\.core,\.\.\.supplementals\],sources,asOf\)/);
 assert.match(builder,/core:display\.slice\(0,4\),supplementals:display\.slice\(4\),trend:displayTrend,scoreComparisons/);
 assert.doesNotMatch(builder,/\bfetch\(/);
});
test("one-time saved-input refresh only when a READY projection lacks new display fields",()=>{
 const row={id:"x",previousValue:null,previousObservationDate:null,trend:[]};
 const original={payload:{status:"READY",methodologyVersion:"CREDIT_RISK_DIAGNOSTIC_R1",core:Array.from({length:4},()=>row),supplementals:Array.from({length:5},()=>row),scoreComparisons:{week:null,month:null,threeMonth:null,sixMonth:null,year:null}}};
 assert.equal(requiresCreditR2DisplayRefresh(original),false);
 assert.equal(requiresCreditR2DisplayRefresh({payload:{...original.payload,scoreComparisons:undefined}}),true);
 assert.equal(requiresCreditR2DisplayRefresh({payload:{...original.payload,core:[...original.payload.core.slice(0,3),{id:"x"}]}}),true);
 assert.equal(requiresCreditR2DisplayRefresh({payload:{...original.payload,status:"PARTIAL"}}),false);
 assert.match(writer,/id==='creditRisk'&&requiresCreditR2DisplayRefresh\(envelope\)/);
 assert.match(writer,/await loadProjectionSource\(id,scope,\{now:checkpoint\.sourceStoredAt\}\)/);
});
