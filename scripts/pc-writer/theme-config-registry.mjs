// Data-only local registrations. Never changes legacy rosters, tasks or D1.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {R32} from './theme-platform.mjs';
export const digest=x=>createHash('sha256').update(x).digest('hex');
export const ensure=(ok,code)=>{if(!ok)throw Object.assign(new Error(code),{code});};
export const validDate=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&Number.isFinite(Date.parse(x+'T00:00:00Z'))&&new Date(x+'T00:00:00Z').toISOString().slice(0,10)===x;
export function validateDefinition(input){
 ensure(input&&Object.getPrototypeOf(input)===Object.prototype,'CONFIG_OBJECT_REQUIRED');
 const v2=input.schema==='ZGMINI_THEME_CONFIG_V2';
 const allowed=['schema','id','label','provider','profile','etfs','benchmark','startDate',...(v2?['selectionEvidence','aumEvidence','provisionalPolicy']:[])];
 ensure(Object.keys(input).length===allowed.length&&Object.keys(input).every(k=>allowed.includes(k)),'CONFIG_UNKNOWN_OR_MISSING_FIELDS');
 ensure(v2||input.schema==='ZGMINI_THEME_CONFIG_V1','CONFIG_SCHEMA');
 ensure(typeof input.id==='string'&&/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(input.id)&&input.id.length<=48,'CONFIG_ID');
 ensure(typeof input.label==='string'&&input.label.trim()===input.label&&input.label.length>0&&input.label.length<=60&&!/[\x00-\x1f\x7f<>]/.test(input.label),'CONFIG_LABEL');
 ensure(input.provider==='getmarkethistory'&&input.profile===(v2?R32:'ADAPTIVE_R2_PAIR_R3')&&input.benchmark==='SPY','CONFIG_UNSUPPORTED_PROVIDER_OR_FORMULA');
 ensure(Array.isArray(input.etfs)&&(v2?input.etfs.length>0:input.etfs.length===2)&&input.etfs.every(x=>typeof x==='string'&&/^[A-Z]{1,6}$/.test(x)&&x!=='SPY')&&new Set(input.etfs).size===input.etfs.length,v2?'CONFIG_DISTINCT_ETFS_REQUIRED':'CONFIG_TWO_DISTINCT_ETFS_REQUIRED');
 if(v2)for(const field of ['selectionEvidence','aumEvidence']){
  const ref=input[field];ensure(ref&&Object.keys(ref).length===2&&typeof ref.path==='string'&&
   /^[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_.-]+)+\.json$/.test(ref.path)&&
   !ref.path.split('/').some(p=>p==='.'||p==='..')&&/^[a-f0-9]{64}$/.test(ref.sha256),'CONFIG_EVIDENCE_REFERENCE');
 }
 if(v2)ensure(input.provisionalPolicy==='GMH_CONFIRMED_MARKETPARQUET_PROVISIONAL_R8_OVERLAP_GUARD','CONFIG_PROVISIONAL_POLICY');
 ensure(validDate(input.startDate)&&input.startDate>='2000-01-01'&&input.startDate<=new Date().toISOString().slice(0,10),'CONFIG_START_DATE');
 return structuredClone(Object.fromEntries(allowed.map(k=>[k,input[k]])));
}
export function readDefinition(file){
 const bytes=fs.readFileSync(file); // No ETF-count cap hidden in a V2 byte-size gate.
 ensure(bytes.length<=8192||JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/,''))?.schema==='ZGMINI_THEME_CONFIG_V2','CONFIG_SIZE_LIMIT');
 return validateDefinition(JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/,'')));
}
export function readDefinitionEvidence(dataRoot,ref){
 const dir=safeDirectory(dataRoot,path.dirname(ref.path)),file=path.join(dir,path.basename(ref.path));
 ensure(fs.lstatSync(file).isFile()&&!fs.lstatSync(file).isSymbolicLink(),'CONFIG_EVIDENCE_REDIRECT');
 const bytes=fs.readFileSync(file);ensure(digest(bytes)===ref.sha256,'CONFIG_EVIDENCE_SHA');return JSON.parse(bytes);
}
export function verifyDefinitionSelection(dataRoot,d){
 if(d.schema!=='ZGMINI_THEME_CONFIG_V2')return null;
 const selection=readDefinitionEvidence(dataRoot,d.selectionEvidence);
 ensure(selection.schema==='ZGMINI_THEME_SELECTION_EVIDENCE_V1'&&selection.themeId===d.id&&
  selection.selectionApproved===true&&typeof selection.approvalReference==='string'&&selection.approvalReference.trim()&&
  Array.isArray(selection.rows)&&selection.rows.length===d.etfs.length,'CONFIG_R32_SELECTION');
 ensure(new Set(selection.rows.map(r=>r.ticker)).size===d.etfs.length&&selection.rows.every(r=>d.etfs.includes(r.ticker)&&
  /^https:\/\//.test(r.holdingsUrl)&&r.providerLookupVerified===true&&['A','B','C'].includes(r.operatorGrade)),
  'CONFIG_R32_SELECTION_GATES');return selection;
}
// Inspect every existing component before mkdir; reject junction/symlink escape.
export function safeDirectory(root,relative,{create=false}={}){
 const base=fs.realpathSync(root);ensure(!path.isAbsolute(relative)&&!relative.split(/[\\/]/).some(p=>!p||p==='.'||p==='..'),'CONFIG_DIRECTORY');
 let current=base;
 for(const part of relative.split(/[\\/]/)){
  current=path.join(current,part);
  if(!fs.existsSync(current)){ensure(create,'CONFIG_DIRECTORY_MISSING');fs.mkdirSync(current);}
  const st=fs.lstatSync(current);ensure(st.isDirectory()&&!st.isSymbolicLink()&&fs.realpathSync(current)===current,'CONFIG_DIRECTORY_REDIRECT');
 }
 return current;
}
const bytesFor=d=>Buffer.from(JSON.stringify(d,null,2)+'\n');
export function registerDefinition({dataRoot,definition,legacyRegistry}){
 const d=validateDefinition(definition);
 verifyDefinitionSelection(dataRoot,d);
 ensure(!legacyRegistry.themes.some(t=>t.id===d.id||t.label===d.label),'CONFIG_LEGACY_THEME_COLLISION');
 const root=fs.realpathSync(dataRoot),internalId='registered-'+d.id;
 const dir=safeDirectory(root,'theme-config/definitions',{create:true});
 const file=path.join(dir,d.id+'.json'),bytes=bytesFor(d),hash=digest(bytes);
 if(fs.existsSync(file)){
  ensure(fs.lstatSync(file).isFile()&&!fs.lstatSync(file).isSymbolicLink(),'CONFIG_FILE_REDIRECT');
  ensure(digest(fs.readFileSync(file))===hash,'CONFIG_ALREADY_REGISTERED_DIFFERENT_CONTENT');
  return {status:'ALREADY_REGISTERED',id:d.id,internalId,sha256:hash,writes:0};
 }
 ensure(!fs.existsSync(path.join(root,'themes',internalId)),'CONFIG_UNREGISTERED_DATA_COLLISION');
 for(const name of fs.readdirSync(dir)){
  ensure(/^[a-z][a-z0-9-]*\.json$/.test(name),'CONFIG_REGISTRY_UNEXPECTED_FILE');
  const prior=readRegistered(dataRoot,name.slice(0,-5)).definition;
  ensure(prior.label!==d.label,'CONFIG_LABEL_COLLISION');
 }
 // Exclusive creation prevents a concurrent replacement. A partial file fails
 // validation and is never admitted by a collection run.
 fs.writeFileSync(file,bytes,{flag:'wx'});
 ensure(digest(fs.readFileSync(file))===hash,'CONFIG_READBACK_FAILED');
 return {status:'REGISTERED_PRIVATE_ONLY',id:d.id,internalId,sha256:hash,writes:1};
}
export function readRegistered(dataRoot,id){
 ensure(typeof id==='string'&&/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(id)&&id.length<=48,'CONFIG_ID');
 const dir=safeDirectory(dataRoot,'theme-config/definitions'),file=path.join(dir,id+'.json');
 const st=fs.lstatSync(file);ensure(st.isFile()&&!st.isSymbolicLink(),'CONFIG_FILE_REDIRECT');
 const definition=readDefinition(file);ensure(definition.id===id,'CONFIG_IDENTITY');
 return {definition,sha256:digest(fs.readFileSync(file)),internalId:'registered-'+id};
}
// Shared discovery lives below every CLI/auto/preflight caller. Importing an
// executing top-level-await CLI from its own post-step would deadlock Node.
export function listRegistered(dataRoot){
 const dir=path.join(fs.realpathSync(dataRoot),'theme-config','definitions');
 if(!fs.existsSync(dir))return [];
 safeDirectory(dataRoot,'theme-config/definitions');
 return fs.readdirSync(dir).sort().map(n=>{ensure(/^[a-z][a-z0-9-]*\.json$/.test(n),'CONFIG_REGISTRY_UNEXPECTED_FILE');return readRegistered(dataRoot,n.slice(0,-5));});
}
