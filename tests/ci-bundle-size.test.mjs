import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mkdtemp,mkdir,writeFile,symlink,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {gzipSync} from 'node:zlib';
import {collectBundleSize,compareBundleSizes,compareSavedBundleReports} from '../scripts/ci-bundle-size.mjs';

async function fixture(fn){
 const dir=await mkdtemp(join(tmpdir(),'zgmini-bundle-test-'));
 try{return await fn(dir);}finally{await rm(dir,{recursive:true,force:true});}
}

test('only produced JS and CSS are measured; raw, gzip, sha are deterministic',async()=>{
 await fixture(async dir=>{
  const js=Buffer.from('console.log("bundle");\n'.repeat(15));
  const css=Buffer.from('.box { display: grid; }\n'.repeat(20));
  await writeFile(join(dir,'index-b88.js'),js);
  await writeFile(join(dir,'index-c99.css'),css);
  await writeFile(join(dir,'index-b88.js.map'),'maps are excluded');
  await writeFile(join(dir,'unrelated.txt'),'not in client assets');
  const report=await collectBundleSize(dir);
  assert.equal(report.schemaVersion,1);
  assert.deepEqual(report.files.map(x=>x.name),['index-b88.js','index-c99.css']);
  assert.deepEqual(report.totals.js,{
   files:1,rawBytes:js.length,gzipBytes:gzipSync(js,{level:6}).length
  });
  assert.deepEqual(report.totals.css,{
   files:1,rawBytes:css.length,gzipBytes:gzipSync(css,{level:6}).length
  });
  assert.match(report.files[0].sha256,/^[a-f0-9]{64}$/);
  assert.deepEqual(await collectBundleSize(dir),report);
 });
});

test('missing either required asset type fails closed, never reports a zero-sized success',async()=>{
 await fixture(async dir=>{
  await writeFile(join(dir,'only.js'),'abc');
  await assert.rejects(collectBundleSize(dir),/CI_BUNDLE_SIZE_REQUIRED_ASSETS_MISSING/);
 });
});

test('symlinks that could read outside the build are rejected',async()=>{
 await fixture(async dir=>{
  await writeFile(join(dir,'app.css'),'.x{}');
  await writeFile(join(dir,'app.js'),'void 0;');
  await symlink(join(dir,'app.js'),join(dir,'outside.js'));
  await assert.rejects(collectBundleSize(dir),/CI_BUNDLE_SIZE_ASSET_NOT_REGULAR/);
 });
});

test('comparison reports exact byte deltas and does not invent percentage for zero baseline',()=>{
 const b={schemaVersion:1,scope:'dist/client/assets/*.js,*.css',
  totals:{js:{files:1,rawBytes:100,gzipBytes:40},
   css:{files:0,rawBytes:0,gzipBytes:0}}};
 const c={schemaVersion:1,scope:b.scope,totals:{
  js:{files:2,rawBytes:120,gzipBytes:45},
  css:{files:1,rawBytes:20,gzipBytes:12}}};
 assert.deepEqual(compareBundleSizes(b,c),{
  js:{rawDeltaBytes:20,gzipDeltaBytes:5,rawPercent:20,gzipPercent:12.5},
  css:{rawDeltaBytes:20,gzipDeltaBytes:12,rawPercent:null,gzipPercent:null}
 });
});

test('comparison rejects corrupt or incomparable baseline instead of fictional improvement',()=>{
 const b={schemaVersion:1,scope:'dist/client/assets/*.js,*.css',totals:{
  js:{files:1,rawBytes:-10,gzipBytes:7},
  css:{files:1,rawBytes:3,gzipBytes:2}}};
 assert.throws(()=>compareBundleSizes(b,b),/CI_BUNDLE_SIZE_BASELINE_INCOMPARABLE/);
 assert.throws(()=>compareBundleSizes(null,b),/CI_BUNDLE_SIZE_BASELINE_INCOMPARABLE/);
});

test('existing Node CI measures after build, uploads evidence without new workflow',()=>{
 const w=readFileSync(new URL('../.github/workflows/node.js.yml',import.meta.url),'utf8');
 const build=w.indexOf('      - name: Build');
 const measure=w.indexOf('      - name: Measure client JS/CSS bundle sizes');
 const artifact=w.indexOf('      - name: Upload bundle size report');
 assert.ok(build>=0&&measure>build&&artifact>measure);
 assert.match(w,/node scripts\/ci-bundle-size\.mjs/);
 assert.match(w,/artifacts\/ci-bundle-size\/\*\.json/);
 assert.match(w,/retention-days: 7/);
 assert.match(w,/runs-on: ubuntu-latest/);
});

test('optional existing baseline compares actual saved JSON with no fabricated budget',async()=>{
 await fixture(async dir=>{
  const baseline=join(dir,'baseline.json'),current=join(dir,'current.json');
  const b={schemaVersion:1,scope:'dist/client/assets/*.js,*.css',totals:{
   js:{files:1,rawBytes:100,gzipBytes:40},css:{files:1,rawBytes:20,gzipBytes:9}
  }};
  const next={...b,totals:{...b.totals,js:{files:1,rawBytes:110,gzipBytes:42}}};
  await writeFile(current,JSON.stringify(next));
  assert.deepEqual(await compareSavedBundleReports(current,baseline),
   {status:'UNAVAILABLE_NO_BASELINE'});
  await writeFile(baseline,JSON.stringify(b));
  assert.deepEqual(await compareSavedBundleReports(current,baseline),{
   status:'COMPARABLE',schemaVersion:1,scope:b.scope,
   delta:{js:{rawDeltaBytes:10,gzipDeltaBytes:2,rawPercent:10,gzipPercent:5},
    css:{rawDeltaBytes:0,gzipDeltaBytes:0,rawPercent:0,gzipPercent:0}}
  });
 });
});

test('invalid or mismatched optional previous report never becomes a synthetic zero delta',async()=>{
 await fixture(async dir=>{
  const baseline=join(dir,'baseline.json'),current=join(dir,'current.json');
  const now={schemaVersion:1,scope:'dist/client/assets/*.js,*.css',totals:{
   js:{files:1,rawBytes:100,gzipBytes:40},css:{files:1,rawBytes:20,gzipBytes:9}
  }};
  await writeFile(current,JSON.stringify(now));
  await writeFile(baseline,'broken json');
  assert.deepEqual(await compareSavedBundleReports(current,baseline),
   {status:'UNVERIFIED_BASELINE_JSON'});
  await writeFile(baseline,JSON.stringify({...now,schemaVersion:0}));
  assert.deepEqual(await compareSavedBundleReports(current,baseline),
   {status:'INCOMPARABLE_BASELINE'});
  await rm(current);
  await assert.rejects(compareSavedBundleReports(current,baseline),/ENOENT/);
 });
});
