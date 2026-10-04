import {execFileSync} from 'node:child_process';
const protectedPaths=['app','lib','db','worker/index.ts','middleware.ts'];
const tree=Object.fromEntries(protectedPaths.map(path=>[
 path,
 execFileSync('git',['rev-parse',`HEAD:${path}`],{encoding:'utf8'}).trim()
]));
execFileSync('git',['diff','--quiet','HEAD','--',...protectedPaths]);
execFileSync('git',['diff','--cached','--quiet','HEAD','--',...protectedPaths]);
console.log('PASS: current HEAD protected source unchanged during candidate build',JSON.stringify(tree));
