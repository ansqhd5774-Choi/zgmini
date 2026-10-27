import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';

const here=path.dirname(fileURLToPath(import.meta.url));
const cmd=fs.readFileSync(path.resolve(here,'../scripts/pc-writer/theme-nine-legacy-coverage-r4.cmd'),'ascii');
const snippets=[...cmd.matchAll(/"%TASK_NODE%" -e "([^"]+)" "%TASK_DATA_ROOT%"/g)].map(x=>x[1]);

test('R4 standalone probes only stored data, cap scanning, and output beside CMD',()=>{
 assert.equal(snippets.length,3);
 assert.match(cmd,/%~dp0THEME_NINE_LEGACY_R4_RESULT\.txt/);
 assert.match(cmd,/maxBytes=268435456/);
 assert.match(cmd,/PROVIDER_D1_SCHEDULER_WRITES=NONE/);
 assert.doesNotMatch(cmd,/\b(?:powershell|wrangler|curl|wget|git|schtasks|rmdir|del)\b/i);
 for(const code of snippets)new vm.Script(code);
});

test('R4 reports 15-hour New York real observation overlap, not fabricated 628 scores',async()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'theme-nine-r4-'));
 try{
  const raw=path.join(tmp,'theme-market-history-r131/raw');
  fs.mkdirSync(raw,{recursive:true});
  fs.mkdirSync(path.join(tmp,'theme-market-history-r131/derived'),{recursive:true});
  fs.mkdirSync(path.join(tmp,'theme-market-history-r131/warmup'),{recursive:true});
  const bars=[
   {symbol:'SPY',close:100,timestamp:'2026-10-23T19:00:00Z',is_gap:false},
   {symbol:'BOTZ',close:12,timestamp:'2026-10-23T19:00:00Z',is_gap:false},
   {symbol:'ROBO',close:50,timestamp:'2026-10-23T19:00:00Z',is_gap:true},
   {symbol:'BOTZ',close:13,timestamp:'2026-10-23T18:00:00Z',is_gap:false}
  ];
  fs.writeFileSync(path.join(raw,'live.jsonl'),bars.map(b=>JSON.stringify(b)).join('\n')+'\n');
  const r187=path.join(tmp,'pc-writer/local-theme-ai-semiconductor-r187-raw-b79af822c7c91a6d.json');
  fs.mkdirSync(path.dirname(r187),{recursive:true});
  fs.writeFileSync(r187,'{"symbols":["SMH","SOXX","SPY"]}\n');
  const require=createRequire(import.meta.url),results=[];
  for(const code of snippets){
   const out=[];
   const promise=new vm.Script(code).runInNewContext({require,Buffer,console:{log:s=>out.push(s)},process:{argv:[process.execPath,tmp],exitCode:0},Date,Intl,Set,Map});
   if(promise?.then)await promise;
   results.push(out.join('\n'));
  }
  assert.match(results[0],/DIR=raw;FILES_COUNT=1;SKIPPED=0;BY_EXT=\.jsonl:1/);
  assert.match(results[1],/JSONL=raw\/live\.jsonl;LINES=4;PARSE_ERRORS=0;SELECTED_HOUR_ROWS=2/);
  assert.match(results[1],/SYMBOL=BOTZ;VALID_HOURLY_ROWS=2;GAPS=0;SELECTED_DAYS=1;FIRST=2026-10-23;LAST=2026-10-23;SPY_OVERLAP=1;MIN_628=false/);
  assert.match(results[1],/SYMBOL=ROBO;VALID_HOURLY_ROWS=0;GAPS=1;SELECTED_DAYS=0/);
  assert.match(results[1],/GATE=HOUR_PROXY_COVERAGE_ONLY_NOT_SCORE/);
  assert.match(results[2],/AI_R187_SHA=SHA_MISMATCH/);
  assert.match(results[2],/AI_R187_TOP_KEYS=symbols/);
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
