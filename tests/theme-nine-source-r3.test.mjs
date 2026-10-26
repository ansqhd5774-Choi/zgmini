import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';

const here = path.dirname(fileURLToPath(import.meta.url));
const cmd = fs.readFileSync(path.resolve(here, '../scripts/pc-writer/theme-nine-source-r3.cmd'), 'ascii');
const snippets = [...cmd.matchAll(/"%TASK_NODE%" -e "([^"]+)" "%TASK_DATA_ROOT%"/g)].map(x => x[1]);

test('R3 CMD has four self-contained read-only probes and no network or task mutation', () => {
  assert.equal(snippets.length, 4);
  assert.match(cmd, /%~dp0THEME_NINE_SOURCE_R3_RESULT\.txt/);
  assert.match(cmd, /PROVIDER_D1_SCHEDULER_WRITES=NONE/);
  assert.match(cmd, /maxTotal=536870912/);
  assert.doesNotMatch(cmd, /\b(?:curl|wget|wrangler|schtasks|git|powershell|del|rmdir)\b/i);
  for (const source of snippets) new vm.Script(source);
});

test('R3 probes report actual registered raw hash and inspect legacy metadata without exposing prices', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'theme-nine-source-r3-'));
  try {
    const old = path.join(tmp, 'theme-market-history-r131/marketparquet-r167');
    fs.mkdirSync(old, {recursive:true});
    fs.writeFileSync(path.join(old, 'R179_SOURCE_AUDIT.json'), JSON.stringify({status:'READY',symbols:[{ticker:'BOTZ',count:2}],meta:{count:2},accessToken:'DUMMY_SECRET'}));
    const parquet = path.join(tmp, 'theme-market-history-r131/marketparquet-r165/etf_daily_2026-10-23.parquet');
    fs.mkdirSync(path.dirname(parquet), {recursive:true});
    fs.writeFileSync(parquet, 'PAR1test');
    const realPrice = '{"symbol":"IBB","date":"2026-10-20","price":42}\n';
    const manifest = path.join(tmp, 'themes/biotech/raw-manifest.json');
    fs.mkdirSync(path.join(path.dirname(manifest), 'raw'), {recursive:true});
    fs.writeFileSync(path.join(path.dirname(manifest), 'raw/price.json'), realPrice);
    fs.writeFileSync(manifest, JSON.stringify({themeId:'biotech',files:[{
      path:'raw/price.json',sha256:crypto.createHash('sha256').update(realPrice).digest('hex')
    }]}));

    const require = createRequire(import.meta.url);
    const results = [];
    for (const source of snippets) {
      const out = [];
      const promise = new vm.Script(source).runInNewContext({
        require, Buffer, process:{argv:[process.execPath,tmp],exitCode:0}, console:{log:s=>out.push(s)}
      });
      if (promise?.then) await promise;
      results.push(out.join('\n'));
    }
    assert.match(results[0], /TREE=theme-market-history-r131;TOTAL_ENTRIES=2/);
    assert.match(results[1], /JSON=theme-market-history-r131\/marketparquet-r167\/R179_SOURCE_AUDIT\.json;TOP_KEYS=status,symbols,meta,accessToken/);
    assert.match(results[1], /VALUE=R179_SOURCE_AUDIT\.json\/status=READY/);
    assert.doesNotMatch(results[1], /DUMMY_SECRET/);
    assert.match(results[2], /MANIFEST=biotech;ENTRIES=1;VALID_THEME=true/);
    assert.match(results[2], /RAW=biotech\/0;VERIFY=SHA_VERIFIED;BYTES=48;EXT=\.json;SAMPLE_KEYS=symbol,date,price/);
    assert.match(results[2], /MANIFEST=ai-semiconductor;STATUS=ENOENT/);
    assert.match(results[3], /PARQUET=etf_daily_2026-10-23\.parquet;MAGIC=PAR1/);
  } finally {
    fs.rmSync(tmp, {recursive:true,force:true});
  }
});
