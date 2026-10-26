import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {compatibleRunnerPatch} from '../scripts/iran-progress/news-display-install-hook-r7.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const runner=fs.readFileSync(path.join(root,'scripts/iran-progress/run-reference-flow-r3.mjs'),'utf8');
const old=runner.replace(/\n\n\/\/ Isolated display-cache retention:[\s\S]*?\n(?=if\(r3!==0\|\|r5!==0\|\|original!==0\)process\.exitCode=1;)/,'\n');
const sha=x=>createHash('sha256').update(x).digest('hex');

test('R7 retains byte-exact approved PC runner except a final optional cache hook',()=>{
 assert.equal(sha(old.replace(/\n/g,'\r\n')),'cbeff8d254504780c3446bdc7f43484a87306e2163b3687784a10f5b85a4c3b6');
 assert.equal(compatibleRunnerPatch(old.replace(/\n/g,'\r\n'),runner),true);
 assert.equal(compatibleRunnerPatch(old,runner),true);
 assert.ok(runner.indexOf('const retention=')>runner.indexOf('const original=await run'));
 assert.ok(runner.indexOf('const retention=')<runner.indexOf('if(r3!==0||r5!==0||original!==0)'));
});

test('R7 refuses any unapproved change in R3, R5 or legacy score flow',()=>{
 assert.equal(compatibleRunnerPatch(old,runner.replace("'--collect-publish'","'--publish'")),false);
 assert.equal(compatibleRunnerPatch(old,runner.replace("'operate-r5.mjs'","'operate-other.mjs'")),false);
 assert.equal(compatibleRunnerPatch(old,runner.replace('const original=await run','const newOriginal=await run')),false);
 assert.equal(compatibleRunnerPatch(old,runner.replace('NEWS_RETENTION_FAILED_SCORE_UNAFFECTED','OTHER_MESSAGE')),false);
 assert.equal(compatibleRunnerPatch(old,old),false);
});

test('R7 optional hook cannot change score exit result',()=>{
 assert.match(runner,/if\(newsExit!==0\)console\.error\('IRAN_DISPLAY_NEWS_RETENTION_FAILED_SCORE_UNAFFECTED'\)/);
 assert.match(runner,/if\(r3!==0\|\|r5!==0\|\|original!==0\)process\.exitCode=1;/);
 assert.doesNotMatch(runner,/if\(newsExit!==0\)process\.exitCode/);
});
