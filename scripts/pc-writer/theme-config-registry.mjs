// Data-only local registrations. Never changes legacy rosters, tasks or D1.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
export const digest=x=>createHash('sha256').update(x).digest('hex');
export const ensure=(ok,code)=>{if(!ok)throw Object.assign(new Error(code),{code});};
export const validDate=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&Number.isFinite(Date.parse(x+'T00:00:00Z'))&&new Date(x+'T00:00:00Z').toISOString().slice(0,10)===x;
export function validateDefinition(input){
 ensure(input&&Object.getPrototypeOf(input)===Object.prototype,'CONFIG_OBJECT_REQUIRED');
 const allowed=['schema','id','label','provider','profile','etfs','benchmark','startDate'];
 ensure(Object.keys(input).length===allowed.length&&Object.keys(input).every(k=>allowed.includes(k)),'CONFIG_UNKNOWN_OR_MISSING_FIELDS');
 ensure(input.schema==='ZGMINI_THEME_CONFIG_V1','CONFIG_SCHEMA');
 ensure(typeof input.id==='string'&&/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(input.id)&&input.id.length<=48,'CONFIG_ID');
 ensure(typeof input.label==='string'&&input.label.trim()===input.label&&input.label.length>0&&input.label.length<=60&&!/[\x00-\x1f\x7f<>]/.test(input.label),'CONFIG_LABEL');
 ensure(input.provider==='getmarkethistory'&&input.profile==='ADAPTIVE_R2_PAIR_R3'&&input.benchmark==='SPY','CONFIG_UNSUPPORTED_PROVIDER_OR_FORMULA');
 ensure(Array.isArray(input.etfs)&&input.etfs.length===2&&input.etfs.every(x=>typeof x==='string'&&/^[A-Z]{1,6}$/.test(x)&&x!=='SPY')&&new Set(input.etfs).size===2,'CONFIG_TWO_DISTINCT_ETFS_REQUIRED');
 ensure(validDate(input.startDate)&&input.startDate>='2000-01-01'&&input.startDate<=new Date().toISOString().slice(0,10),'CONFIG_START_DATE');
 return Object.fromEntries(allowed.map(k=>[k,k==='etfs'?[...input[k]]:input[k]]));
}
export function readDefinition(file){
 const bytes=fs.readFileSync(file);ensure(bytes.length<=8192,'CONFIG_SIZE_LIMIT');
 return validateDefinition(JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/,'')));
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
