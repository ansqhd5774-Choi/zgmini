import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const script=fileURLToPath(new URL('./EARNINGS_R4_C_D1_MANUAL.mjs',import.meta.url));

function run(args){
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-earnings-c-r4-test-'));
  try{
    const result=spawnSync(process.execPath,[script,...args],{
      encoding:'utf8',timeout:15000,windowsHide:true,
      env:{...process.env,ZGMINI_PC_HOME:path.join(directory,'missing-pc-source'),
        ZGMINI_EARNINGS_C_LOG_DIR:directory},
    });
    const files=fs.readdirSync(directory).filter(name=>
      /^EARNINGS_R4_C_D1_MANUAL_RESULT_\d{8}-\d{6}Z\.txt$/.test(name));
    assert.equal(files.length,1,'One timestamped TXT must be written, even on error');
    const body=fs.readFileSync(path.join(directory,files[0]),'utf8');
    assert.equal(result.error,undefined,'Manual runner must start successfully');
    assert.match(body,/BLS_PROVIDER_REQUESTS=0/);
    assert.match(body,/PC_SQLITE_WRITES=0/);
    assert.match(body,/EXISTING_SCORE_WRITES=0/);
    assert.match(body,/RESULT=R4_C_D1_MANUAL_FAILED/);
    return {result,body};
  }finally{
    fs.rmSync(directory,{recursive:true,force:true});
  }
}

test('CMD --dry-run inspects user flags, not Node and script executable paths',()=>{
  const {result,body}=run(['--dry-run']);
  assert.equal(result.status,1,'PC file is deliberately absent in this smoke test');
  assert.match(body,/ERROR=PC_SQLITE_FILE_MISSING/);
  assert.doesNotMatch(body,/EARNINGS_C_INVALID_ARGUMENT/);
});

test('default execution also produces a readable TXT, without D1 attempts',()=>{
  const {body}=run([]);
  assert.match(body,/MODE=DRY_RUN/);
  assert.match(body,/ERROR=PC_SQLITE_FILE_MISSING/);
});

test('invalid user flag still reports the error to the same TXT location',()=>{
  const {body}=run(['--unexpected-option']);
  assert.match(body,/ERROR=EARNINGS_C_INVALID_ARGUMENT/);
});

test('apply and dry-run cannot be combined',()=>{
  const {body}=run(['--apply','--dry-run']);
  assert.match(body,/ERROR=EARNINGS_C_CONFLICTING_MODE/);
});
