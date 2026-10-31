import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const runner=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'fhs-r3-private-pilot.mjs');
const TARGET='MARKET_CALENDAR_R58_FHS_R3_RESULT.txt';
const PRIVATE='MARKET_CALENDAR_R58_FHS_R3_PRIVATE_SHADOW.json';
function sandbox(t){const root=fs.mkdtempSync(path.join(os.tmpdir(),'r58-stop-test-')); t.after(()=>fs.rmSync(root,{recursive:true,force:true}));return root;}
const run=(root)=>spawnSync(process.execPath,[runner,path.join(root,'nonexistent-pc'),root],{encoding:'utf8',timeout:10000});
test('missing real PC data creates explicit STOP TXT, no private artifact',t=>{
 const dir=sandbox(t),r=run(dir);
 assert.equal(r.status,2);assert.match(r.stdout,/STATUS=PC_DB_ABSENT_STOP/);
 const data=fs.readFileSync(path.join(dir,TARGET),'utf8');
 assert.match(data,/status="PC_DB_ABSENT_STOP"/);
 assert.match(data,/executionComplete=false/);
 assert.equal(fs.existsSync(path.join(dir,PRIVATE)),false);
});
test('existing private shadow stays untouched and new error report records STOP',t=>{
 const dir=sandbox(t),p=path.join(dir,PRIVATE),original='KEEP_EXISTING_UNVERIFIED_SHADOW';
 fs.writeFileSync(p,original);
 const r=run(dir);
 assert.equal(r.status,2);assert.equal(fs.readFileSync(p,'utf8'),original);
 assert.match(fs.readFileSync(path.join(dir,TARGET),'utf8'),/R58_RESULTS_ALREADY_EXIST_STOP/);
});
test('existing results are never overwritten',t=>{
 const dir=sandbox(t),p=path.join(dir,TARGET),original='KEEP_RESULT_AS_IS';
 fs.writeFileSync(p,original);
 const r=run(dir);
 assert.equal(r.status,2);
 assert.equal(fs.readFileSync(p,'utf8'),original);
 assert.match(r.stdout,/FAILURE_REPORT_WRITTEN=false/);
});
