// R8 uses the exact already-approved seven-theme PC publication credential
// resolver.  It imports only the source selector and d1 credential function;
// it NEVER invokes r179-publish-core.mjs or writes the seven-theme feed.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';

export const R8_APPROVED_SEVEN_CORE_SHA256='f9ea0a1bfaf52909b7a434b65ba93887f56660bc979a3cb7e0992597bc9f3b68';
const fail=code=>{throw Object.assign(new Error(code),{code});};
const verify=(condition,code)=>{if(!condition)fail(code);};

export async function biotechApprovedSevenTokenR8({
 dataRoot='E:/ZGmini/data',
 expectedCoreSha256=R8_APPROVED_SEVEN_CORE_SHA256,
 importer=url=>import(url),
}={}){
 const home=path.join(dataRoot,'theme-market-history-r131','marketparquet-r167');
 const core=path.join(home,'r179-publish-core.mjs');
 verify(fs.existsSync(core),'R8_APPROVED_SEVEN_CORE_MISSING');
 const actual=createHash('sha256').update(fs.readFileSync(core)).digest('hex');
 verify(actual===expectedCoreSha256,'R8_APPROVED_SEVEN_CORE_CHANGED');

 const cfgPath=path.join(dataRoot,'pc-writer','config.json');
 verify(fs.existsSync(cfgPath),'R8_APPROVED_PC_CONFIG_MISSING');
 const cfg=JSON.parse(fs.readFileSync(cfgPath,'utf8'));
 verify(cfg.enabled===true&&cfg.collectionTarget==='pc'&&/^[a-f0-9]{40}$/.test(cfg.source??''),
  'R8_APPROVED_OPERATING_SOURCE_MISMATCH');

 const source=await importer(pathToFileURL(path.join(home,'r175-source.mjs')).href);
 verify(typeof source.resolvePublisherSource==='function','R8_APPROVED_SOURCE_RESOLVER_MISSING');
 const auditFile=path.join(dataRoot,'themes','biotech','state','r8-seven-source-audit.json');
 const selected=source.resolvePublisherSource(cfg,{auditFile});
 verify(typeof selected?.root==='string'&&selected.root.length>0&&
  /^[a-f0-9]{40}$/.test(selected.head??''),'R8_APPROVED_SOURCE_NOT_VERIFIED');
 const client=await importer(pathToFileURL(path.join(selected.root,'scripts','pc-writer','d1.mjs')).href);
 verify(typeof client.credential==='function','R8_APPROVED_D1_AUTH_MODULE_MISSING');
 // This is exactly the seven-theme call: d1.credential(repo).
 // Never include the returned secret in a report, file, or error.
 let token;
 try{token=client.credential(selected.root);}
 catch{fail('R8_APPROVED_SEVEN_CREDENTIAL_FAILED');}
 verify(typeof token==='string'&&token.length>0,'R8_APPROVED_D1_AUTH_UNAVAILABLE');
 return token;
}
