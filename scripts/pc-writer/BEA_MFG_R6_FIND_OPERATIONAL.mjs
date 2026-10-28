// Read-only discovery of the single currently approved operational checkout.
// This does not fetch, reset, update or modify Git or the PC data store.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const SHA=/^[0-9a-f]{40}$/i;
const ORIGIN=/(?:^|[/:])ansqhd5774-Choi\/zgmini(?:\.git)?$/i;
const SKIP=new Set(['node_modules','.git','.next','dist','storage','raw','tmp','temp','cache']);
const canonical=p=>path.normalize(fs.realpathSync(p)).toLowerCase();
const git=(root,args)=>execFileSync('git',['-C',root,...args],{
  encoding:'utf8',timeout:12000,windowsHide:true,stdio:['ignore','pipe','pipe'],
}).trim();

function validCheckout(dir,source){
  try{
    if(!fs.existsSync(path.join(dir,'.git')))return false;
    const top=git(dir,['rev-parse','--show-toplevel']);
    if(canonical(dir)!==canonical(top))return false;
    if(git(dir,['rev-parse','HEAD']).toLowerCase()!==source.toLowerCase())return false;
    if(!ORIGIN.test(git(dir,['config','--get','remote.origin.url'])))return false;
    if(git(dir,['status','--porcelain','--untracked-files=no','--','worker','scripts/pc-writer']))
      return false;
    return true;
  }catch{return false;}
}

export function discoverOperationalRoot({
  pcHome=process.env.ZGMINI_PC_HOME||'E:\\ZGmini\\data\\pc-writer',
  projectRoot=process.env.ZGMINI_PC_PROJECTS_ROOT||'E:\\ZGmini\\projects',
  explicitRoot=process.env.ZGMINI_EARNINGS_C_OPERATIONAL_ROOT||null,
}={}){
  if(!path.isAbsolute(pcHome)||!fs.existsSync(path.join(pcHome,'config.json')))
    throw Error('APPROVED_PC_CONFIG_MISSING');
  let config;
  try{config=JSON.parse(fs.readFileSync(path.join(pcHome,'config.json'),'utf8'));}
  catch{throw Error('APPROVED_PC_CONFIG_INVALID');}
  if(!config||config.collectionTarget!=='pc'||config.enabled!==true||!SHA.test(config.source??''))
    throw Error('APPROVED_PC_CONFIG_NOT_READY');
  if(explicitRoot){
    if(!path.isAbsolute(explicitRoot)||!validCheckout(explicitRoot,config.source))
      throw Error('EXPLICIT_OPERATIONAL_ROOT_INVALID');
    return path.resolve(explicitRoot);
  }
  if(!path.isAbsolute(projectRoot)||!fs.existsSync(projectRoot))
    throw Error('APPROVED_PROJECTS_ROOT_MISSING');
  const found=new Map();
  let scanned=0;
  const visit=(dir,depth)=>{
    if(++scanned>250)throw Error('OPERATIONAL_SOURCE_SCAN_LIMIT');
    if(!fs.statSync(dir).isDirectory())return;
    if(fs.existsSync(path.join(dir,'.git'))){
      if(validCheckout(dir,config.source))found.set(canonical(dir),path.resolve(dir));
      return;
    }
    if(depth>=3)return;
    let entries;
    try{entries=fs.readdirSync(dir,{withFileTypes:true});}
    catch{throw Error('APPROVED_PROJECTS_SCAN_FAILED');}
    for(const item of entries){
      if(!item.isDirectory()||SKIP.has(item.name.toLowerCase())||item.name.startsWith('.'))continue;
      visit(path.join(dir,item.name),depth+1);
    }
  };
  visit(projectRoot,0);
  if(found.size===0)throw Error('APPROVED_OPERATIONAL_ROOT_NOT_FOUND');
  if(found.size>1)throw Error('AMBIGUOUS_APPROVED_OPERATIONAL_ROOT');
  return [...found.values()][0];
}

const self=fileURLToPath(import.meta.url);
if(process.argv[1]&&path.resolve(process.argv[1])===self){
  try{console.log(discoverOperationalRoot());}
  catch(error){console.error('ERROR='+String(error?.message??'OPERATIONAL_ROOT_DISCOVERY_FAILED'));process.exitCode=1;}
}
