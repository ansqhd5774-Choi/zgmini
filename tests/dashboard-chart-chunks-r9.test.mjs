import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
function resolveModule(from,specifier){
 const stem=specifier.startsWith('@/')?path.join(root,specifier.slice(2)):specifier.startsWith('.')?path.resolve(path.dirname(from),specifier):null;
 if(!stem)return null;
 return [stem,...['.tsx','.ts','.mjs','.js','/index.tsx','/index.ts'].map(ext=>stem+ext)].find(p=>fs.existsSync(p)&&fs.statSync(p).isFile());
}
test('anonymous dashboard static graph excludes Recharts and the split renderers',()=>{
 const visited=new Set(),pending=['app/page.tsx','app/layout.tsx'].map(p=>[path.join(root,p),[p]]);
 while(pending.length){
  const [file,chain]=pending.pop();if(visited.has(file))continue;visited.add(file);
  const text=fs.readFileSync(file,'utf8');
  // Only static value imports/re-exports; import type and lazy import() do not
  // belong to the initial runtime graph.
  for(const match of text.matchAll(/(?:^|\n)\s*(?:import\s*(?!type\b|\()(?:[^;'"`]*?\bfrom\s*)?|export\s*(?!type\b)(?:\*|\{[^}]*\})\s*from\s*)['"]([^'"]+)['"]/g)){
   const name=match[1];assert.notEqual(name,'recharts',chain.join(' -> '));
   const resolved=resolveModule(file,name);if(resolved)pending.push([resolved,[...chain,path.relative(root,resolved)]]);
  }
 }
 for(const name of ['dashboard-summary-chart.tsx','dashboard-secondary-plots.tsx','market-fear-greed-chart-renderer.tsx','korea-composite-plot.tsx']){
  assert.equal([...visited].some(file=>file.endsWith(name)),false,name+' must remain lazy');
 }
});
