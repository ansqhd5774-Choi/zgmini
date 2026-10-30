// Read-only local source inventory. Does not fetch, calculate, write D1,
// register themes/tasks, or infer current Production from historical JSON.
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {R32} from './theme-platform.mjs';
export function inspectThemePlatform({root=fileURLToPath(new URL('../../',import.meta.url))}={}){
 const read=name=>JSON.parse(fs.readFileSync(path.join(root,name),'utf8'));
 const historic=read('config/theme-data-registry.json');
 const research=read('config/theme-nine-r20-approved-candidates.json');
 const researched=new Map(research.groups.map(g=>[g.theme,g]));
 const themes=historic.themes.map(t=>{
  const group=researched.get(t.label);
  return {id:t.id,label:t.label,legacyRegistryMethodology:t.methodologyVersion,
   targetMethodology:R32,researchCandidates:group?.tickers.map(r=>r.ticker)??null,
   historicalRegisteredSymbols:t.symbols,sourceRegistryIsHistorical:true,
   productionStatus:'NOT_PROBED',researchCoverage:group?'R20_RESEARCH_PRESENT':'NOT_IN_R20',
   bindings:t.repository};
 });
 const sourceFiles=['scripts/pc-writer/theme-config-registry.mjs','scripts/pc-writer/theme-config-score.mjs',
  'scripts/pc-writer/theme-config-tool.mjs','worker/theme-configured-public.mjs'];
 const checks=sourceFiles.map(file=>{
  const source=fs.readFileSync(path.join(root,file),'utf8');
  return {file,sha256:createHash('sha256').update(source).digest('hex'),findings:[
   ...(/etfs\.length\s*(?:===|!==)\s*2/.test(source)?['PAIR_ONLY_CONTRACT']:[]),
   ...(/LIMIT 200/.test(source)&&!source.includes('.bind(cursor)')?['PUBLIC_THEME_TOTAL_TRUNCATION']:[]),
   ...(/ADAPTIVE_R2_PAIR_R3/.test(source)?['PAIR_PROFILE_BOUND']:[]),
  ]};
 });
 return {status:'SOURCE_INVENTORY_NOT_RUNTIME_PROOF',themes,
  researchOnly:research.groups.filter(g=>!historic.themes.some(t=>t.label===g.theme)).map(g=>g.theme),
  checks,providerCalls:0,d1Queries:0,d1Writes:0,schedulerWrites:0};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv.length!==3||process.argv[2]!=='--readonly'){console.error('Usage: --readonly');process.exitCode=2;}
 else console.log(JSON.stringify(inspectThemePlatform(),null,2));
}
