import {execFileSync} from 'node:child_process';
export function candidateBranchGate(){
 const expected='main';
 const local=execFileSync('git',['branch','--show-current'],{encoding:'utf8'}).trim();
 const ci=process.env.WORKERS_CI_BRANCH??process.env.CF_PAGES_BRANCH??process.env.GITHUB_REF_NAME??null;
 if(ci&&ci!==expected)throw Error('Cloudflare CI branch rejected');
 if(local&&local!==expected)throw Error('Cloudflare branch rejected');
 if(!local&&ci!==expected)throw Error('Detached build requires WORKERS_CI_BRANCH=main');
}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/candidate-branch-gate.mjs')){candidateBranchGate();console.log('PASS: Cloudflare main branch gate');}
