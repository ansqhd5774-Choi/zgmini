import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const file=path.join(root,'scripts','pc-writer','ASSET_R10_1Y_HISTORY_D1_APPLY_R2.cmd');
const cmd=fs.readFileSync(file,'utf8');

test('R2 isolates approved latest main publisher; existing work branch is discovery only',()=>{
 assert.match(cmd,/git clone --quiet --depth 1 --single-branch --branch main .*"%PUBLISHER%"/);
 assert.match(cmd,/git clone --quiet --depth 1 --single-branch --branch codex\/api-site-integration-r1-20261026 .*"%DISCOVERY_ROOT%"/);
 assert.match(cmd,/set "RUNNER=%PUBLISHER%\\scripts\\pc-writer\\ASSET_R10_1Y_HISTORY_D1_ONE_SHOT_R1\.mjs"/);
 assert.doesNotMatch(cmd,/set "RUNNER=%DISCOVERY_ROOT%/);
 assert.match(cmd,/PUBLISHER_BRANCH=main/);
});

test('R2 preserves published source SHA gates and verifies current main before apply',()=>{
 assert.match(cmd,/4a1db8ae89db884617aac48026d38b8f274fd278/);
 assert.match(cmd,/6749a1f6a767a3a5f5cda3258870f46658cb8640/);
 assert.match(cmd,/c02af8c557baf9f41ff2f59d21f2ffb446334ec0/);
 assert.match(cmd,/9324ce39555e7123623fb58bf63edc54f957d4d4/);
 assert.match(cmd,/ls-remote origin refs\/heads\/main/);
 assert.match(cmd,/MAIN_CHANGED_SINCE_PUBLISHER_CLONE/);
 const remote=cmd.indexOf('STAGE=CHECK_LATEST_MAIN_SHA_BEFORE_APPLY');
 const apply=cmd.indexOf('STAGE=HISTORY_D1_EXISTING_RAW_LINEAGE_GATE_AND_SINGLE_KEY_APPLY');
 assert.ok(remote>0&&apply>remote);
});

test('R2 dry-run first; exactly one guarded apply and no scheduler or config writes',()=>{
 assert.match(cmd,/ALLOWED_D1_KEY=detail:asset-bubble-history:r1/);
 assert.match(cmd,/PC_SQLITE_WRITES=DISABLED/);
 assert.match(cmd,/NO_AUTOMATIC_WRITE_RETRY=TRUE/);
 assert.equal((cmd.match(/"%RUNNER%" --dry-run/g)||[]).length,1);
 assert.equal((cmd.match(/"%RUNNER%" --apply --confirm-asset-r10-history-d1-write/g)||[]).length,1);
 assert.ok(cmd.indexOf('"%RUNNER%" --dry-run')<cmd.indexOf('"%RUNNER%" --apply'));
 assert.doesNotMatch(cmd,/git\s+(?:reset|rebase|push|clean|stash)\b|wrangler\s+deploy|\b(?:INSERT|UPDATE|DELETE)\s+/i);
});

test('R2 retains original PC paths and fail-closed diagnostics',()=>{
 assert.match(cmd,/E:\\ZGmini\\runtime\\node.exe/);
 assert.match(cmd,/E:\\ZGmini\\data\\pc-writer/);
 assert.match(cmd,/APPROVED_OPERATIONAL_ROOT_DISCOVERY_FAILED/);
 assert.match(cmd,/APPROVED_OPERATIONAL_ROOT_INVALID/);
 assert.match(cmd,/WRAPPER_RESULT=STOPPED_NO_RETRY/);
 assert.match(cmd,/APPLY_EXIT_CODE=%APPLY_RC%/);
 assert.match(cmd,/PASS_D1_READBACK_OR_ALREADY_STORED/);
});
