// Read-only locator. A scheduled Core task is evidence of the installed PC
// checkout; historical runbook paths and arbitrary E: searches are not.
// A located candidate is NOT approved for merging, scoring or publication.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';
import {EMPLOYMENT_R6_TABLES} from '../../lib/market-score/employment-r6-contract.mjs';

const W=path.win32;
const NAME='EMPLOYMENT_R6_CANDIDATE.sqlite';
const TASK='ZGMINI-PC-Local-Core';
const SHA=/^[a-f\d]{40}$/i;
const WIN_ABS=/^[a-z]:\\/i;
const LEAF=/^([a-z]:\\[^\r\n<>"|*?]+)\\scripts\\pc-writer\\(local-cycle|quota-runner|run-local|collect-local)\.mjs$/i;
const SCRIPT=/([a-z]:[\\/][^"'\r\n<>|*?]+?\.(?:vbs|cmd|mjs))/gi;
const fail=code=>{throw Object.assign(new Error(code),{code});};
const ensure=(value,code)=>{if(!value)fail(code);};

function decode(bytes){
  if(typeof bytes==='string')return bytes.replace(/^\uFEFF/,'');
  ensure(Buffer.isBuffer(bytes),'TASK_XML_UNREADABLE');
  if(bytes[0]===0xff&&bytes[1]===0xfe)return bytes.subarray(2).toString('utf16le').replace(/^\uFEFF/,'');
  if(bytes[0]===0xfe&&bytes[1]===0xff)fail('TASK_XML_UNREADABLE');
  return (bytes.length>1&&bytes[1]===0?bytes.toString('utf16le'):bytes.toString('utf8')).replace(/^\uFEFF/,'');
}
function queryTask(){
  return decode(execFileSync('schtasks.exe',['/Query','/TN',TASK,'/XML'],{
    windowsHide:true,timeout:15000,maxBuffer:2*1024*1024,stdio:['ignore','pipe','ignore'],
  }));
}
function field(body,name,required=true){
  const matches=[...body.matchAll(new RegExp(`<${name}(?:\\s[^>]*)?>([^<]*)<\\/${name}\\s*>`,'gi'))];
  ensure(matches.length===(required?1:Math.min(matches.length,1)),'TASK_ACTION_UNRESOLVED');
  if(!matches.length)return '';
  const value=matches[0][1];
  ensure(!/&(?!(?:amp|quot|apos|lt|gt|#\d+|#x[\da-f]+);)/i.test(value),'TASK_ACTION_UNRESOLVED');
  return value.replace(/&(?:amp|quot|apos|lt|gt|#\d+|#x[\da-f]+);/gi,entity=>{
    const named={'&amp;':'&','&quot;':'"','&apos;':"'",'&lt;':'<','&gt;':'>'};
    if(named[entity.toLowerCase()])return named[entity.toLowerCase()];
    if(/^&#x/i.test(entity))return String.fromCodePoint(parseInt(entity.slice(3,-1),16));
    return String.fromCodePoint(parseInt(entity.slice(2,-1),10));
  });
}
function only(paths,code){
  const normalized=[...new Map(paths.map(item=>[W.normalize(item).toLowerCase(),W.normalize(item)])).values()];
  ensure(normalized.length===1,code);
  return normalized[0];
}
const absolute=value=>typeof value==='string'&&WIN_ABS.test(value)&&W.isAbsolute(value)
  &&!/[<>"|*?\r\n]/.test(value)&&!value.includes('%')&&!value.includes('!');
function references(line){return [...line.matchAll(SCRIPT)].map(m=>W.normalize(m[1].trim()));}

// A Core Task can run auxiliary jobs before/after its original VBS launcher.
// Follow only a unique, statically referenced launcher that is demonstrably
// used by a Run/call invocation. A decoy assignment is not an executable path.
function invokedPath(lines,target){
  const normalized=W.normalize(target).toLowerCase();
  const linkedVariables=new Set();
  for(const line of lines){
    const match=/^\s*([a-z_]\w*)\s*=\s*(.+)$/i.exec(line);
    if(match){
      const variable=match[1].toLowerCase(),expression=match[2];
      // Follow assignment order; a later dynamic reassignment revokes trust.
      const linked=references(expression).some(p=>p.toLowerCase()===normalized)||
        [...linkedVariables].some(name=>new RegExp('\\b'+name+'\\b','i').test(expression));
      if(linked)linkedVariables.add(variable);
      else linkedVariables.delete(variable);
    }
    if(!/\.Run\s*\(?|\.Exec\s*\(?|^\s*(?:call\b|node(?:\.exe)?\b)/i.test(line))continue;
    if(references(line).some(p=>p.toLowerCase()===normalized)||
      [...linkedVariables].some(variable=>new RegExp('\\b'+variable+'\\b','i').test(line)))return true;
  }
  return false;
}

function followedReference(lines){
  const all=[...new Map(lines.flatMap(references)
    .map(p=>[p.toLowerCase(),p])).values()];
  const vbs=all.filter(p=>/\.vbs$/i.test(p));
  const core=all.filter(p=>LEAF.test(p));
  const allowed=vbs.length?vbs:core;
  ensure(allowed.length===1,'TASK_SOURCE_UNRESOLVED');
  if(vbs.length)ensure(core.length===0,'TASK_SOURCE_UNRESOLVED');
  ensure(invokedPath(lines,allowed[0]),'TASK_SOURCE_UNRESOLVED');
  return allowed[0];
}

function taskEntrypoint(xml){
  ensure(typeof xml==='string'&&xml.length<2*1024*1024,'TASK_XML_UNREADABLE');
  const actions=[...xml.matchAll(/<Actions(?:\s[^>]*)?>([\s\S]*?)<\/Actions\s*>/gi)];
  ensure(actions.length===1,'TASK_ACTION_UNRESOLVED');
  const execs=[...actions[0][1].matchAll(/<Exec(?:\s[^>]*)?>([\s\S]*?)<\/Exec\s*>/gi)];
  ensure(execs.length===1&&actions[0][1].replace(/<Exec(?:\s[^>]*)?>[\s\S]*?<\/Exec\s*>/gi,'').trim()==='',
    'TASK_ACTION_UNRESOLVED');
  const command=field(execs[0][1],'Command');
  const args=field(execs[0][1],'Arguments');
  const workdir=field(execs[0][1],'WorkingDirectory',false);
  ensure(absolute(command)&&(!workdir||absolute(workdir)),'TASK_ACTION_UNRESOLVED');
  const binary=W.basename(command).toLowerCase();
  if(['wscript.exe','cscript.exe','cmd.exe','node.exe'].includes(binary)){
    ensure(!/[&|<>^%!\r\n]/.test(args),'TASK_ACTION_UNRESOLVED');
    const scripts=references(args);
    const selected=only(scripts,'TASK_ACTION_UNRESOLVED');
    ensure(absolute(selected),'TASK_ACTION_UNRESOLVED');
    ensure(binary!=='node.exe'||/\.mjs$/i.test(selected),'TASK_ACTION_UNRESOLVED');
    ensure(binary!=='cmd.exe'||/\.cmd$/i.test(selected),'TASK_ACTION_UNRESOLVED');
    ensure(!['wscript.exe','cscript.exe'].includes(binary)||/\.vbs$/i.test(selected),'TASK_ACTION_UNRESOLVED');
    // All other command tokens must be runner switches, not a second program.
    const remainder=args.replace(new RegExp(selected.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'i'),'');
    ensure(!/\.(?:cmd|vbs|mjs)\b/i.test(remainder),'TASK_ACTION_UNRESOLVED');
    return selected;
  }
  ensure(/\.(?:vbs|cmd|mjs)$/i.test(command),'TASK_ACTION_UNRESOLVED');
  return W.normalize(command);
}

function followLauncher(initial,{readFile,exists},diagnostic){
  let current=initial;
  const visited=new Set();
  for(let depth=0;depth<5;depth++){
    const kind=/\.mjs$/i.test(current)?'MJS':/\.vbs$/i.test(current)?'VBS':/\.cmd$/i.test(current)?'CMD':'OTHER';
    diagnostic.step=`HOP_${depth+1}_${kind}_CHECK`;
    ensure(absolute(current),'TASK_SOURCE_UNRESOLVED');
    ensure(exists(current),'TASK_SOURCE_UNRESOLVED');
    const key=current.toLowerCase();
    ensure(!visited.has(key),'TASK_SOURCE_UNRESOLVED');
    visited.add(key);
    if(/\.mjs$/i.test(current)){
      const match=LEAF.exec(current);
      ensure(match,'TASK_SOURCE_UNRESOLVED');
      return W.normalize(match[1]);
    }
    ensure(/\.(?:cmd|vbs)$/i.test(current),'TASK_SOURCE_UNRESOLVED');
    const bytes=readFile(current);
    ensure(Buffer.byteLength(bytes)<65536,'TASK_SOURCE_UNRESOLVED');
    const text=decode(bytes);
    const lines=text.split(/\r?\n/).filter(line=>!/^[\s]*(?:rem\b|::|')/i.test(line));
    diagnostic.step=`HOP_${depth+1}_${kind}_REFERENCES`;
    current=followedReference(lines);
  }
  fail('TASK_SOURCE_UNRESOLVED');
}

function verifySqlite(candidate){
  const db=new DatabaseSync(candidate,{readOnly:true,timeout:2000});
  try{
    ensure(db.prepare('PRAGMA quick_check(1)').get()?.quick_check==='ok','CANDIDATE_DB_INVALID');
    const required=[EMPLOYMENT_R6_TABLES.observationCurrent,EMPLOYMENT_R6_TABLES.observationHistory];
    for(const name of required){
      ensure(db.prepare("SELECT 1 AS present FROM sqlite_master WHERE type='table' AND name=?")
        .get(name)?.present===1,'CANDIDATE_DB_INVALID');
    }
    return true;
  }finally{db.close();}
}

/**
 * Result always has {status,candidateDbPath}. Only CANDIDATE_FOUND_READONLY
 * may include a path; it conveys file identity, never promotion approval.
 * testInject is solely for deterministic, side-effect-free path/task tests.
 */
export function locateEmploymentR6Candidate({outputDir,coreDbPath,pcHome,
  testInject={},includeDiagnosticStep=false}={}){
  // Fixed codes only: do not return launcher paths, Task XML or config secrets.
  const diagnostic={step:'INPUT'};
  const io={
    readTaskXml:queryTask,
    readFile:file=>fs.readFileSync(file),
    exists:file=>fs.existsSync(file),
    realpath:file=>fs.realpathSync.native(file),
    gitHead:root=>execFileSync('git',['rev-parse','HEAD'],{
      cwd:root,encoding:'utf8',windowsHide:true,timeout:10000,
      stdio:['ignore','pipe','ignore'],
    }).trim(),
    gitClean:root=>{
      execFileSync('git',['diff','--quiet','HEAD','--','lib','worker','scripts/pc-writer'],{
        cwd:root,windowsHide:true,timeout:10000,stdio:'ignore',
      });
      return true;
    },
    validateDb:verifySqlite,
    ...testInject,
  };
  const done=(status,candidateDbPath=null)=>({status,candidateDbPath,
    ...(includeDiagnosticStep?{diagnosticStep:diagnostic.step}:{})});
  try{
    // With no trusted Windows PC context, never infer an E: source root.
    const home=pcHome??process.env.ZGMINI_PC_HOME??
      (process.platform==='win32'&&process.env.USERPROFILE?
        W.join(process.env.USERPROFILE,'.zgmini','pc-writer'):null);
    ensure(absolute(outputDir)&&absolute(coreDbPath)&&absolute(home),'LOCATOR_INPUT_UNVERIFIED');
    diagnostic.step='TASK_QUERY';
    const xml=decode(io.readTaskXml());
    diagnostic.step='TASK_ACTION';
    const root=followLauncher(taskEntrypoint(xml),io,diagnostic);
    diagnostic.step='PC_SOURCE_APPROVAL';
    const approved=JSON.parse(decode(io.readFile(W.join(home,'config.json'))));
    const source=io.gitHead(root);
    ensure(SHA.test(source)&&approved?.source===source&&approved?.enabled===true
      &&approved?.collectionTarget==='pc'&&io.gitClean(root)===true,
      'TASK_SOURCE_NOT_APPROVED');
    diagnostic.step='CANDIDATE_LIST';
    const candidates=[W.join(outputDir,NAME),W.join(root,'scripts','pc-writer',NAME)]
      .filter(file=>io.exists(file));
    ensure(io.exists(coreDbPath)&&io.exists(W.join(home,'storage','core.sqlite'))&&
      W.normalize(io.realpath(coreDbPath)).toLowerCase()===
        W.normalize(io.realpath(W.join(home,'storage','core.sqlite'))).toLowerCase(),
      'CORE_DB_UNVERIFIED');
    if(candidates.length===0)return done('CANDIDATE_NOT_FOUND');
    diagnostic.step='CANDIDATE_IDENTITY';
    const located=new Map();
    for(const file of candidates){
      const real=io.realpath(file);
      ensure(absolute(real),'CANDIDATE_IDENTITY_UNVERIFIED');
      located.set(W.normalize(real).toLowerCase(),file);
    }
    if(located.size!==1)return done('AMBIGUOUS_CANDIDATE');
    const candidate=located.values().next().value;
    ensure(W.normalize(io.realpath(coreDbPath)).toLowerCase()!==
      W.normalize(io.realpath(candidate)).toLowerCase(),'CANDIDATE_IS_CORE_DB');
    diagnostic.step='CANDIDATE_DB_VALIDATION';
    ensure(io.validateDb(candidate)===true,'CANDIDATE_DB_INVALID');
    diagnostic.step='CANDIDATE_VERIFIED_READONLY';
    return done('CANDIDATE_FOUND_READONLY',candidate);
  }catch(error){
    const known=new Set(['LOCATOR_INPUT_UNVERIFIED','TASK_XML_UNREADABLE',
      'TASK_ACTION_UNRESOLVED','TASK_SOURCE_UNRESOLVED','TASK_SOURCE_NOT_APPROVED',
      'CANDIDATE_IDENTITY_UNVERIFIED','CORE_DB_UNVERIFIED','CANDIDATE_IS_CORE_DB',
      'CANDIDATE_DB_INVALID']);
    const code=known.has(error?.code)
      ?error.code:'LOCATOR_READONLY_UNAVAILABLE';
    return done(code);
  }
}
