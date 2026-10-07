// Integration checks: start the compiled local renderer on port 8798 first.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const base=process.env.ZGMINI_LOCAL_RENDER_URL;
const renderTest=(name,fn)=>test(name,{skip:!base},fn);
const routes=['/guides/fear-greed-buying/','/guides/cpi-pce-release/','/guides/fomc/'];
const html=async route=>{const r=await fetch(base+route);assert.equal(r.status,200);return (await r.text()).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');};
renderTest('new routes have visible answers, one H1, canonical metadata and sitemap entries',async()=>{
 const sitemap=readFileSync('public/sitemap.xml','utf8');
 for(const route of routes){const page=await html(route);assert.equal((page.match(/<h1\b/g)||[]).length,1);assert.ok(page.includes(`href="https://zgmini.kr${route}"`));assert.ok(page.includes('name="description"'));assert.ok(sitemap.includes(`https://zgmini.kr${route}`));assert.ok(page.includes('내용 확인일 2026-10-07'));}
});
renderTest('official snapshot has Korean times, known values and missing consensus distinguished',async()=>{
 const cpi=await html(routes[1]);assert.match(cpi,/10\. 14\. 21:30/);assert.match(cpi,/10\. 29\. 21:30/);assert.match(cpi,/실시간 자동 갱신 자료가 아니며/);assert.match(cpi,/2026년 8월분 공식 발표값/);assert.match(cpi,/미제공/);assert.match(cpi,/>0\.4</);
 const fomc=await html(routes[2]);assert.match(fomc,/10\. 29\. 03:00/);assert.match(fomc,/10\. 29\. 03:30/);assert.match(fomc,/3\.75~4\.00%/);assert.match(fomc,/금리 인하 확률을 제공하지 않습니다/);
});
renderTest('detail pages link to relevant guides and guides link back to existing details',async()=>{
 for(const [route,target] of [['/fear-greed/usa/',routes[0]],['/fear-greed/korea/',routes[0]],['/inflation/',routes[1]],['/recession/',routes[2]]]) assert.ok((await html(route)).includes(`href="${target}"`),route);
 assert.ok((await html(routes[1])).includes('href="/inflation/"'));
 assert.ok((await html(routes[0])).includes('href="/fear-greed/usa/"'));
});
