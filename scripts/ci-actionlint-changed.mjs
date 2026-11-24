// Adapted from rhysd/actionlint v1.7.12 (MIT); use the verified upstream binary.
// Only lint changed workflow YAML; keep legacy findings outside this PR unblocked.
// Official release: https://github.com/rhysd/actionlint/releases/tag/v1.7.12
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync,spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {chooseDiffBase} from './lint-changed-ci.mjs';

const SHA=/^[a-f0-9]{40}$/;
const ARCHIVE_URL='https://github.com/rhysd/actionlint/releases/download/v1.7.12/actionlint_1.7.12_linux_amd64.tar.gz';
export const ARCHIVE_SHA256='8aca8db96f1b94770f1b0d72b6dddcb1ebb8123cb3712530b08cc387b349a3d8';

export function selectChangedWorkflows(paths,isFile=p=>{
 try{return fs.lstatSync(p).isFile();}catch{return false;}
}){
 if(!Array.isArray(paths))throw Error('ACTIONLINT_CHANGED_PATHS_UNVERIFIED');
 return [...new Set(paths)].filter(p=>typeof p==='string'&&
  /^\.github\/workflows\/[A-Za-z0-9][A-Za-z0-9._-]*\.(?:yml|yaml)$/.test(p)&&
  isFile(p)).sort();
}
export function verifyArchive(bytes,expected=ARCHIVE_SHA256){
 const digest=crypto.createHash('sha256').update(bytes).digest('hex');
 if(digest!==expected)throw Error('ACTIONLINT_ARCHIVE_SHA256_MISMATCH');
 return true;
}
export function changedWorkflows(env=process.env){
 const git=args=>execFileSync('git',args,{encoding:'utf8',maxBuffer:8*1024*1024}).trim();
 const head=git(['rev-parse','HEAD']);
 const headParent=git(['rev-parse','HEAD^1']);
 const base=chooseDiffBase({event:env.GITHUB_EVENT_NAME,
  before:env.GITHUB_EVENT_BEFORE,headParent});
 if(!SHA.test(head)||!SHA.test(base))throw Error('ACTIONLINT_SHA_INVALID');
 const changed=execFileSync('git',['diff','--name-only','--diff-filter=ACMR',
  '-z',base,head],{encoding:'utf8',maxBuffer:8*1024*1024})
  .split('\0').filter(Boolean);
 return {paths:selectChangedWorkflows(changed),base,head};
}
function command(program,args,options={}){
 const result=spawnSync(program,args,{stdio:'inherit',timeout:90000,...options});
 if(result.error)throw result.error;
 if(result.status!==0)throw Error('ACTIONLINT_COMMAND_FAILED_'+result.status);
}
export async function main(env=process.env,fetcher=fetch){
 // The current site CI uses GitHub-hosted Ubuntu; never run this binary on
 // Windows/operating PC runners or unknown architectures.
 if(process.platform!=='linux'||process.arch!=='x64')
  throw Error('ACTIONLINT_UNSUPPORTED_RUNNER');
 const {paths,base}=changedWorkflows(env);
 console.log('ACTIONLINT_CHANGED_WORKFLOWS='+paths.length+
  ' base='+base.slice(0,12));
 if(!paths.length)return;
 const response=await fetcher(ARCHIVE_URL,{signal:AbortSignal.timeout(20000)});
 if(!response.ok)throw Error('ACTIONLINT_DOWNLOAD_HTTP_'+response.status);
 const bytes=Buffer.from(await response.arrayBuffer());
 verifyArchive(bytes);
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-actionlint-'));
 try{
  const archive=path.join(tmp,'actionlint.tar.gz');
  fs.writeFileSync(archive,bytes,{mode:0o600});
  command('tar',['-xzf',archive,'-C',tmp]);
  const binary=path.join(tmp,'actionlint');
  if(!fs.lstatSync(binary).isFile())throw Error('ACTIONLINT_BINARY_MISSING');
  fs.chmodSync(binary,0o700);
  // Shellcheck/pyflakes are independent scanners; validate YAML/expressions.
  command(binary,['-shellcheck=','-pyflakes=',...paths]);
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))
 main().catch(e=>{console.error(e.message);process.exitCode=1;});
