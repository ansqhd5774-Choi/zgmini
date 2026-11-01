import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const file=new URL('../tools/us-market-breadth-r1/US_BREADTH_R35_APPROVED_PERCENT_HISTORY_PUBLISH.cmd',
  import.meta.url);

test('R35 explicit operator-gated Windows publisher only invokes approved R2 history runner',()=>{
 const bytes=fs.readFileSync(file);
 assert.equal(bytes.every(b=>b<128),true,'ASCII-only launcher');
 const cmd=bytes.toString('ascii');
 assert.equal(cmd.replaceAll('\r\n','').includes('\n'),false,'Windows CRLF required');
 assert.match(cmd,/E:\\ZGmini\\runtime\\node\.exe/);
 assert.match(cmd,/set "RESULT_DIR=%USERPROFILE%\\Downloads"/);
 assert.match(cmd,/US_BREADTH_R35_APPROVED_PERCENT_HISTORY/);
 assert.match(cmd,/R2_HISTORY_KEY=public:market-breadth-confirmed-r2:usa:history-percent:v1/);
 assert.match(cmd,/set "APPROVED_PREVIEW_SHA256=31ae5b3aa062d84ee9b28954fe726a47c36bde6bfcdfc957624fba4babee9728"/);
 assert.match(cmd,/choice \/C YN \/N \/M/);
 assert.match(cmd,/if errorlevel 2 goto :DECLINED/);
 assert.match(cmd,/--publish-approved --allow-d1-final-write --approved-sha256/);
 assert.match(cmd,/LEGACY_R1_WRITES=0/);
 assert.match(cmd,/CORE_TASK_CHANGES=0/);
 assert.doesNotMatch(cmd,/schtasks|wrangler deploy|\bdel\b|\brmdir\b|\bREG ADD\b/i);
 assert.equal(cmd.match(/--publish-approved/g)?.length,1);
});
