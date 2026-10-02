import path from 'node:path';
export function candidateImportBoundary(root) {
  const adapter=path.resolve(root,'worker/candidate-env.ts').replaceAll('\\','/');
  const application=path.resolve(root).replaceAll('\\','/')+'/';
  return {name:'candidate-read-only-import-boundary',enforce:'pre',transform(code,id) {
    const file=id.split('?')[0].replaceAll('\\','/');
    if(!file.startsWith(application) || file===adapter || file.includes('/node_modules/') || !code.includes('cloudflare:workers')) return null;
    const rewritten=code.replace(/import\s*\{\s*env(?:\s+as\s+\w+)?\s*\}\s*from\s*(['"])cloudflare:workers\1/g,m=>m.replace(/(['"])cloudflare:workers\1/,JSON.stringify(adapter)));
    if(rewritten.includes('cloudflare:workers')) throw new Error(`Unmediated candidate binding import: ${file}`);
    return {code:rewritten,map:null};
  }};
}
