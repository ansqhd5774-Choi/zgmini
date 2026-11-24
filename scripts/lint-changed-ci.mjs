// Run the repository's existing ESLint against changed source paths only.
// The full legacy audit remains available as "npm run lint".
import {execFileSync, spawnSync} from 'node:child_process';

const SHA=/^[0-9a-f]{40}$/;
const SOURCE=/\.(?:[cm]?[jt]s|[jt]sx)$/i;
// GitHub workflows, top-level config and other source directories also carry
// executable code. Scope the gate by changed source extension, not a stale
// hard-coded directory allowlist; continue excluding generated dependencies.
const GENERATED=/^(?:node_modules|dist|out|build|coverage|\.next|\.wrangler|\.sites-runtime|\.git)\//;

export function selectChangedSource(paths){
  return [...new Set(paths.filter(p=>typeof p==='string'
    && p.length>0 && !p.startsWith('/') && !p.includes('\\')
    && !p.split('/').some(segment=>segment==='..'||segment==='.')
    && SOURCE.test(p) && !GENERATED.test(p)))].sort();
}
export function chooseDiffBase({event, before, headParent}){
  if(event==='pull_request')return headParent;
  if(event==='push'&&SHA.test(before??'')&&!/^0+$/.test(before))return before;
  if(event==='workflow_dispatch')return headParent;
  throw Error('LINT_BASE_UNAVAILABLE');
}
export function lintChanged({event=process.env.GITHUB_EVENT_NAME,
  before=process.env.GITHUB_EVENT_BEFORE}={}){
  const git=args=>execFileSync('git',args,{encoding:'utf8',maxBuffer:8*1024*1024}).trim();
  const head=git(['rev-parse','HEAD']);
  const parent=git(['rev-parse','HEAD^1']);
  const base=chooseDiffBase({event,before,headParent:parent});
  if(!SHA.test(base)||!SHA.test(head))throw Error('LINT_SHA_INVALID');
  const changed=execFileSync('git',['diff','--name-only','--diff-filter=ACMR','-z',
    base,head],{encoding:'utf8',maxBuffer:8*1024*1024}).split('\0').filter(Boolean);
  const paths=selectChangedSource(changed);
  console.log(`Changed-source ESLint: ${paths.length} file(s); baseline=${base.slice(0,12)}`);
  if(!paths.length)return 0;
  const args=['scripts/sites-env.sh','--','./node_modules/.bin/eslint',
    '--ignore-pattern','dist','--ignore-pattern','.next','--',...paths];
  const result=spawnSync('bash',args,{stdio:'inherit',env:process.env});
  if(result.error)throw result.error;
  return result.status??1;
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
  process.exitCode=lintChanged();
}
