import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
const folders=['app','components','lib','worker'];
const files=folders.flatMap(folder=>fs.readdirSync(path.join(root,folder),{recursive:true,withFileTypes:true})
 .filter(f=>f.isFile()&&/\.(tsx?|jsx?|mjs)$/.test(f.name))
 .map(f=>path.relative(root,path.join(f.parentPath??f.path,f.name)).replaceAll('\\','/')));
const ui=files.filter(f=>f.startsWith('components/ui/'));
const css=fs.readFileSync(path.join(root,'app/globals.css'),'utf8');
const excluded=[...css.matchAll(/@source not "\.\.\/(components\/ui\/[^"\n]+)";/g)].map(m=>m[1]);
const imports=new Map(files.map(file=>{
 const source=fs.readFileSync(path.join(root,file),'utf8');
 const result=[];
 for(const m of source.matchAll(/(?:from\s*|import\s*\(?\s*)["']([^"']+)["']/g)){
  const value=m[1],target=value.startsWith('@/')?value.slice(2):value.startsWith('.')?path.posix.normalize(path.posix.join(path.posix.dirname(file),value)):value;
  const found=ui.find(f=>[target,target+'.tsx',target+'.ts',target+'/index.tsx',target+'/index.ts'].includes(f));
  if(found)result.push(found);
 }
 return [file,result];
}));

test('every imported UI module and its transitive UI dependencies remain class sources',()=>{
 const used=new Set(files.filter(f=>!f.startsWith('components/ui/')).flatMap(f=>imports.get(f)));
 for(let size=-1;size!==used.size;){size=used.size;for(const f of used)for(const d of imports.get(f)??[])used.add(d);}
 const conflicts=excluded.filter(f=>used.has(f));
 assert.deepEqual(conflicts,[],`A newly imported UI module must be restored as a Tailwind source: remove its @source not entry. ${conflicts.join(', ')}`);
 assert.ok(used.size>0,'Runtime UI imports must be discovered');
});

test('exclusions are existing unimported UI files; runtime folders remain auto-detected',()=>{
 assert.ok(excluded.length>0);
 assert.equal(new Set(excluded).size,excluded.length);
 for(const file of excluded)assert.ok(ui.includes(file),`Stale source exclusion: ${file}`);
 assert.doesNotMatch(css,/@import "tailwindcss" source\(none\)/);
 for(const folder of folders)assert.ok(!css.includes(`@source not "../${folder}";`),`Runtime folder must remain a source: ${folder}`);
});
