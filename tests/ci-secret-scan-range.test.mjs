import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chooseSecretRange,checkSecretRange} from '../scripts/ci-secret-scan-range.mjs';

const a='a'.repeat(40),b='b'.repeat(40),c='c'.repeat(40),zero='0'.repeat(40);
const repo='ansqhd5774-Choi/zgmini';
test('push scans all introduced history without first-parent filtering',()=>{
 assert.equal(chooseSecretRange('push',{before:a,after:b},b),a+'..'+b);
 assert.equal(chooseSecretRange('push',{before:zero,after:b},b),b);
 assert.throws(()=>chooseSecretRange('push',{before:a,after:b},c),/SECRET_PUSH_HEAD_MISMATCH/);
});
test('same repository PR scans base..head; forks cannot enter privileged scanner',()=>{
 const event={repository:{full_name:repo},pull_request:{base:{sha:a},head:{sha:b,repo:{full_name:repo}}}};
 assert.equal(chooseSecretRange('pull_request',event,b),a+'..'+b);
 event.pull_request.head.repo.full_name='outside/fork';
 assert.throws(()=>chooseSecretRange('pull_request',event,b),/SECRET_PR_UNTRUSTED_FORK/);
});
test('manual dispatch covers all head ancestors',()=>{
 assert.equal(chooseSecretRange('workflow_dispatch',{},b),b);
 assert.throws(()=>chooseSecretRange('repository_dispatch',{},b),/SECRET_EVENT_UNSUPPORTED/);
});
test('invalid or missing Git objects do not produce scan success',()=>{
 const calls=[];
 const git=args=>{calls.push(args);if(args[0]==='cat-file')return 'commit\n';if(args[0]==='rev-list')return b+'\n';throw Error('Unexpected command');};
 assert.equal(checkSecretRange(a+'..'+b,git),a+'..'+b);
 assert.deepEqual(calls.map(x=>x[0]),['cat-file','cat-file','rev-list']);
 assert.throws(()=>checkSecretRange(a+'^..'+b,git),/SECRET_RANGE_INVALID/);
 assert.throws(()=>checkSecretRange(a+'..'+b,args=>args[0]==='rev-list'?'':'blob\n'),/SECRET_OBJECT_NOT_COMMIT/);
 assert.throws(()=>checkSecretRange(a+'..'+b,args=>args[0]==='rev-list'?'':'commit\n'),/SECRET_RANGE_EMPTY/);
});
test('workflow keeps pinned, full-parent, redacted fail-closed scan',()=>{
 const wf=readFileSync(new URL('../.github/workflows/secret-scan.yml',import.meta.url),'utf8');
 assert.match(wf,/git --redact --exit-code=1 --log-opts=/);
 assert.match(wf,/docker:\/\/ghcr\.io\/gitleaks\/gitleaks@sha256:[a-f0-9]{64}/);
 assert.match(wf,/Validate Git history range/);
 assert.match(wf,/fetch-depth: 0/);
 assert.doesNotMatch(wf,/--first-parent|--no-merges/);
 assert.doesNotMatch(wf,/gitleaks-action@/);
});
