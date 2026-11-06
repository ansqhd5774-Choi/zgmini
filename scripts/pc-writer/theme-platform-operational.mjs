// One logical registry for existing public themes and configuration-based
// additions. This is a private planning/batch bridge: it never transfers D1
// writer ownership or treats research candidate evidence as publication rights.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {digest,listRegistered,ensure} from './theme-config-registry.mjs';
import {R32,FORMULAS,sourcePlan,validateThemeRegistry,runThemeBatch} from './theme-platform.mjs';

export const PAIR50='ETF_ONLY_T40_R20_V40_PAIR50';
export const SPACE_R32='ETF_ONLY_T40_R20_V40_ADAPTIVE_R2_AUM_DATE_ELIGIBLE_SINGLE_R32';
export const CONFIG_PAIR='ADAPTIVE_R2_PAIR_R3';
// These are approved *existing calculator ownership bindings*, not substitutes
// for executing the calculators or proof of authorization to publish.
export const OPERATIONAL_METHODS=Object.freeze({
 ...FORMULAS,
 [PAIR50]:Object.freeze({owner:'theme-data-center-power-r1'}),
 [SPACE_R32]:Object.freeze({owner:'theme-space-satellite-operational-r28'}),
 [CONFIG_PAIR]:Object.freeze({owner:'theme-config-score'}),
});
const here=fileURLToPath(new URL('../../',import.meta.url));
const publicBindings='config/theme-public-operational-bindings.json';
const researchCandidates='config/theme-nine-r20-approved-candidates.json';
const historicBindings='config/theme-data-registry.json';
const spaceRoster='scripts/pc-writer/theme-space-satellite-r26-approved-roster.json';
const required=(ok,code)=>ensure(ok,code);
const unique=rows=>new Set(rows).size===rows.length;
const readSource=(root,relative)=>{
 const base=fs.realpathSync(root),file=path.resolve(base,relative);
 required(file.startsWith(base+path.sep)&&fs.lstatSync(file).isFile()&&
  !fs.lstatSync(file).isSymbolicLink(),'THEME_OPERATIONAL_SOURCE_REDIRECT');
 return fs.readFileSync(file);
};

export function loadOperationalSources({sourceRoot=here}={}){
 const bindings=JSON.parse(readSource(sourceRoot,publicBindings));
 const rosterBytes=readSource(sourceRoot,researchCandidates);
 const candidates=JSON.parse(rosterBytes);
 const historicBytes=readSource(sourceRoot,historicBindings);
 const historic=JSON.parse(historicBytes);
 const spaceBytes=readSource(sourceRoot,spaceRoster);
 return {bindings,candidates,historic,proofs:{r37:digest(rosterBytes),
  'data-center':digest(historicBytes),space:digest(spaceBytes)}};
}

const inputs=family=>({
 confirmed:{adapter:'existing-gmh-stored',priceMode:'RAW_UNADJUSTED_1H_NOT_OFFICIAL_CLOSE'},
 provisional:{adapter:family==='r37'?'existing-r51-r88-stored':'existing-marketparquet-r8-stored',
  priceMode:family==='r37'?'EXISTING_R51_R88_VERIFIED_PROVISIONAL':'MARKETPARQUET_ETF_DAILY_SPLIT_ADJUSTED'},
});

export function buildOperationalRegistry({sources,registrations=[]}={}){
 const {bindings,candidates,historic,proofs}=sources??loadOperationalSources();
 required(bindings?.schema==='ZGMINI_THEME_PUBLIC_OPERATIONAL_BINDINGS_V1'&&
  bindings.publicationAuthority==='EXISTING_WRITERS_ONLY_NO_CUTOVER'&&
  Array.isArray(bindings.themes)&&bindings.families&&
  candidates?.schema==='zgmini.theme-nine.r20-approved-three-gate-candidates.v1'&&
  Array.isArray(candidates.groups)&&Array.isArray(historic?.themes),
  'THEME_OPERATIONAL_BINDING_SCHEMA');
 const candidateByLabel=new Map(candidates.groups.map(g=>[g.theme,g]));
 const historicById=new Map(historic.themes.map(t=>[t.id,t]));
 required(unique(bindings.themes.map(t=>t.id))&&unique(bindings.themes.map(t=>t.label)),
  'THEME_OPERATIONAL_PUBLIC_ID_DUPLICATE');
 const inherited=bindings.themes.map(spec=>{
  const family=bindings.families[spec.family];
  required(family&&typeof family.confirmed==='string'&&
   typeof family.provisional==='string'&&typeof family.sourceRoot==='string',
   'THEME_OPERATIONAL_FEED_BINDING');
  const group=spec.rosterSource==='r20-group'?candidateByLabel.get(spec.label):null;
  const etfs=group?.tickers?.map(row=>row.ticker)??spec.etfs;
  required(Array.isArray(etfs)&&etfs.length>0&&
   (spec.rosterSource!=='r20-group'||spec.family==='r37')&&
   !Object.hasOwn(spec,'methodologyVersion')&&
   Object.hasOwn(OPERATIONAL_METHODS,family.methodologyVersion),
   'THEME_OPERATIONAL_ROSTER_OR_METHOD');
  required(spec.family==='r37'?family.methodologyVersion===R32:
   spec.family==='data-center'?family.methodologyVersion===PAIR50:
   spec.family==='space'&&family.methodologyVersion===SPACE_R32,
   'THEME_OPERATIONAL_METHOD_BINDING_DRIFT');
  if(spec.family==='data-center'){
   const old=historicById.get(spec.id);
   required(old?.label===spec.label&&old.methodologyVersion===PAIR50&&
    JSON.stringify(old.symbols)===JSON.stringify(etfs),'THEME_OPERATIONAL_PAIR50_DRIFT');
  }
  return {id:spec.id,label:spec.label,enabled:true,public:true,
   methodologyVersion:family.methodologyVersion,etfs,benchmark:'SPY',
   // Evidence hashes identify existing inputs, never authorize a new writer.
   approvalSha256:proofs[spec.family],inputs:inputs(spec.family),
   publication:{confirmed:`logical:${spec.id}:confirmed`,
    provisional:`logical:${spec.id}:provisional`},
   operational:{owner:'existing-writer',family:spec.family,sourceRoot:family.sourceRoot,
    physicalFeeds:{confirmed:family.confirmed,provisional:family.provisional},
    evidenceScope:'EXISTING_INPUT_PROVENANCE_NOT_PUBLICATION_GRANT'}};
 });
 const configured=registrations.map(r=>{
  const d=r.definition;
  required(d&&d.schema?.startsWith('ZGMINI_THEME_CONFIG_V')&&
   typeof r.sha256==='string'&&/^[a-f0-9]{64}$/.test(r.sha256),
   'THEME_OPERATIONAL_REGISTERED_CONTRACT');
  return {id:d.id,label:d.label,enabled:true,public:false,
   methodologyVersion:d.profile,etfs:[...d.etfs],benchmark:d.benchmark,
   approvalSha256:d.selectionEvidence?.sha256??r.sha256,
   inputs:inputs('configured'),
   publication:{confirmed:`logical:${d.id}:confirmed`,
    provisional:`logical:${d.id}:provisional`},
   operational:{owner:'configured-existing',family:'configured',
    sourceRoot:`themes/${r.internalId}`,
    physicalFeeds:{confirmed:`theme-configured:${d.id}`,
     provisional:`theme-configured-provisional:${d.id}`},
    evidenceScope:'PRIVATE_REGISTRATION_NOT_PUBLICATION_GRANT'}};
 });
 const registry={schema:'ZGMINI_THEME_PLATFORM_V1',themes:[...inherited,...configured]};
 validateThemeRegistry(registry,{formulas:OPERATIONAL_METHODS});
 return registry;
}

export function planPhysicalFeeds(registry){
 const groups=new Map();
 for(const theme of registry.themes)for(const kind of ['confirmed','provisional']){
  const feedKey=theme.operational?.physicalFeeds?.[kind];
  required(typeof feedKey==='string'&&feedKey,'THEME_OPERATIONAL_FEED_KEY');
  const key=JSON.stringify([kind,feedKey]);
  const group=groups.get(key)??{kind,feedKey,owner:theme.operational.owner,themeIds:[]};
  required(group.owner===theme.operational.owner,'THEME_OPERATIONAL_SHARED_OWNER_CONFLICT');
  group.themeIds.push(theme.id);groups.set(key,group);
 }
 return [...groups.values()];
}

export function planOperationalBatch({sources,registrations=[],dataRoot=null}={}){
 const entries=dataRoot===null?registrations:listRegistered(dataRoot);
 const registry=buildOperationalRegistry({sources,registrations:entries});
 const feedGroups=planPhysicalFeeds(registry);
 return {status:'PRIVATE_BINDINGS_PLANNED_NOT_EXECUTED',
  publicTargetIds:registry.themes.filter(t=>t.public).map(t=>t.id),
  privateRegisteredIds:registry.themes.filter(t=>!t.public).map(t=>t.id),
  registry,feedGroups,uniqueStoredInputPlans:sourcePlan(registry).length,
  providerCalls:0,d1Writes:0,schedulerWrites:0};
}

// Existing source/calculation adapters are injected and must return real,
// durable proof. No production adapter or publication is silently invented.
export async function runOperationalPrivateBatch({sources,registrations=[],adapters,
 store,runKey,maxStages=Infinity,after=null}={}){
 required(adapters&&store,'THEME_OPERATIONAL_STORED_ADAPTERS_REQUIRED');
 const registry=buildOperationalRegistry({sources,registrations});
 const run=await runThemeBatch({registry,adapters,store,runKey,maxStages,after,
  mode:'private',formulas:OPERATIONAL_METHODS});
 const coverage=Object.fromEntries([['public',true],['private',false]].map(([scope,isPublic])=>{
  const ids=new Set(registry.themes.filter(t=>t.public===isPublic&&t.enabled).map(t=>t.id));
  const expectedPhases=ids.size*2;
  const observed=run.results.filter(row=>ids.has(row.id));
  const complete=observed.filter(row=>row.status==='COMPLETE').length;
  const blocked=observed.filter(row=>row.status==='BLOCKED').length;
  return [scope,{status:!expectedPhases?'NOT_APPLICABLE':blocked?'PARTIAL':
   complete===expectedPhases?'COMPLETE':run.status==='RUNNING'?'RUNNING':'INCOMPLETE',
   themes:ids.size,expectedPhases,complete,blocked,
   pending:expectedPhases-complete-blocked}];
 }));
 return {...run,publicTargetIds:registry.themes.filter(t=>t.public).map(t=>t.id),
  coverage,
  physicalFeedGroups:planPhysicalFeeds(registry).length,
  providerCalls:'REQUIRES_ADAPTER_METERING',d1Writes:'NOT_REQUESTED_BY_PLATFORM'};
}
