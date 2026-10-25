import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import {readdir,readFile} from "node:fs/promises";
import {createMiniflare, MFResponse} from "./miniflare-harness.mjs";
import {inspectHtml} from "../scripts/seo-production-health.mjs";

const publicRoutes=[... (await readFile('public/sitemap.xml','utf8')).matchAll(/<loc>https:\/\/zgmini\.kr([^<]+)<\/loc>/g)].map(m=>m[1]).filter(route=>route!=='/');
const catalog=JSON.parse((await readFile('lib/economic-detail-catalog.ts','utf8')).match(/ECONOMIC_DETAIL_CATALOG=(\[[\s\S]*?\]) as const/)[1]);


function headOf(html){return html.match(/<head>([\s\S]*?)<\/head>/i)?.[1]??"";}
function hasDescription(head){return /<meta(?=[^>]*name="description")(?=[^>]*content="[^"]+")[^>]*>/i.test(head);}
function hasRobots(head){return /<meta(?=[^>]*name="robots")(?=[^>]*content="index, follow")[^>]*>/i.test(head);}
function hasTitle(head){return /<title>[^<]+<\/title>/i.test(head);}
function hasSocialTitle(head){
  return /<meta(?=[^>]*property="og:title")(?=[^>]*content="[^"]+")[^>]*>/i.test(head)
    && /<meta(?=[^>]*name="twitter:title")(?=[^>]*content="[^"]+")[^>]*>/i.test(head);
}

test("renders SEO metadata for all 34 public pages in the Workers runtime", async () => {
  const serverRoot = path.resolve("dist/server");
  const modules = [];
  async function walk(dir) {
    for (const entry of await readdir(dir, {withFileTypes:true})) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (entry.name.endsWith(".js")) modules.push({type:"ESModule", path:full, contents:await readFile(full,"utf8")});
    }
  }
  await walk(serverRoot);
  modules.push({type:"ESModule", path:path.join(serverRoot,"wrapper.js"), contents:`import worker from "./index.js"; export default { fetch(request, env, ctx) { const source = new URL(request.url); const target = new URL(source.pathname + source.search, "https://zgmini.kr"); const headers = new Headers(request.headers); headers.set("host", "zgmini.kr"); headers.set("x-forwarded-proto", "https"); return worker.fetch(new Request(target, {method:request.method,headers}), env, ctx); } };`});
  modules.sort((a,b)=>a.path.endsWith("wrapper.js")?-1:b.path.endsWith("wrapper.js")?1:0);
  let outboundCalls=0;
  const mf=createMiniflare({rootPath:process.cwd(),modulesRoot:serverRoot,modules,compatibilityDate:"2026-05-15",compatibilityFlags:["nodejs_compat"],outboundService:()=>{outboundCalls++;throw new Error("External requests are forbidden in the HTML test")},serviceBindings:{ASSETS:()=>new MFResponse("Not found",{status:404})}});
  try {
    const root=await mf.dispatchFetch("http://localhost/?seo=audit",{headers:{accept:"text/html"},redirect:"manual"});
    assert.equal(root.status,200);
    assert.match(root.headers.get("content-type")??"",/^text\/html\b/i);
    const rootHtml=await root.text();
    assert.ok(rootHtml.includes('korea-target-card'));
    assert.ok(rootHtml.includes('data-testid="investor-search-dashboard"'));
    const rootHead=headOf(rootHtml);
    assert.ok(rootHead.includes("<title>ZGmini 지그미니 | 공포탐욕지수·공탐 지수·미국 증시·경제지표</title>"));
    assert.ok(hasDescription(rootHead));
    assert.ok(hasRobots(rootHead));
    assert.ok(hasSocialTitle(rootHead));
    assert.equal((rootHead.match(/rel="canonical"/g)??[]).length,1);
    assert.ok(/<link(?=[^>]*rel="canonical")(?=[^>]*href="https:\/\/zgmini\.kr\/")[^>]*>/i.test(rootHead));
    assert.ok(!rootHead.includes('seo=audit'));

    for(const route of publicRoutes){
      const response=await mf.dispatchFetch(`http://localhost${route}?seo=audit`,{headers:{accept:'text/html'},redirect:'manual'});
      assert.equal(response.status,200,route);
      assert.match(response.headers.get('content-type')??'',/^text\/html\b/i,route);
      const html=await response.text();
      assert.deepEqual(inspectHtml(html,`https://zgmini.kr${route}`).errors,[],route+': full SEO contract');
      const head=headOf(html);
      const detail=catalog.find(entry=>route==='/economic-indicators/'+entry.slug+'/');
      if(detail){
        assert.ok(head.includes(detail.description),route+': descriptive search terms in metadata');
        assert.ok(html.slice(html.indexOf('<body')).includes(detail.description),route+': same explanation in visible body');
        assert.ok(html.includes(`data-testid="investor-search-economic-${detail.id}"`),route+': investor explanation is in generated HTML');
      }
      if(['/inflation/','/recession/','/stagflation-risk/','/credit-risk/','/earnings-recession/','/asset-bubble/','/debt-risk/','/supply-shock/','/sector-fear-greed/','/theme-fear-greed/'].includes(route))assert.ok(html.includes(`data-testid="investor-search-${route.split('/')[1]}"`),route+': visible investor explanation');
      assert.ok(hasTitle(head),`${route}: title`);
      assert.ok(hasDescription(head),`${route}: description`);
      assert.ok(hasRobots(head),`${route}: robots`);
      assert.ok(hasSocialTitle(head),`${route}: social title`);
      assert.equal((head.match(/rel="canonical"/g)??[]).length,1,`${route}: canonical count`);
      assert.ok(head.includes(`href="https://zgmini.kr${route}"`),`${route}: canonical href`);
      assert.ok(!head.includes('seo=audit'),`${route}: query leaked into metadata`);
    }
    const legacy=await mf.dispatchFetch('http://localhost/liquidity-crisis/',{redirect:'manual'});
    assert.equal(legacy.status,308);assert.ok(legacy.headers.get('location')?.endsWith('/stagflation-risk/'));
    assert.equal(outboundCalls,0);
  } finally { await mf.dispose(); }
});
