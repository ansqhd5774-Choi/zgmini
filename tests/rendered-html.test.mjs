import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import {readdir,readFile} from "node:fs/promises";
import {createMiniflare, MFResponse} from "./miniflare-harness.mjs";

test("renders ZGmini metadata in the Workers runtime", async () => {
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
  modules.push({type:"ESModule", path:path.join(serverRoot,"wrapper.js"), contents:`import worker from "./index.js"; export default { fetch(request, env, ctx) { const headers = new Headers(request.headers); headers.set("host", "zgmini.kr"); return worker.fetch(new Request(request, {headers}), env, ctx); } };`});
  modules.sort((a,b)=>a.path.endsWith("wrapper.js")?-1:b.path.endsWith("wrapper.js")?1:0);
  let outboundCalls=0;
  const mf=createMiniflare({rootPath:process.cwd(),modulesRoot:serverRoot,modules,compatibilityDate:"2026-05-15",compatibilityFlags:["nodejs_compat"],outboundService:()=>{outboundCalls++;throw new Error("External requests are forbidden in the HTML test")},serviceBindings:{ASSETS:()=>new MFResponse("Not found",{status:404})}});
  try {
    const response=await mf.dispatchFetch("http://localhost/",{headers:{accept:"text/html"},redirect:"manual"});
    assert.equal(response.status,200);
    assert.match(response.headers.get("content-type")??"",/^text\/html\b/i);
    const html=await response.text();
    assert.ok(html.includes('data-testid="korea-funds"'));
    const head=html.match(/<head>([\s\S]*?)<\/head>/i)?.[1]??"";
    assert.ok(head.includes("<title>ZGmini | 미국·한국 공포탐욕지수와 경제지표</title>"));
    assert.equal((head.match(/rel="canonical"/g)??[]).length,1);
    assert.ok(/<link(?=[^>]*rel="canonical")(?=[^>]*href="https:\/\/zgmini\.kr\/")[^>]*>/i.test(head));
    assert.ok(/<meta(?=[^>]*name="robots")(?=[^>]*content="index, follow")[^>]*>/i.test(head));
    assert.equal(outboundCalls,0);
    for(const route of ['/fear-greed/usa','/fear-greed/korea']){
      const detail=await mf.dispatchFetch(`http://localhost${route}?ui=197`,{headers:{accept:'text/html'},redirect:'manual'});
      assert.equal(detail.status,200);
      const detailHtml=await detail.text();
      const detailHead=detailHtml.match(/<head>([\s\S]*?)<\/head>/i)?.[1]??'';
      assert.equal((detailHead.match(/rel="canonical"/g)??[]).length,1);
      assert.ok(detailHead.includes(`href="https://zgmini.kr${route}"`));
      assert.ok(!detailHead.includes('ui=197'));
    }
  } finally { await mf.dispose(); }
});
