import {execFileSync} from 'node:child_process';
export function candidateBranchGate(){
 const expected='migration/cloudflare-workers-r1';const local=execFileSync('git',['branch','--show-current'],{encoding:'utf8'}).trim();
 const ci=process.env.WORKERS_CI_BRANCH;
 if(ci&&ci!==expected)throw Error('Candidate CI branch rejected');
 if(local!==expected&&!(local===''&&ci===expected))throw Error('Candidate branch rejected');
}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/candidate-branch-gate.mjs')){candidateBranchGate();console.log('PASS: candidate branch gate');}
