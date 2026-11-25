// Validate the exact push/PR history range before invoking the pinned Gitleaks CLI.
// Never turn an unresolvable or unrelated git range into a successful scan.
import {readFileSync,appendFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const SHA=/^[a-f0-9]{40}$/i;
const ZERO='0'.repeat(40);
function need(ok,code){if(!ok)throw Error(code);}
export function chooseSecretRange(eventName,event,sha){
  need(SHA.test(sha),'SECRET_HEAD_INVALID');
  let before=null,after=sha;
  if(eventName==='push'){
    need(SHA.test(event?.after)&&event.after===sha,'SECRET_PUSH_HEAD_MISMATCH');
    before=event.before;
    need(SHA.test(before),'SECRET_PUSH_BEFORE_INVALID');
  }else if(eventName==='pull_request'){
    before=event?.pull_request?.base?.sha;
    const eventHead=event?.pull_request?.head?.sha;
    // GitHub PR webhook head metadata can lag a later checked-out synchronize
    // commit. Scan the exact checkout SHA, never the stale webhook SHA.
    need(SHA.test(before)&&SHA.test(eventHead),'SECRET_PR_REFS_INVALID');
    after=sha;
    need(event?.pull_request?.head?.repo?.full_name===event?.repository?.full_name,
      'SECRET_PR_UNTRUSTED_FORK');
  }else if(eventName!=='workflow_dispatch')throw Error('SECRET_EVENT_UNSUPPORTED');
  // New-branch/root history: inspect the entire reachable history of HEAD.
  // Two-dot ranges also traverse second-parent merged commits.
  return !before||before===ZERO?after:before+'..'+after;
}
export function checkSecretRange(range,git=(args)=>execFileSync('git',args,{encoding:'utf8',stdio:['ignore','pipe','pipe']})){
  need(/^[a-f0-9]{40}(?:\.\.[a-f0-9]{40})?$/i.test(range),'SECRET_RANGE_INVALID');
  const parts=range.split('..');
  for(const id of parts){
    need(git(['cat-file','-t',id]).trim()==='commit','SECRET_OBJECT_NOT_COMMIT');
  }
  // The range must actually include the checked-out head and at least one commit.
  const selected=git(['rev-list','--max-count=1',range]).trim();
  need(SHA.test(selected),'SECRET_RANGE_EMPTY');
  return range;
}
export function main(env=process.env){
  const event=JSON.parse(readFileSync(env.GITHUB_EVENT_PATH,'utf8'));
  const checkedOut=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
  if(checkedOut!==env.ZGMINI_SCAN_HEAD){
    console.error('SECRET_CHECKOUT_DIAGNOSTIC '+JSON.stringify({
      checkoutRef:SHA.test(checkedOut)?checkedOut:'INVALID',
      eventRef:SHA.test(env.ZGMINI_SCAN_HEAD)?env.ZGMINI_SCAN_HEAD:'INVALID'
    }));
    throw Error('SECRET_CHECKOUT_HEAD_MISMATCH');
  }
  const range=checkSecretRange(chooseSecretRange(env.GITHUB_EVENT_NAME,event,env.ZGMINI_SCAN_HEAD));
  need(env.GITHUB_OUTPUT,'SECRET_OUTPUT_UNAVAILABLE');
  appendFileSync(env.GITHUB_OUTPUT,'log_opts='+range+'\n');
  console.log('SECRET_RANGE_VALIDATED (SHA refs only; merged parents included)');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  try{main();}catch(error){console.error(error.message.startsWith('SECRET_')?error.message:'SECRET_RANGE_UNVERIFIED');process.exitCode=1;}
}
