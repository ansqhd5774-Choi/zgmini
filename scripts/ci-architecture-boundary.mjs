// #6 Architecture CI: static direct-import boundary for Cloudflare/public UI vs PC operations.
// No code execution, external dependency, data access, or modification of source files.
import ts from 'typescript';
import {readdir,readFile} from 'node:fs/promises';
import {posix,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

export const ROOTS=Object.freeze(['app','components','hooks','worker']);
export const FORBIDDEN=Object.freeze([
 'scripts/pc-writer','scripts/pc-controller','controller'
]);
const EXT=/\.(?:[cm]?[jt]s|tsx|jsx)$/;
const normalize=value=>posix.normalize(value.replaceAll('\\','/'));

export function checkDirectImport(fromFile,specifier){
 if(typeof fromFile!=='string'||typeof specifier!=='string')throw Error('CI_ARCH_IMPORT_ARGUMENTS');
 const from=normalize(fromFile);
 if(!ROOTS.some(root=>from.startsWith(root+'/')))return null;
 let target;
 if(specifier.startsWith('@/')) target=normalize(specifier.slice(2));
 else if(specifier.startsWith('./')||specifier.startsWith('../'))
  target=normalize(posix.join(posix.dirname(from),specifier));
 else return null; // npm packages, node: and cloudflare:workers are not repo paths
 if(target.startsWith('../')||target==='..'||target.startsWith('/'))return null;
 const prefix=FORBIDDEN.find(name=>target===name||target.startsWith(name+'/'));
 return prefix?{rule:'public-runtime-must-not-import-private-pc',file:from,target}:null;
}

export function inspectArchitectureSource(source,fromFile){
 if(typeof source!=='string'||typeof fromFile!=='string')throw Error('CI_ARCH_SOURCE_INVALID');
 const scriptKind=/\.tsx$|\.jsx$/.test(fromFile)?ts.ScriptKind.TSX:ts.ScriptKind.TS;
 const ast=ts.createSourceFile(fromFile,source,ts.ScriptTarget.Latest,true,scriptKind);
 const issues=[];
 const seen=new Set();
 function examine(specifier,node){
  const violation=checkDirectImport(fromFile,specifier);
  if(!violation)return;
  const line=ast.getLineAndCharacterOfPosition(node.getStart(ast)).line+1;
  const key=violation.file+':'+line+':'+violation.target;
  if(seen.has(key))return;
  seen.add(key);
  issues.push({...violation,line});
 }
 function visit(node){
  if((ts.isImportDeclaration(node)||ts.isExportDeclaration(node))&&
   node.moduleSpecifier&&ts.isStringLiteralLike(node.moduleSpecifier))
   examine(node.moduleSpecifier.text,node);
  if(ts.isImportEqualsDeclaration(node)&&ts.isExternalModuleReference(node.moduleReference)&&
   node.moduleReference.expression&&ts.isStringLiteralLike(node.moduleReference.expression))
   examine(node.moduleReference.expression.text,node);
  if(ts.isCallExpression(node)&&node.arguments.length===1&&
   ts.isStringLiteralLike(node.arguments[0])&&
   (node.expression.kind===ts.SyntaxKind.ImportKeyword||
    (ts.isIdentifier(node.expression)&&node.expression.text==='require')))
   examine(node.arguments[0].text,node);
  ts.forEachChild(node,visit);
 }
 visit(ast);
 return issues;
}

export async function auditArchitecture(root){
 const issues=[];
 let inspectedFiles=0;
 const crawl=async(relative)=>{
  const entries=await readdir(join(root,relative),{withFileTypes:true});
  entries.sort((a,b)=>a.name.localeCompare(b.name,'en'));
  for(const entry of entries){
   const next=relative+'/'+entry.name;
   if(entry.isDirectory())await crawl(next);
   else if(entry.isFile()&&EXT.test(entry.name)){
    inspectedFiles++;
    const source=await readFile(join(root,next),'utf8');
    issues.push(...inspectArchitectureSource(source,next));
   }
  }
 };
 for(const prefix of ROOTS){
  await crawl(prefix);
 }
 return {schemaVersion:1,scope:'direct local module imports from app/components/hooks/worker',
  inspectedFiles,forbiddenTargets:[...FORBIDDEN],violations:issues};
}
export async function main(){
 if(process.argv.length!==2||process.env.CI!=='true')throw Error('CI_ARCH_CI_ONLY');
 const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
 const result=await auditArchitecture(root);
 console.log('CI_ARCH_BOUNDARY '+JSON.stringify({
  inspectedFiles:result.inspectedFiles,forbiddenTargets:result.forbiddenTargets,
  violations:result.violations
 }));
 if(result.violations.length)throw Error('CI_ARCH_PRIVATE_PC_IMPORT_DETECTED');
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))
 main().catch(error=>{console.error(error.message);process.exitCode=1;});
