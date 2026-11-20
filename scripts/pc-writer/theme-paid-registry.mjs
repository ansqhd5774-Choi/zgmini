// Reuse the actually installed common registry; public/private decisions stay per registration.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
const sha=b=>createHash('sha256').update(b).digest('hex');
const need=(ok,code)=>{if(!ok)throw Object.assign(Error(code),{code});};
export async function loadPaidRegistry(dataRoot){
 const home=path.join(dataRoot,'pc-writer','theme-config-tool'),active=JSON.parse(fs.readFileSync(path.join(home,'ACTIVE_RUNTIME.json')));
 need(/^[a-f0-9]{16}$/.test(active.version),'PAID_THEME_INSTALLED_VERSION');const root=path.join(home,'versions',active.version);
 const names=['theme-platform-operational.mjs','theme-config-registry.mjs','theme-config-score.mjs'];
 for(const name of names){const rel='scripts/pc-writer/'+name;need(sha(fs.readFileSync(path.join(root,rel)))===active.manifest[rel],'PAID_THEME_REGISTRY_SOURCE_SHA');}
 const operational=await import(pathToFileURL(path.join(root,'scripts/pc-writer/theme-platform-operational.mjs')).href);
 const registration=await import(pathToFileURL(path.join(root,'scripts/pc-writer/theme-config-registry.mjs')).href);
 const scorer=await import(pathToFileURL(path.join(root,'scripts/pc-writer/theme-config-score.mjs')).href);
 const registered=registration.listRegistered(dataRoot),sources=operational.loadOperationalSources({sourceRoot:root});
 const registry=operational.buildOperationalRegistry({sources,registrations:registered});
 const aum=JSON.parse(fs.readFileSync(path.join(root,'config/theme-nine-r26-official-aum-evidence.json')));
 const space=JSON.parse(fs.readFileSync(path.join(root,'scripts/pc-writer/theme-space-satellite-r23-dated-aum-evidence.json')));
 const aumByTheme={};
 for(const t of registry.themes){
  if(t.operational.family==='r37')aumByTheme[t.id]=aum.rows;
  else if(t.operational.family==='space')aumByTheme[t.id]=space.rows;
  else if(t.operational.family==='configured'){
   const r=registered.find(r=>r.definition.id===t.id);aumByTheme[t.id]=scorer.readConfiguredEvidence(dataRoot,r.definition.aumEvidence).rows;
   // The existing exact approval format is reused; development registrations remain private.
   const file=path.join(dataRoot,'theme-config','public-approvals',t.id+'.json');
   if(fs.existsSync(file)){const a=JSON.parse(fs.readFileSync(file));
    t.public=Boolean(a.schema==='ZGMINI_CONFIGURED_PUBLIC_APPROVAL_V1'&&a.themeId===t.id&&a.definitionSha256===r.sha256&&a.profile===t.methodologyVersion&&a.selectionReviewed===true&&a.publicationAuthorized===true&&a.derivedOnlyNoRaw===true&&JSON.stringify(a.etfs)===JSON.stringify(t.etfs)&&a.rights?.mode==='VERIFIED_DERIVED_PUBLICATION_RIGHTS'&&a.rights.evidenceReference&&Date.parse(a.approvedAt)<=Date.now()&&Date.parse(a.expiresAt)>Date.now());
   }
  }
 }
 const symbols=[...new Set(registry.themes.filter(t=>t.enabled).flatMap(t=>[...t.etfs,t.benchmark]))].sort();
 return {registry,aumByTheme,symbols,sourceSha:active.sourceSha,registrySha256:sha(JSON.stringify(registry))};
}
