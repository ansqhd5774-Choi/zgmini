import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ECONOMIC_DETAIL_CATALOG} from '../lib/economic-detail-catalog.ts';
import {DASHBOARD_INVESTOR_SEARCH,ECONOMIC_INVESTOR_SEARCH,RISK_INVESTOR_SEARCH,SECTOR_INVESTOR_SEARCH,THEME_INVESTOR_SEARCH,ECONOMICHUB_INVESTOR_SEARCH,RISKHUB_INVESTOR_SEARCH} from '../lib/investor-search-content.ts';
const read=f=>readFileSync(f,'utf8');
const registry=JSON.parse(read('config/investor-search-queries-r3.json'));
const routes=new Set([...read('public/sitemap.xml').matchAll(/<loc>https:\/\/zgmini\.kr([^<]+)<\/loc>/g)].map(m=>m[1]));

test('investor search plan covers existing information routes and distinguishes editorial examples from measured demand',()=>{
 assert.equal(registry.pages.length,30);
 assert.equal(new Set(registry.pages.map(p=>p.path)).size,30);
 assert.match(registry.basis,/검색량·순위 측정값이 아님/);
 for(const p of registry.pages){assert.ok(routes.has(p.path),p.path);assert.ok(p.queries.length>0,p.path);assert.equal(new Set(p.queries).size,p.queries.length,p.path);}
});
test('twelve economic routes and their schema share reader-facing search titles',()=>{
 for(const detail of ECONOMIC_DETAIL_CATALOG){
  assert.ok(detail.searchTitle,detail.id);
  assert.ok(ECONOMIC_INVESTOR_SEARCH[detail.id],detail.id);
  assert.ok(read(`app/economic-indicators/${detail.slug}/page.tsx`).includes('const title=`${detail.searchTitle} - ZGmini`;'),detail.slug);
 }
 assert.ok(read('app/economic-indicators/economic-detail-page.tsx').includes('const title=detail.searchTitle+" - ZGmini";'));
});
test('investor explanations and links remain visible, specific and restricted to existing public pages',()=>{
 const groups=[DASHBOARD_INVESTOR_SEARCH,...Object.values(ECONOMIC_INVESTOR_SEARCH),...Object.values(RISK_INVESTOR_SEARCH),SECTOR_INVESTOR_SEARCH,THEME_INVESTOR_SEARCH,ECONOMICHUB_INVESTOR_SEARCH,RISKHUB_INVESTOR_SEARCH];
 for(const group of groups){
  assert.ok(group.heading&&group.items.length&&group.links.length);
  for(const item of group.items){assert.ok(item.question&&item.answer);assert.doesNotMatch(item.answer,/수익을 보장합니다|저점을 확정합니다|실시간 시세를 제공합니다/);}
  for(const link of group.links)assert.ok(routes.has(link.href),link.href);
 }
 const component=read('components/investor-search-guide.tsx');
 assert.match(component,/<h2/);assert.match(component,/<h3/);assert.match(component,/<p/);assert.match(component,/<a/);
 assert.doesNotMatch(component,/sr-only|display:\s*none|aria-hidden|keywords\s*:/);
});
