import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read=path=>readFileSync(path,"utf8");

test("recession detail mirrors completed inflation shell and mobile layout",()=>{
 const page=read("app/recession/page.tsx");
 const panel=read("app/recession/recession-panel.tsx");
 const css=read("app/recession/recession-indicator-r2.css");
 const header=read("app/recession/recession-mobile-header.css");
 const judgement=read("app/recession/recession-mobile-judgement.css");

 assert.match(page,/aria-label="메인 대시보드로 돌아가기"/);
 assert.match(page,/import "\.\/recession-mobile-header\.css";/);
 assert.match(page,/import "\.\/recession-mobile-judgement\.css";/);
 assert.match(panel,/import "\.\/recession-indicator-r2\.css";/);
 assert.match(panel,/className="inflation-indicator-section recession-r2-indicators"/);
 assert.match(panel,/className="recession-r2-mobile-list"/);
 assert.match(panel,/className="recession-r2-mobile-card"[^>]*data-judgement=\{j\.tone\}/);
 assert.match(css,/grid-template-rows:auto 132px auto/);
 assert.match(css,/\.recession-r2-mobile-metrics\{display:grid;grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
 assert.match(header,/grid-template-columns:minmax\(0,1fr\) auto/);
 assert.match(judgement,/data-judgement="positive"[\s\S]*#77e59c/);
 assert.match(judgement,/data-judgement="negative"[\s\S]*#ff9a9a/);
 assert.match(judgement,/data-judgement="neutral"[\s\S]*#cbd5e1/);
});

test("recession SEO covers high-intent indicators without presenting score as probability",()=>{
 const page=read("app/recession/page.tsx");
 const intro=read("app/search-intent-intro.tsx");
 const panel=read("app/recession/recession-panel.tsx");

 for(const keyword of ["실업률","GDP","Sahm Rule","장단기 금리차"])assert.match(page,new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")));
 assert.match(page,/경기침체 확률이 아니/);
 assert.match(intro,/Sahm Rule[\s\S]*장단기 금리차[\s\S]*경기침체 확률이 아니/);
 assert.match(panel,/경기침체 확률 아님/);
 assert.match(page,/nber\.org\/research\/business-cycle-dating/);
 assert.match(page,/fred\.stlouisfed\.org\/release\?rid=456/);
});
