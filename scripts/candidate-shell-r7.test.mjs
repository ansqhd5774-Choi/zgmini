import test from 'node:test';import assert from 'node:assert/strict';
import {candidateWorker} from '../worker/candidate-guard.mjs';
import {shellRoutes,staticShell} from '../worker/candidate-shell-r7.mjs';
test('all25 shell GET/HEAD/RSC bypass framework with exact MIME; identity not forwarded',async()=>{
 assert.equal(shellRoutes.length,25);
 assert.ok(shellRoutes.includes('/sector-fear-greed/'));
 assert.ok(shellRoutes.includes('/stagflation-risk/'));
 assert.ok(!shellRoutes.includes('/liquidity-crisis/'));
 let ssr=0,assets=0;const env={ASSETS:{async fetch(req){assets++;assert.equal(req.headers.get('authorization'),null);assert.match(new URL(req.url).pathname,/^\/__candidate_shells\//);return new Response(req.method==='HEAD'?null:'fixture',{status:200});}}};
 const worker=candidateWorker({async fetch(req,e){const shell=await staticShell(req,e);if(shell)return shell;ssr++;return new Response('framework');}});
 for(const route of shellRoutes)for(const method of ['GET','HEAD'])for(const rsc of [false,true]){
  const r=await worker.fetch(new Request('https://candidate.workers.dev'+route,{method,headers:{authorization:'fixture',...(rsc?{RSC:'1'}:{})}}),env,{});
  assert.equal(r.status,200);assert.match(r.headers.get('content-type'),rsc?/text\/x-component/:/text\/html/);assert.equal(r.headers.get('x-zgmini-ssr'),'bypassed');if(method==='HEAD')assert.equal(await r.text(),'');
 }assert.equal(assets,100);assert.equal(ssr,0);
 for(const method of ['POST','PUT','PATCH','DELETE'])assert.equal((await worker.fetch(new Request('https://candidate.workers.dev/',{method}),env,{})).status,403);
 assert.equal(ssr,0);assert.equal(assets,100);
});

test('legacy liquidity risk permanently redirects before asset rendering, preserving query and the separate liquidity domain',async()=>{
 for(const path of ['/liquidity-crisis','/liquidity-crisis/']){
  const response=await staticShell(new Request('https://zgmini.kr'+path+'?from=old'),{});
  assert.equal(response.status,308);
  assert.equal(response.headers.get('location'),'https://zgmini.kr/stagflation-risk/?from=old');
 }
 assert.ok(shellRoutes.includes('/economic-indicators/liquidity/'));
});
test('missing shell fails closed without SSR; API outside allowlist',async()=>{
 assert.equal((await staticShell(new Request('https://candidate.workers.dev/'),{ASSETS:{fetch:async()=>new Response('',{status:404})}})).status,503);
 assert.equal(await staticShell(new Request('https://candidate.workers.dev/api/market-score'),{}),null);
 assert.equal((await staticShell(new Request('https://candidate.workers.dev/inflation'),{})).status,308);
});
