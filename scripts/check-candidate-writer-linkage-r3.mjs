import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import ts from 'typescript';

export function checkWriterLinkage(root='dist/server'){
 const modules=new Map();
 const walk=dir=>{for(const e of readdirSync(dir,{withFileTypes:true})){const p=resolve(dir,e.name);if(e.isDirectory())walk(p);else if(/\.m?js$/.test(e.name)){
  const tree=ts.createSourceFile(p,readFileSync(p,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
  const imports=new Map(),exports=new Map(),functions=new Set(),dynamic=[];
  for(const n of tree.statements){
   if(ts.isImportDeclaration(n)&&n.importClause?.namedBindings&&ts.isNamedImports(n.importClause.namedBindings))for(const x of n.importClause.namedBindings.elements)imports.set(x.name.text,{from:n.moduleSpecifier.text,name:(x.propertyName??x.name).text});
   if(ts.isFunctionDeclaration(n)&&n.name)functions.add(n.name.text);
   if(ts.isExportDeclaration(n)&&n.exportClause&&ts.isNamedExports(n.exportClause))for(const x of n.exportClause.elements)exports.set(x.name.text,{name:(x.propertyName??x.name).text,from:n.moduleSpecifier?.text});
  }
  const visit=n=>{if(ts.isCallExpression(n)&&n.expression.kind===ts.SyntaxKind.ImportKeyword&&ts.isStringLiteral(n.arguments[0]))dynamic.push(n.arguments[0].text);ts.forEachChild(n,visit)};visit(tree);
  modules.set(p,{imports,exports,functions,dynamic});
 }}};walk(resolve(root));
 const target=(p,s)=>resolve(dirname(p),s);
 function callable(p,name,seen=new Set()){
  const id=p+':'+name;if(seen.has(id))return false;seen.add(id);
  const m=modules.get(p),x=m?.exports.get(name);if(!x)return false;
  if(x.from)return callable(target(p,x.from),x.name,seen);
  if(m.functions.has(x.name))return true;
  const i=m.imports.get(x.name);return !!i?.from.startsWith('.')&&callable(target(p,i.from),i.name,seen);
 }
 const writers=[...modules].filter(([p])=>/candidate-writer-r1-[^/\\]+\.js$/.test(p));assert.equal(writers.length,1,'compiled writer missing/ambiguous');
 const [writer,w]=writers[0];const bridges=w.dynamic.filter(p=>p.includes('candidate-writer-runtime-r1-'));assert.equal(bridges.length,1,'compiled runtime bridge missing');
 const bridge=target(writer,bridges[0]);
 for(const name of ['runPublicFeeds','runMarketOperationalRefresh','refreshKoreaRev7'])assert(callable(bridge,name),`compiled callable unresolved: ${name}`);
 for(const [p,m] of modules)for(const s of m.dynamic)if(s.startsWith('.'))assert(modules.has(target(p,s)),`missing dynamic chunk: ${s}`);
 return {modules:modules.size,targets:3};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)console.log('PASS: compiled writer linkage',checkWriterLinkage());
