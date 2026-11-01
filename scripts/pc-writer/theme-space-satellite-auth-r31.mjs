// The new space/satellite publisher reuses the already-approved seven-theme
// PC source resolution + D1 credential. Do not guess another Wrangler path.
// This module never starts the seven-theme publisher or modifies its tasks.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';

export const SPACE_APPROVED_SEVEN_CORE_SHA256=
 'f9ea0a1bfaf52909b7a434b65ba93887f56660bc979a3cb7e0992597bc9f3b68';
const fail=code=>{throw Object.assign(new Error(code),{code});};
const need=(condition,code)=>{if(!condition)fail(code);};
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');

export async function spaceSatelliteApprovedSevenTokenR31({
 dataRoot='E:/ZGmini/data',expectedCoreSha256=SPACE_APPROVED_SEVEN_CORE_SHA256,
 importer=url=>import(url),
}={}){
 const home=path.join(dataRoot,'theme-market-history-r131','marketparquet-r167');
 const core=path.join(home,'r179-publish-core.mjs');
 need(fs.existsSync(core),'SPACE_R31_APPROVED_SEVEN_CORE_MISSING');
 need(sha(fs.readFileSync(core))===expectedCoreSha256,
  'SPACE_R31_APPROVED_SEVEN_CORE_CHANGED');
 const cfgPath=path.join(dataRoot,'pc-writer','config.json');
 need(fs.existsSync(cfgPath),'SPACE_R31_APPROVED_PC_CONFIG_MISSING');
 const cfg=JSON.parse(fs.readFileSync(cfgPath,'utf8'));
 need(cfg.enabled===true&&cfg.collectionTarget==='pc'&&
  /^[a-f0-9]{40}$/.test(cfg.source??''),
  'SPACE_R31_APPROVED_OPERATING_SOURCE_MISMATCH');
 const source=await importer(pathToFileURL(path.join(home,'r175-source.mjs')).href);
 need(typeof source.resolvePublisherSource==='function',
  'SPACE_R31_APPROVED_SOURCE_RESOLVER_MISSING');
 const auditFile=path.join(dataRoot,'themes','ai-semiconductor','state',
  'r1-seven-source-audit.json');
 const selected=source.resolvePublisherSource(cfg,{auditFile});
 need(typeof selected?.root==='string'&&selected.root.length>0&&
  /^[a-f0-9]{40}$/.test(selected.head??''),
  'SPACE_R31_APPROVED_SOURCE_NOT_VERIFIED');
 const client=await importer(pathToFileURL(path.join(selected.root,'scripts',
  'pc-writer','d1.mjs')).href);
 need(typeof client.credential==='function',
  'SPACE_R31_APPROVED_D1_AUTH_MODULE_MISSING');
 let token;
 try{token=client.credential(selected.root);}
 catch{fail('SPACE_R31_APPROVED_SEVEN_CREDENTIAL_FAILED');}
 need(typeof token==='string'&&token.length>0,
  'SPACE_R31_APPROVED_D1_AUTH_UNAVAILABLE');
 return token; // In memory only. Never print, persist or log tokens.
}
