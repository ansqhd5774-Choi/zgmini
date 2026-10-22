import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(p,"utf8");
const keys=["inflation","recession","stagflation-risk","credit-risk","earnings-recession","asset-bubble","debt-risk","supply-shock"];
test("all eight public risk pages provide search titles, canonical, robots, OpenGraph and social descriptions",()=>{
 for(const key of keys){
  const s=read("app/"+key+"/page.tsx");
  assert.match(s,/const title="[^"]+";/);
  assert.match(s,/const description="[^"]+";/);
  assert.ok(s.includes('const url="https://zgmini.kr/'+key+'/";'));
  for(const field of ["alternates:{canonical:url}","robots:{index:true,follow:true}","openGraph:{title,description,url","twitter:{card:\"summary_large_image\",title,description"])assert.ok(s.includes(field),key+" "+field);
  assert.ok(s.includes('<SearchIntentIntro topic="'+key+'"/>'),key+" intro");
 }
});
test("debt meta description and visible introduction do not promise absent score history",()=>{
 const page=read("app/debt-risk/page.tsx"),intro=read("app/search-intent-intro.tsx");
 assert.match(page,/과거 완성 점수 이력은 저장된 경우에만 차트로 표시합니다/);
 assert.doesNotMatch(page,/부채위험 안전점수와 기간별 흐름을 함께 제공합니다/);
 assert.match(intro,/부채가 경기와 금융시장에 주는 위험을 현재 점수, 구성지표와 관측일로 확인하세요/);
 assert.doesNotMatch(intro,/부채가 경기와 금융시장에 주는 위험을 현재 점수와 추이로 확인하세요/);
 const projection=read("worker/projection-builders/debtRisk.ts");
 assert.ok(projection.includes("trend:[]"),"metadata caveat must remain truthful for the current published projection");
});
test("sitemap lastmod reflects the verified Oct 20 KST content changes without falsifying untouched routes",()=>{
 const sitemap=read("public/sitemap.xml");
 assert.equal((sitemap.match(/<url>/g)||[]).length,34);
 for(const key of keys){
  const expected=key==="stagflation-risk"?"2026-10-21":["inflation","recession"].includes(key)?"2026-10-18":"2026-10-20";
  assert.ok(sitemap.includes("<loc>https://zgmini.kr/"+key+"/</loc><lastmod>"+expected+"</lastmod>"),key);
 }
 const robots=read("public/robots.txt");
 assert.ok(robots.includes("Sitemap: https://zgmini.kr/sitemap.xml"));
});
test("structured WebPage/Breadcrumb schema and SEO live health monitor retain all risk routes",()=>{
 const jsonLd=read("app/seo-jsonld.tsx"), notes=read("app/detail-investor-notes.tsx"),health=read("scripts/seo-production-health.mjs");
 assert.match(jsonLd,/export function WebPageJsonLd/);
 assert.match(jsonLd,/export function BreadcrumbJsonLd/);
 assert.match(notes,/<WebPageJsonLd/);
 for(const key of keys)assert.ok(health.includes("/"+key+"/"),key+" runtime monitor");
});
