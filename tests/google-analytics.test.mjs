import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function harness(hostname='zgmini.kr') {
  const scripts=[];
  let path='/';
  const window={location:{hostname,origin:`https://${hostname}`}};
  const document={title:'ZGMINI',referrer:'https://example.com/?private=value#fragment',head:{appendChild:s=>scripts.push(s)},createElement:()=>({})};
  const context={window,document,exports:{},require:name=>name==='react'?{useEffect:f=>f()}:{usePathname:()=>path}};
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../app/google-analytics.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,context);
  return {scripts,window,render:p=>{path=p;context.exports.default();},events:()=>Array.from(window.dataLayer||[],v=>Array.from(v))};
}

test('production initializes one tag and one initial page view under repeat effects',()=>{
  const h=harness();h.render('/');h.render('/');
  assert.equal(h.scripts.length,1);
  assert.equal(h.scripts[0].src,'https://www.googletagmanager.com/gtag/js?id=G-KE3CHLGQPL');
  assert.equal(h.events().filter(e=>e[0]==='event').length,1);
  const config=h.events().find(e=>e[0]==='config')[2];
  assert.equal(config.send_page_view,false);
  assert.equal(config.allow_google_signals,false);
  assert.equal(config.allow_ad_personalization_signals,false);
});
test('client navigation and return visits count once per route transition',()=>{
  const h=harness();for(const p of ['/','/inflation/','/inflation/','/'])h.render(p);
  assert.deepEqual(h.events().filter(e=>e[0]==='event').map(e=>e[2].page_location),['https://zgmini.kr/','https://zgmini.kr/inflation/','https://zgmini.kr/']);
  assert.equal(h.scripts.length,1);
});
test('referrer query and hash are excluded',()=>{
  const h=harness();h.render('/');
  assert.equal(h.events().find(e=>e[0]==='event')[2].page_referrer,'https://example.com/');
});
test('local and preview hosts do not send events',()=>{
  for(const host of ['localhost','127.0.0.1','preview.workers.dev']){const h=harness(host);h.render('/');assert.equal(h.scripts.length,0);assert.equal(h.events().length,0);}
});
test('www production host is supported',()=>{const h=harness('www.zgmini.kr');h.render('/');assert.equal(h.scripts.length,1);});
