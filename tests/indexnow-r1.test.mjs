import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {basename} from 'node:path';
import {deriveAffectedUrls,INDEXNOW_ENDPOINT,parseSitemap,SITE_ORIGIN} from '../scripts/indexnow-notify.mjs';

const read=path=>readFileSync(path,'utf8');
const sitemap=parseSitemap(read('public/sitemap.xml'));

test('IndexNow R1 uses the global endpoint and the public sitemap contract',()=>{
  assert.equal(INDEXNOW_ENDPOINT,'https://api.indexnow.org/indexnow');
  assert.equal(SITE_ORIGIN,'https://zgmini.kr');
  assert.equal(sitemap.length,19);
  assert.ok(sitemap.every(url=>new URL(url).origin===SITE_ORIGIN));
});

test('IndexNow R1 maps route-specific app changes only to the affected public URL',()=>{
  assert.deepEqual(
    deriveAffectedUrls(['app/fear-greed/korea/page.tsx'],sitemap),
    ['https://zgmini.kr/fear-greed/korea/'],
  );
  assert.deepEqual(
    deriveAffectedUrls(['app/fear-greed/korea/data-panel.tsx'],sitemap),
    ['https://zgmini.kr/fear-greed/korea/'],
  );
  assert.deepEqual(
    deriveAffectedUrls(['app/page.tsx'],sitemap),
    ['https://zgmini.kr/'],
  );
});

test('IndexNow R1 expands only known shared surfaces',()=>{
  assert.equal(deriveAffectedUrls(['app/layout.tsx'],sitemap).length,19);
  assert.deepEqual(
    deriveAffectedUrls(['app/guides/guide-page.tsx'],sitemap),
    sitemap.filter(url=>new URL(url).pathname.startsWith('/guides/')),
  );
  const releaseGuidePaths=new Set([
    '/guides/cpi-pce-release/',
    '/guides/fomc/',
  ]);
  const releaseGuideUrls=sitemap.filter(url=>releaseGuidePaths.has(new URL(url).pathname));
  assert.deepEqual(
    deriveAffectedUrls(['app/guides/release-calendar.tsx'],sitemap),
    releaseGuideUrls,
  );
  assert.deepEqual(
    deriveAffectedUrls(['app/guides/release-snapshot.json'],sitemap),
    releaseGuideUrls,
  );
  const introPaths=new Set([
    '/credit-risk/',
    '/liquidity-crisis/',
    '/debt-risk/',
    '/inflation/',
    '/recession/',
    '/earnings-recession/',
    '/asset-bubble/',
    '/supply-shock/',
  ]);
  assert.deepEqual(
    deriveAffectedUrls(['app/search-intent-intro.tsx'],sitemap),
    sitemap.filter(url=>introPaths.has(new URL(url).pathname)),
  );
  assert.deepEqual(deriveAffectedUrls(['worker/korea-rev7-engine.mjs'],sitemap),[]);
  assert.deepEqual(deriveAffectedUrls(['app/api/market-score/route.ts'],sitemap),[]);
});

test('IndexNow key is a public root verification file with matching name and body',()=>{
  const keyPath=read('scripts/indexnow-key-path.txt').trim();
  const key=basename(keyPath,'.txt');
  assert.match(key,/^[a-f0-9-]{8,128}$/);
  assert.equal(read(keyPath).trim(),key);
  assert.ok(keyPath.startsWith('public/'));
});

test('IndexNow workflow runs only on main pushes and waits through the notifier',()=>{
  const workflow=read('.github/workflows/indexnow.yml');
  assert.match(workflow,/push:\s*\n\s*branches: \[main\]/);
  assert.doesNotMatch(workflow,/pull_request:/);
  assert.match(workflow,/checks: read/);
  assert.match(workflow,/INDEXNOW_GITHUB_TOKEN: \$\{\{ secrets\.GITHUB_TOKEN \}\}/);
  assert.match(workflow,/node scripts\/indexnow-notify\.mjs/);
});
