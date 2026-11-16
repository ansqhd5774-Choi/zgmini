import fs from 'node:fs';import path from 'node:path';import {fileURLToPath,pathToFileURL} from 'node:url';
import ts from 'typescript';
let sequence=0;
export async function loadRetiredRoute(url,env={}){
 const file=fileURLToPath(url);
 let source=fs.readFileSync(file,'utf8')
  .replace(/import\s*\{\s*env\s*\}\s*from\s*['"]cloudflare:workers['"];?/,
   'const env=globalThis.__zgminiRetirementTestEnv;')
  .replace(/from\s+(['"])(\.\.?\/[^'"]+)\1/g,
   (_,quote,relative)=>'from '+quote+pathToFileURL(path.resolve(path.dirname(file),relative)).href+quote);
 globalThis.__zgminiRetirementTestEnv=env;
 source=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
 return import('data:text/javascript;base64,'+Buffer.from(source+'\n// isolated='+sequence++).toString('base64'));
}
