import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=path=>readFileSync(path,"utf8");
const rails=read("components/dashboard-side-rails.tsx");
const css=read("components/dashboard-side-rails.css");
const preview=read("components/dashboard-favorite-preview.ts");
const main=read("app/page.tsx");

test("yellow header count replaces the old paragraph and retains real saved count",()=>{
 assert.match(rails,/zg-dashboard-favorite-count/);
 assert.match(rails,/\{all\.length\}/);
 assert.doesNotMatch(rails,/저장한 지표 \{all\.length\}개/);
 assert.match(css,/background:#f5bc45;color:#071a2d/);
 assert.match(css,/min-width:29px;height:23px/);
});

test("favorites show only stored current values, judgement and observation/as-of dates",()=>{
 assert.match(rails,/zg-dashboard-favorite-reading/);
 assert.match(rails,/getRiskFavoritePreview/);
 assert.match(rails,/getEconomicFavoritePreview/);
 assert.match(rails,/aria-label=\{item\.label\+" 상세 보기"\}/);
 assert.doesNotMatch(rails,/<ChevronRight/);
 assert.match(rails,/자료 미제공/);
 assert.match(preview,/row\.observationDate\?\?row\.asOfDate/);
 assert.match(preview,/row\.status!==undefined&&row\.status!=="READY"/);
 assert.match(preview,/if\(!value\)return null/);
 assert.match(preview,/if\(!value&&numeric\(row\.value\)\)/);
 assert.match(preview,/if\(!value&&assessed!==null\)/);
 assert.match(preview,/riskFactorsMethodologyVersion!==s\.methodologyVersion/);
});

test("preview reads the eight existing published GET endpoints without new writer or formula",()=>{
 for(const endpoint of ["/api/inflation-detail","/api/recession-detail","/api/liquidity-crisis-detail","/api/credit-risk-detail",
 "/api/earnings-recession-detail","/api/asset-bubble-detail","/api/debt-risk-detail","/api/supply-shock-detail"]){
  assert.ok(preview.includes('"'+endpoint+'"'),endpoint);
 }
 assert.match(rails,/cache:"no-store",signal:controller\.signal/);
 assert.match(rails,/RISK_FAVORITE_SOURCES\.filter\(source=>saved\.some/);
 assert.match(rails,/if\(groups\.length===0\)return/);
 assert.doesNotMatch(rails,/method:"POST"|method:"PUT"|method:"DELETE"|publish|calculateScore/);
});

test("account favorites are explicitly labelled as sample scores",()=>{
 assert.match(main,/exampleScore:item\.score/);
 assert.match(rails,/예시 "\+example\.toFixed\(1\)\+"점"/);
 assert.match(rails,/예시 데이터/);
});
