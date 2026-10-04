import path from 'node:path';
export function candidateImportBoundary(root) {
  const envAdapter=path.resolve(root,'worker/candidate-env.ts').replaceAll('\\','/');
  const storeAdapter=path.resolve(root,'worker/candidate-market-operational-store.mjs').replaceAll('\\','/');
  const application=path.resolve(root).replaceAll('\\','/')+'/';
  return {name:'candidate-read-only-import-boundary',enforce:'pre',transform(code,id) {
    const file=id.split('?')[0].replaceAll('\\','/');
    if(!file.startsWith(application) || file===envAdapter || file===storeAdapter || file.includes('/node_modules/')) return null;
    const needsEnv=code.includes('cloudflare:workers');
    const needsStore=file.includes('/app/') && /from\s*(['"])(?:\.\.\/)+worker\/market-operational-store\.mjs\1/.test(code);
    if(!needsEnv&&!needsStore)return null;
    let rewritten=code;
    if(needsEnv){
      rewritten=rewritten.replace(/import\s*\{\s*env(?:\s+as\s+\w+)?\s*\}\s*from\s*(['"])cloudflare:workers\1/g,m=>m.replace(/(['"])cloudflare:workers\1/,JSON.stringify(envAdapter)));
      if(rewritten.includes('cloudflare:workers')) throw new Error(`Unmediated candidate binding import: ${file}`);
    }
    if(needsStore){
      rewritten=rewritten.replace(/from\s*(['"])(?:\.\.\/)+worker\/market-operational-store\.mjs\1/g,`from ${JSON.stringify(storeAdapter)}`);
      if(/from\s*(['"])(?:\.\.\/)+worker\/market-operational-store\.mjs\1/.test(rewritten)) throw new Error(`Unmediated candidate operational store import: ${file}`);
    }
    return {code:rewritten,map:null};
  }};
}
