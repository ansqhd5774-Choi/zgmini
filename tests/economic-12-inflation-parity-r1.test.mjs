import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {ECONOMIC_DETAIL_CATALOG} from "../lib/economic-detail-catalog.ts";
import {shellRoutes} from "../worker/candidate-shell-r7.mjs";
import {SEO_RUNTIME_MARKERS} from "../scripts/seo-production-health.mjs";
const read=p=>readFileSync(p,"utf8");
test("all twelve approved stored domain IDs have distinct route and crawl contract",()=>{
 const ids=["inflation","employment","rates","credit","growth","consumption","earnings","liquidity","fundFlows","breadth","dollarFx","commodities"];
 assert.deepEqual(ECONOMIC_DETAIL_CATALOG.map(d=>d.id),ids);
 assert.equal(new Set(ECONOMIC_DETAIL_CATALOG.map(d=>d.slug)).size,12);
 for(const detail of ECONOMIC_DETAIL_CATALOG){
  const route="/economic-indicators/"+detail.slug+"/";
  const page=read("app/economic-indicators/"+detail.slug+"/page.tsx");
  assert.ok(page.includes('id="'+detail.id+'"'),route);
  assert.ok(page.includes('const url="https://zgmini.kr'+route+'"'),route);
  for(const key of ["const title=","const description=","alternates:{canonical:url}","robots:{index:true,follow:true}","openGraph:","twitter:"])assert.ok(page.includes(key),route+" "+key);
  assert.ok(shellRoutes.includes(route),route+" missing static HTML/RSC shell");
  assert.ok(SEO_RUNTIME_MARKERS.has("https://zgmini.kr"+route),route+" missing SEO monitor");
  assert.ok(read("public/sitemap.xml").includes("<loc>https://zgmini.kr"+route+"</loc><lastmod>2026-10-20</lastmod>"));
 }
});
test("twelve detail pages use saved market-score, approved inflation components, and no invented values",()=>{
 const panel=read("app/economic-indicators/economic-detail-panel.tsx"),page=read("app/economic-indicators/economic-detail-page.tsx");
 for(const marker of ["/api/market-score","MarketScoreOrb","MarketTrendFrame","MarketFearGreedChart","MarketCardHeader","InflationMiniChart","economic-reason","inflation-r2-mobile-list","inflation-indicator-table-r2","comparisonItems={comparisons}","EconomicFavoriteButton","ContentHelp"])assert.ok(panel.includes(marker),marker);
 assert.ok(panel.includes('domain?.status==="READY"&&validScore(domain.score)'));
 assert.ok(panel.includes("liquidityStoredScoreComparisons"));
 assert.ok(panel.includes("const producer=domain?.scoreComparisons"));
 for(const key of ["week","month","threeMonth","sixMonth","year"])assert.ok(panel.includes(key+":producer?."+key+"??computed."+key),key);
 assert.ok(panel.includes('"—"'));
 assert.doesNotMatch(panel,/Math\.random|fakeData|mockData|fetch\(['"]https:\/\/|axios/);
 for(const src of ["inflation-indicator-r2.css","inflation-score-comparisons-r1.css","inflation-hero-typography-r1.css","inflation-mobile-judgement.css","inflation-beginner-reading-r1.css"])assert.ok(page.includes(src));
 assert.match(page,/<WebPageJsonLd/);
});
test("dashboard and 12-card explorer navigate to actual domain-specific detail pages",()=>{
 const dashboard=read("app/dashboard-ui.tsx"),explorer=read("components/market-explorer.tsx"),catalog=read("components/market-explorer-catalog.ts");
 for(const item of ECONOMIC_DETAIL_CATALOG)assert.ok(catalog.includes("href:'/economic-indicators/"+item.slug+"/'"),item.id);
 assert.match(explorer,/href=\{card\.href\}/);
 assert.ok(dashboard.includes('href={"/economic-indicators/"+'));
 assert.equal(shellRoutes.length,25);
 const sitemap=read("public/sitemap.xml");assert.equal((sitemap.match(/<url>/g)||[]).length,31);
});
