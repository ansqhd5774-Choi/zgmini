import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import test from 'node:test';
import vm from 'node:vm';
import {createRequire} from 'node:module';

const here = path.dirname(fileURLToPath(import.meta.url));
const cmd = fs.readFileSync(path.resolve(here, '../scripts/pc-writer/theme-nine-baseline-r2.cmd'), 'ascii');
const js = [...cmd.matchAll(/"%TASK_NODE%" -e "([^"]+)" "%TASK_DATA_ROOT%"/g)].map(x => x[1]);

test('R2 PC audit is a standalone read-only single CMD with local TXT output', () => {
  assert.equal(js.length, 3);
  assert.match(cmd, /%~dp0THEME_NINE_BASELINE_R2_RESULT\.txt/);
  assert.match(cmd, /DEPENDENCY=NODE_ONLY_NO_GITHUB_CHECKOUT_NEEDED/);
  assert.match(cmd, /RAW_SHA=NOT_VERIFIED/);
  assert.match(cmd, /PUBLIC_D1_AND_PROVIDER=NOT_QUERIED/);
  assert.doesNotMatch(cmd, /theme-data-inventory\.mjs/);
  assert.doesNotMatch(cmd, /\b(?:curl|wrangler|git|wget|schtasks\s+\/Create|schtasks\s+\/Change|del|rmdir)\b/i);
  for (const source of js) new vm.Script(source);
});

test('R2 bundled Node commands inspect file metadata and manifests without needing Git checkout', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'theme-nine-pc-r2-'));
  try {
    const prices = path.join(tmp, 'theme-market-history-r131/marketparquet-r167');
    fs.mkdirSync(prices, {recursive:true});
    fs.writeFileSync(path.join(prices, 'actual.json'), '{"test":true}\n');
    const manifest = path.join(tmp, 'themes/biotech/raw-manifest.json');
    fs.mkdirSync(path.dirname(manifest), {recursive:true});
    fs.writeFileSync(manifest, JSON.stringify({version:1,themeId:'biotech',files:[{
      path:'raw/IBB.json',sha256:'a'.repeat(64),observationFrom:'2025-01-02',
      observationThrough:'2026-10-20',priceMode:'SAVED_REAL_SOURCE'
    }]}));
    const require = createRequire(import.meta.url);
    const result = js.map(code => {
      const out = [];
      new vm.Script(code).runInNewContext({require, process:{argv:[process.execPath,tmp]}, console:{log:s=>out.push(s)}});
      return out.join('\n');
    });
    assert.match(result[0], /PATH=theme-market-history-r131\/marketparquet-r167;KIND=DIR/);
    assert.match(result[1], /RECENT=theme-market-history-r131\/marketparquet-r167\/actual\.json/);
    assert.match(result[2], /MANIFEST=themes\/biotech\/raw-manifest\.json;VERSION=1;THEME=biotech;ENTRIES=1;SHA_CHECK=NOT_PERFORMED/);
    assert.match(result[2], /ENTRY=biotech\/0;FROM=2025-01-02;THROUGH=2026-10-20;PRICE_MODE=SAVED_REAL_SOURCE;SHA_DECLARED=YES/);
    assert.match(result[2], /MANIFEST=themes\/ai-semiconductor\/raw-manifest\.json;STATUS=ENOENT/);
  } finally {
    fs.rmSync(tmp, {recursive:true,force:true});
  }
});
