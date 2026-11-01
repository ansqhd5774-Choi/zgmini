// Separate publisher-code provenance from the currently approved PC collector.
// Both must pass independently. This module never changes either checkout.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const SHA = /^[a-f0-9]{40}$/i;
const REPO = /(?:^|[/:])ansqhd5774-Choi\/zgmini(?:\.git)?$/i;

const execGit = (root, args) => execFileSync('git', ['-C',root,...args], {
  encoding:'utf8', windowsHide:true, timeout:15000,
  stdio:['ignore','pipe','pipe'],
}).trim();

export function inspectD1Source(root, {git=execGit,realpath=fs.realpathSync,publisher=false}={}) {
  const absolute=path.resolve(root);
  const top=git(absolute,['rev-parse','--show-toplevel']);
  if(path.normalize(realpath(absolute)).toLowerCase()!==path.normalize(realpath(top)).toLowerCase())
    throw Error('EARNINGS_C_NOT_REPOSITORY_ROOT');
  const sha=git(absolute,['rev-parse','HEAD']);
  const branch=git(absolute,['branch','--show-current']);
  const remote=git(absolute,['config','--get','remote.origin.url']);
  const changed=git(absolute,['status','--porcelain','--untracked-files=no',
    '--','worker','scripts/pc-writer']);
  let provenanceVerified=false;
  if(publisher){
    const necessary=[
      'scripts/pc-writer/EARNINGS_R4_C_D1_DUAL_SOURCE_ONCE.mjs',
      'scripts/pc-writer/EARNINGS_R4_C_D1_DUAL_SOURCE_GATES.mjs',
      'scripts/pc-writer/EARNINGS_R4_C_READ_MODEL_PREVIEW_READONLY.mjs',
      'worker/earnings-companion-c-r4.mjs',
    ];
    git(absolute,['ls-files','--error-unmatch','--',...necessary]);
    const fetchedMain=git(absolute,['rev-parse','refs/remotes/origin/main']);
    provenanceVerified=fetchedMain===sha;
  }
  return {root:path.normalize(realpath(absolute)),sha,branch,
    remoteMatch:REPO.test(remote),clean:changed.length===0,provenanceVerified};
}

export function validateD1DualSource({config,publisher,operational}) {
  if(config?.collectionTarget!=='pc'||config.enabled!==true||!SHA.test(config.source??''))
    throw Error('EARNINGS_C_PC_CONFIG_NOT_APPROVED');
  if(!SHA.test(publisher?.sha??'')||publisher.branch!=='main'
    ||!publisher.remoteMatch||!publisher.clean||!publisher.provenanceVerified)
    throw Error('EARNINGS_C_PUBLISHER_SOURCE_NOT_MAIN_CLEAN');
  if(!SHA.test(operational?.sha??'')||!operational.remoteMatch||!operational.clean)
    throw Error('EARNINGS_C_OPERATIONAL_SOURCE_NOT_CLEAN');
  if(operational.sha!==config.source)
    throw Error('EARNINGS_C_OPERATIONAL_SOURCE_SHA_MISMATCH');
  if(!publisher.root||!operational.root||publisher.root.toLowerCase()===operational.root.toLowerCase())
    throw Error('EARNINGS_C_PUBLISHER_NOT_ISOLATED');
  return Object.freeze({publisherSha:publisher.sha,approvedOperationalSha:operational.sha});
}
