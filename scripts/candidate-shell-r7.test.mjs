import test from 'node:test';import assert from 'node:assert/strict';
import {candidateWorker} from '../worker/candidate-guard.mjs';
import {shellRoutes,staticShell} from '../worker/candidate-shell-r7.mjs';
import {omitMissingCssOnlyPreloads} from './candidate-css-only-preload-r1.mjs';
test('all26 shell GET/HEAD/RSC bypass framework with exact MIME; identity not forwarded',async()=>{
 assert.equal(shellRoutes.length,26);
 assert.ok(shellRoutes.includes('/sector-fear-greed/'));
 assert.ok(shellRoutes.includes('/stagflation-risk/'));
 assert.ok(!shellRoutes.includes('/liquidity-crisis/'));
 let ssr=0,assets=0;const env={ASSETS:{async fetch(req){assets++;assert.equal(req.headers.get('authorization'),null);assert.match(new URL(req.url).pathname,/^\/__candidate_shells\//);return new Response(req.method==='HEAD'?null:'fixture',{status:200});}}};
 const worker=candidateWorker({async fetch(req,e){const shell=await staticShell(req,e);if(shell)return shell;ssr++;return new Response('framework');}});
 for(const route of shellRoutes)for(const method of ['GET','HEAD'])for(const rsc of [false,true]){
  const r=await worker.fetch(new Request('https://candidate.workers.dev'+route,{method,headers:{authorization:'fixture',...(rsc?{RSC:'1'}:{})}}),env,{});
  assert.equal(r.status,200);assert.match(r.headers.get('content-type'),rsc?/text\/x-component/:/text\/html/);assert.equal(r.headers.get('x-zgmini-ssr'),'bypassed');if(method==='HEAD')assert.equal(await r.text(),'');
 }assert.equal(assets,104);assert.equal(ssr,0);
 for(const method of ['POST','PUT','PATCH','DELETE'])assert.equal((await worker.fetch(new Request('https://candidate.workers.dev/',{method}),env,{})).status,403);
 assert.equal(ssr,0);assert.equal(assets,104);
});

test('legacy liquidity risk permanently redirects before asset rendering, preserving query and the separate liquidity domain',async()=>{
 for(const path of ['/liquidity-crisis','/liquidity-crisis/']){
  const response=await staticShell(new Request('https://zgmini.kr'+path+'?from=old'),{});
  assert.equal(response.status,308);
  assert.equal(response.headers.get('location'),'https://zgmini.kr/stagflation-risk/?from=old');
 }
 assert.ok(shellRoutes.includes('/economic-indicators/liquidity/'));
});
test('legacy scenario query redirects permanently to independent outbreak and preserves event',async()=>{
 const cases=[
  ['https://zgmini.kr/?view=scenarios','https://zgmini.kr/outbreak/'],
  ['https://zgmini.kr/?view=scenarios&event=iran','https://zgmini.kr/outbreak/?event=iran'],
  ['https://zgmini.kr/?event=iran&view=scenarios','https://zgmini.kr/outbreak/?event=iran'],
 ];
 for(const [url,expected] of cases){
  const response=await staticShell(new Request(url),{});
  assert.equal(response.status,308);
  assert.equal(response.headers.get('location'),expected);
 }
 assert.ok(shellRoutes.includes('/outbreak/'));
});

test('missing shell fails closed without SSR; API outside allowlist',async()=>{
 assert.equal((await staticShell(new Request('https://candidate.workers.dev/'),{ASSETS:{fetch:async()=>new Response('',{status:404})}})).status,503);
 assert.equal(await staticShell(new Request('https://candidate.workers.dev/api/market-score'),{}),null);
 assert.equal((await staticShell(new Request('https://candidate.workers.dev/inflation'),{})).status,308);
});

test('missing CSS-only virtual JS preloads are omitted but real scripts, styles and RSC content stay untouched',()=>{
 const a='risk-last3-hero-parity-r2-CDVIG9AY.js';
 const b='shared-risk-indicator-width-r1-BPME5l_j.js';
 const live='framework-CXnKph_e.js';
 const missingReal='app-real-missing-12345.js';
 const html=[
  '<html><head>',
  '<link rel="modulepreload" href="https://zgmini.kr/assets/'+a+'" crossorigin="">',
  '<link href="/assets/'+b+'" crossorigin="" rel="modulepreload">',
  '<link rel="modulepreload" href="/assets/'+live+'">',
  '<link rel="modulepreload" href="/assets/'+missingReal+'">',
  '<link rel="stylesheet" href="/assets/debt-risk-styles-111.css">',
  '</head><body><script type="module" src="/assets/'+live+'"></script>',
  '<script src="/assets/'+a+'"></script><p>preserved RSC payload</p></body></html>',
 ].join('');
 const emitted=new Set([live,'debt-risk-styles-111.css']);
 const processed=omitMissingCssOnlyPreloads(html,emitted);
 assert.deepEqual(processed.removed,[a,b]);
 assert.equal(processed.html.includes('rel="modulepreload" href="https://zgmini.kr/assets/'+a+'"'),false);
 assert.equal(processed.html.includes('href="/assets/'+b+'"'),false);
 assert.match(processed.html,/framework-CXnKph_e\.js/);
 assert.match(processed.html,/app-real-missing-12345\.js/);
 assert.match(processed.html,/rel="stylesheet"/);
 assert.match(processed.html,/preserved RSC payload/);
 assert.match(processed.html,/<script src="\/assets\/risk-last3-hero-parity-r2-CDVIG9AY\.js"><\/script>/);
 assert.deepEqual(omitMissingCssOnlyPreloads(html,new Set([a,b,live])).removed,[]);
 const unrelated='<link rel="modulepreload" href="https://other.example/assets/'+a+'">';
 assert.equal(omitMissingCssOnlyPreloads(unrelated,new Set()).html,unrelated);
 assert.throws(()=>omitMissingCssOnlyPreloads(null,new Set()),/CANDIDATE_PRELOAD_INPUT_INVALID/);
});
