// R59.1 bounded local discovery. No collection, mutation, or secrets inspection.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
export const PRIVATE_NAME='MARKET_CALENDAR_R58_FHS_R3_PRIVATE_SHADOW.json';
export const R58_REPORT_NAME='MARKET_CALENDAR_R58_3_RESULT.txt';
const exists=p=>{try{return fs.statSync(p).isFile()}catch{return false}};
const dir=p=>{try{return fs.statSync(p).isDirectory()}catch{return false}};
export function verifiedR58Folder(folder){
 if(!dir(folder)||!exists(path.join(folder,PRIVATE_NAME))||!exists(path.join(folder,R58_REPORT_NAME)))return false;
 try{
  const report=fs.readFileSync(path.join(folder,R58_REPORT_NAME),'utf8');
  if(report.length>15000||!/^status="R58_3_LOCAL_PROVISIONAL_SCORING_COMPLETE"$/m.test(report)||!/^executionComplete=true$/m.test(report))return false;
  const shadowPath=path.join(folder,PRIVATE_NAME);
  const size=fs.statSync(shadowPath).size;
  if(size<=100||size>1800000)return false;
  const shadow=JSON.parse(fs.readFileSync(shadowPath,'utf8'));
  const asOf=/^asOf="(20\d\d-\d\d-\d\d)"$/m.exec(report)?.[1];
  const count=Number(/^provisionalScoreTickers=(\d+)$/m.exec(report)?.[1]);
  return shadow?.status==='PRIVATE_PROVISIONAL_ONLY'&&shadow.version==='ZGMINI-FHS-R3'&&
   shadow.publishReady===false&&shadow.asOf===asOf&&shadow.recordCount===count&&
   Number.isInteger(count)&&count>0&&Array.isArray(shadow.items)&&shadow.items.length===count;
 }catch{return false}
}
export function resolveR58Source({hint='',workingDir=process.cwd(),home=os.homedir(),envFile='',maxFolders=400}={}){
 if(hint){const absolute=path.resolve(hint.trim().replace(/^"|"$/g,''));
  const folder=exists(absolute)?path.dirname(absolute):absolute;
  return verifiedR58Folder(folder)?{status:'READY',folder,method:'EXPLICIT'}:{status:'R59_SOURCE_HINT_INVALID_STOP',count:0};}
 if(envFile)return resolveR58Source({hint:envFile,workingDir,home,maxFolders});
 const roots=[workingDir,path.dirname(workingDir),path.join(home,'Downloads'),path.join(home,'Desktop'),path.join(home,'Documents')];
 const visited=new Set(),matches=new Set();let seen=0;
 for(const root of roots){
  if(!dir(root))continue;
  const queue=[{folder:root,depth:0}];
  while(queue.length&&seen<maxFolders){
   const {folder,depth}=queue.shift();const canonical=path.resolve(folder).toLowerCase();
   if(visited.has(canonical))continue;visited.add(canonical);seen++;
   if(verifiedR58Folder(folder)){matches.add(path.resolve(folder));continue;}
   if(depth>=2)continue;
   let entries;try{entries=fs.readdirSync(folder,{withFileTypes:true})}catch{continue}
   // No following symlinks, junctions, drive-wide search, or scans of data folders.
   for(const ent of entries){
    if(!ent.isDirectory()||ent.isSymbolicLink())continue;
    const name=ent.name.toLowerCase();
    // Depth-1: use explicit R58 folder names and conventional Downloads unpacked folders.
    if(depth===0&&root===path.dirname(workingDir)&&name===path.basename(workingDir).toLowerCase())continue;
    if(depth===1&&!/(?:r58|market_calendar|zgmini|annual|unified)/i.test(name))continue;
    queue.push({folder:path.join(folder,ent.name),depth:depth+1});
   }
  }
 }
 if(seen>=maxFolders)return {status:'R59_SOURCE_SCAN_LIMIT_STOP',count:matches.size};
 if(matches.size!==1)return {status:matches.size?'R59_SOURCE_AMBIGUOUS_STOP':'R59_SOURCE_NOT_FOUND_STOP',count:matches.size};
 return {status:'READY',folder:[...matches][0],method:'AUTO_BOUNDED'};
}
