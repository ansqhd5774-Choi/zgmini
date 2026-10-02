import ts from 'typescript';import fs from 'node:fs';import {createHash} from 'node:crypto';
const routes={recession:'recession',liquidityCrisis:'liquidity-crisis',creditRisk:'credit-risk',earningsRecession:'earnings-recession',assetBubble:'asset-bubble',debtRisk:'debt-risk',supplyShock:'supply-shock'};
fs.mkdirSync('worker/projection-builders',{recursive:true});const manifest=[];
function pureResponse(s){const ast=ts.createSourceFile('input.ts',s,ts.ScriptTarget.Latest,true);const edits=[];function walk(n){if(ts.isCallExpression(n)&&n.expression.getText(ast)==='Response.json')edits.push([n.getStart(ast),n.end,n.arguments[0].getText(ast)]);ts.forEachChild(n,walk)}walk(ast);for(const [a,b,v] of edits.sort((x,y)=>y[0]-x[0]))s=s.slice(0,a)+v+s.slice(b);return s;}
for(const [id,slug] of Object.entries(routes)){
 const file='app/api/'+slug+'-detail/route.ts',original=fs.readFileSync(file,'utf8');let s=original.replace(/^import.*(?:cloudflare:workers|market-operational-store|sec-earnings-e1-r4-provider).*\r?\n/gm,'').replaceAll('../../../','../../');
 s=s.replace(/export async function GET\([^)]*\)/,'export function buildProjection({inputs,snapshot,publicSnapshot,e1,nowIso}:any)');
 s=s.replace(/ const store=marketOperationalStore\(env.DB\);\r?\n/,'').replace(/ const \[(?:inputs,snapshot|inputs,publicSnapshot)\]=await Promise.all\(\[readStoredMarketInputs\(store\),store.readScore\(\)\]\);\r?\n/,'').replace(/ const snapshot=await store.readScore\(\);\r?\n/,'').replace(/ const e1=await readEarningsE1R4StoredScore\(\{asOf,db:env.DB\}\);\r?\n/,'');
 if(id==='recession')s=s.replace('{inputs,snapshot,publicSnapshot,e1,nowIso}:any','{inputs,publicSnapshot,nowIso}:any');
 s=s.replaceAll('new Date().toISOString().slice(0,10)','nowIso.slice(0,10)');s=pureResponse(s);
 if(/\benv\.DB|\bawait\b|readStoredMarketInputs/.test(s))throw Error('Non-pure builder '+id);
 fs.writeFileSync('worker/projection-builders/'+id+'.ts',s);manifest.push({id,file,sourceSha256:createHash('sha256').update(original).digest('hex')});
}
const inf=fs.readFileSync('worker/inflation-r2-reader.mjs','utf8');const ast=ts.createSourceFile('x.mjs',inf,ts.ScriptTarget.Latest,true);const helpers=ast.statements.filter(n=>ts.isImportDeclaration(n)?!n.getText(ast).includes('loadStoredInflationPitSeries'):ts.isVariableStatement(n)||ts.isFunctionDeclaration(n)&&['monthEnds','partial'].includes(n.name?.text)).map(n=>n.getText(ast)).join('\n').replaceAll('../lib/','../../lib/').replaceAll('from "./','from "../');
const start=inf.indexOf('  if(pit.status!=='),end=inf.indexOf('\nexport const INFLATION_R2_READER_CONTRACT');const body=inf.slice(start,end).trim();
fs.writeFileSync('worker/projection-builders/inflation.mjs',helpers+'\nexport function buildProjection({pit,pc1,asOf}){\n'+body+'\n');
const loader=inf.slice(0,inf.indexOf('function monthEnds')).replace('async function loadPc1Series','export async function loadPc1Series');fs.writeFileSync('worker/projection-inflation-inputs.mjs',loader);
manifest.push({id:'inflation',file:'worker/inflation-r2-reader.mjs',sourceSha256:createHash('sha256').update(inf).digest('hex')});
const kfg=fs.readFileSync('worker/korea-funds.mjs','utf8');let k=kfg.slice(0,kfg.indexOf('const response='));k=k.replaceAll("from './","from '../");
k=k.replace(/export async function defaultLoadProgress[\s\S]*?\nfunction unavailable/,'function unavailable');
k=k.replace('export async function publicSnapshot(env,context={})','export function buildProjection({progress,rawRows,nowIso})');
k=k.replace(/  const loadProgress=.*\r?\n|  const loadRows=.*\r?\n|  const progress=await loadProgress\(env\);\r?\n|  const rawRows=await loadRows\(env,PUBLIC_HISTORY_LIMIT\);\r?\n/g,'');
k=k.replace('const clock=context.clock??(()=>new Date(Date.now()));','const clock=()=>new Date(nowIso);');
k=k.replace('export function buildProjection','function buildProjectionRaw');
k+="\nexport function buildProjection(input){const privateKeys=new Set(['weights','weight','weightedContribution','direction','briefMethodology','briefExplanation']);return JSON.parse(JSON.stringify(buildProjectionRaw(input),(key,value)=>privateKeys.has(key)?undefined:value));}\n";
fs.writeFileSync('worker/projection-builders/koreaFearGreed.mjs',k);manifest.push({id:'koreaFearGreed',file:'worker/korea-funds.mjs',sourceSha256:createHash('sha256').update(kfg).digest('hex')});
fs.writeFileSync('docs/migration/d1-r52/BUILDER_SOURCE_MANIFEST.json',JSON.stringify(manifest,null,2));
