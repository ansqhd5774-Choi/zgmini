import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const file=path.join(repo,'tools/us-market-breadth-r1',
  'US_BREADTH_R45_LATEST_PAIR_APPROVED.cmd');
const readme=path.join(repo,'tools/us-market-breadth-r1',
  'US_BREADTH_R45_LATEST_PAIR_README_KO.txt');

test('R45 Windows launcher uses only approved E: Node and append-only source CLI',()=>{
  const cmd=fs.readFileSync(file,'utf8');
  assert.match(cmd,/NODE=E:\\ZGmini\\runtime\\node\.exe/i);
  assert.match(cmd,/ZGMINI_DATA_ROOT=E:\\ZGmini\\data/i);
  assert.match(cmd,/--plan-latest-pair/);
  assert.match(cmd,/--download-latest-pair-approved/);
  assert.match(cmd,/set \/p "R45_ANSWER=/);
  assert.match(cmd,/US_BREADTH_R45_OPERATOR_CONFIRMATION=Y/);
  assert.match(cmd,/if \/i not "%R45_ANSWER%"=="Y"/);
  assert.doesNotMatch(cmd,/\b(?:wrangler|schtasks|taskkill|powershell|sqlite3|d1)\s+(?:execute|run|delete|create|update)/i);
  assert.doesNotMatch(cmd,/(?:providers\.env|api[_-]?key|Authorization: Bearer)\s*>/i);
});

test('R45 result TXT is beside the CMD, not in an E: output folder',()=>{
  const cmd=fs.readFileSync(file,'utf8');
  assert.match(cmd,/set "RESULT=%~dp0US_BREADTH_R45_LATEST_PAIR_RESULT_/);
  assert.match(cmd,/explorer\.exe \/select,"%RESULT%"/i);
  assert.match(cmd,/if exist "%RESULT%"/);
  assert.match(fs.readFileSync(readme,'utf8'),/SAME FOLDER AS THE CMD/);
});
