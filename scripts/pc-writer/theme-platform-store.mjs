// Local execution evidence, not price storage or D1. Atomic snapshots are
// versioned; exclusive revision files implement CAS without replacing history.
import fs from 'node:fs';
import path from 'node:path';
import {identity} from './theme-platform.mjs';
import {safeDirectory} from './theme-config-registry.mjs';
const need=(ok,code)=>{if(!ok)throw Object.assign(new Error(code),{code});};
export function createThemeCheckpointStore({dataRoot}){
 const base=safeDirectory(dataRoot,'theme-platform/checkpoints',{create:true});
 const directory=key=>{
  need(/^[a-f0-9]{64}$/.test(key),'THEME_CHECKPOINT_KEY');
  return safeDirectory(base,key,{create:true});
 };
 function load(key){
  const dir=directory(key),names=fs.readdirSync(dir);
  const revisions=names.map(n=>{need(/^revision-[1-9][0-9]*\.json$/.test(n),'THEME_CHECKPOINT_UNCERTAIN_FILE');return Number(n.slice(9,-5));}).sort((a,b)=>a-b);
  if(!revisions.length)return null;
  revisions.forEach((v,i)=>need(v===i+1,'THEME_CHECKPOINT_REVISION_GAP'));
  const file=path.join(dir,'revision-'+revisions.at(-1)+'.json');
  need(!fs.lstatSync(file).isSymbolicLink(),'THEME_CHECKPOINT_REDIRECT');
  const envelope=JSON.parse(fs.readFileSync(file,'utf8'));
  need(envelope.sha256===identity(envelope.state)&&envelope.state.fingerprint===key&&envelope.state.revision===revisions.at(-1),'THEME_CHECKPOINT_CORRUPT');
  return envelope.state;
 }
 return {load:async key=>load(key),save:async(key,state,expectedRevision)=>{
  need(state.fingerprint===key&&state.revision===expectedRevision+1,'THEME_CHECKPOINT_REVISION');
  need((load(key)?.revision??0)===expectedRevision,'THEME_CHECKPOINT_CAS_CONFLICT');
  const file=path.join(directory(key),'revision-'+state.revision+'.json');
  const bytes=JSON.stringify({sha256:identity(state),state})+'\n';
  // A process crash can leave an incomplete revision. load then fails closed;
  // it never silently skips evidence or claims an uncertain publish succeeded.
  const fd=fs.openSync(file,'wx');
  try{fs.writeFileSync(fd,bytes);fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
  need(identity(load(key))===identity(state),'THEME_CHECKPOINT_READBACK');
 }};
}
