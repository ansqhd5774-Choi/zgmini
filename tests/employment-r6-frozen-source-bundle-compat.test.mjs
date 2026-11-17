import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync,spawnSync} from 'node:child_process';

// Development-only fixture. It never touches the operating PC, SQLite, or D1.
// Compare the EXACT approved-base 16-file R6 source bundle with the two-file
// PIT-04-02 proposal; all checkout/fetch/write effects stay in isolated CI.
const BASE='afdd8fab1c03b321e4b8b0853bb236c0800a0a14';
const CANDIDATE='2b5255147b16d595196a8f006cf1d95c840a4926';
const APP_TESTS='dfa7d5e487e86a8887cb2766bc0ba9a1a114e048';
const MANIFEST_REF='a82d3c1920eaaa9e9057f9ea889d549d6863dbd2';
const MANIFEST_FILE='docs/EMPLOYMENT_R6_PIT04_02_MINIMAL_SOURCE_MANIFEST_DRAFT_20261117.json';
const MANIFEST_SHA256='60e0c7b404368be3551f0f6d85819ac5895ae4f32bc43d694aa8d818db0f74f6';
const CANDIDATE_REF='refs/heads/fix/w04-r6-pit-history-bundle-minimal-20261117';
const APP_TESTS_REF='refs/heads/fix/w04-r6-history-tie-ambiguity-20261117';
const MANIFEST_BRANCH_REF='refs/heads/codex/employment-1y-reader-r1';
const EXPECTED_CHANGED=[
  'scripts/pc-writer/employment-r6-pit-coverage.mjs',
  'scripts/pc-writer/employment-r6-runner-stage.mjs',
];

const digest=x=>createHash('sha256').update(x).digest('hex');
const git=(args,{cwd=process.cwd(),timeout=60000}={})=>execFileSync('git',args,{
  cwd,encoding:'utf8',timeout,maxBuffer:8*1024*1024,
}).trimEnd();
const checkFetch=(ref,sha)=>{
  git(['fetch','--no-tags','--depth=1','origin',ref]);
  assert.equal(git(['rev-parse','FETCH_HEAD']),sha,`IMMUTABLE_REF_MOVED: ${ref}`);
};
const fromCommit=(sha,p)=>execFileSync('git',['show',`${sha}:${p}`],{
  cwd:process.cwd(),timeout:15000,maxBuffer:12*1024*1024,
});
const fileDigest=(root,p)=>digest(fs.readFileSync(path.join(root,p)));

test('W04 PIT-04-02: frozen 16-file exact source + latest isolated two-test runtime', {
  timeout:220000,
},()=>{
  const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-w04-r6-bundle-'));
  const checkout=path.join(temporary,'approved-r6');
  let worktreeAdded=false;
  try{
    checkFetch(BASE,BASE); // Compare against the immutable pre-change file bytes.
    checkFetch(CANDIDATE_REF,CANDIDATE);
    checkFetch(APP_TESTS_REF,APP_TESTS);
    checkFetch(MANIFEST_BRANCH_REF,MANIFEST_REF);

    const manifestBytes=fromCommit(MANIFEST_REF,MANIFEST_FILE);
    assert.equal(digest(manifestBytes),MANIFEST_SHA256,'CANDIDATE_MANIFEST_BYTES_CHANGED');
    const manifest=JSON.parse(manifestBytes);
    assert.equal(manifest.sourceSha,CANDIDATE);
    assert.equal(Object.keys(manifest.files).length,16);

    git(['worktree','add','--detach',checkout,CANDIDATE]);
    worktreeAdded=true;
    const changed=[];
    for(const [p,expectedHash] of Object.entries(manifest.files)){
      assert.equal(fileDigest(checkout,p),expectedHash,`MISMATCHED_BUNDLE_FILE: ${p}`);
      const previous=fromCommit(BASE,p);
      if(digest(previous)!==expectedHash)changed.push(p);
    }
    assert.deepEqual(changed.sort(),[...EXPECTED_CHANGED].sort(),
      'CANDIDATE_WAS_NOT_EXACTLY_TWO_SOURCE_FILES');
    assert.equal(fileDigest(checkout,'lib/market-score/employment-r6-scheduler.mjs'),
      digest(fromCommit(BASE,'lib/market-score/employment-r6-scheduler.mjs')),
      'UNAPPROVED_SCHEDULER_CHANGE');

    // Use the already-CI-proven latest fixtures, without copying the PR's
    // latest-main source or writing any original approved 14 files.
    for(const p of [
      'tests/pc-writer-employment-r6-pit-coverage.test.mjs',
      'tests/employment-r6-runner-stage.test.mjs',
    ]){
      fs.mkdirSync(path.dirname(path.join(checkout,p)),{recursive:true});
      fs.writeFileSync(path.join(checkout,p),fromCommit(APP_TESTS,p));
    }
    fs.symlinkSync(path.join(process.cwd(),'node_modules'),
      path.join(checkout,'node_modules'),'dir');
    // Node's own test runner injects NODE_TEST_CONTEXT into its workers.
    // Remove it so the nested isolated process actually runs its two suites
    // and emits its OWN TAP summary, rather than forwarding events to a
    // missing parent IPC channel.
    const nestedEnv={...process.env,CI:'true'};
    delete nestedEnv.NODE_TEST_CONTEXT;
    delete nestedEnv.NODE_TEST_WORKER_ID;
    const run=spawnSync(process.execPath,['--test','--test-reporter=tap',
      'tests/pc-writer-employment-r6-pit-coverage.test.mjs',
      'tests/employment-r6-runner-stage.test.mjs',
    ],{cwd:checkout,encoding:'utf8',timeout:155000,
      maxBuffer:12*1024*1024,env:nestedEnv});
    const output=(run.stdout||'')+'\n'+(run.stderr||'');
    assert.equal(run.error,undefined,`ISOLATED_NODE_ERROR ${run.error?.message}`);
    assert.equal(run.status,0,`FROZEN_BUNDLE_RUNTIME_FAILED\n${output.slice(-14500)}`);
    assert.match(output,/# tests [1-9][0-9]*/, 'NO_ISOLATED_TESTS_EXECUTED');
    assert.match(output,/# fail 0\b/, 'ISOLATED_TEST_FAILURE_HIDDEN');
    assert.match(output,/PIT-04-02 Runner exposes only fixed History counts/,
      'HISTORY_RUNNER_SUITE_NOT_EXECUTED');
  }finally{
    if(worktreeAdded){
      try{git(['worktree','remove','--force',checkout],{timeout:25000});}catch{}
    }
    fs.rmSync(temporary,{recursive:true,force:true});
  }
});
