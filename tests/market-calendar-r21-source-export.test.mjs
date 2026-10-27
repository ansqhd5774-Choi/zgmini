import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {runR21SourceExport} from '../scripts/pc-writer/market-calendar-r21-source-export.mjs';
import {worktreeIdentity} from '../scripts/pc-writer/market-calendar-r19-bea-apply.mjs';

const PC_HEAD='97a38c7cdfbb7e0d30eaeacea27b9605bbfa2b3b';
const sha=v=>createHash('sha256').update(v).digest('hex');

function fixture(t){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-r21-source-export-'));
 t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const root=path.join(dir,'core');
 const dataRoot=path.join(dir,'data');
 const outputDir=path.join(dir,'export');
 fs.mkdirSync(path.join(root,'scripts','pc-writer'),{recursive:true});
 fs.mkdirSync(path.join(root,'lib'),{recursive:true});
 fs.mkdirSync(dataRoot,{recursive:true});fs.mkdirSync(outputDir,{recursive:true});
 const collector=path.join(root,'scripts','pc-writer','release-calendar.mjs');
 const original=Buffer.from('// Installed PC collector (not the GitHub template).\nexport const pcCollector=true;\n');
 const parser=Buffer.from('R20 parser fixture');
 fs.writeFileSync(collector,original);
 fs.writeFileSync(path.join(root,'lib','release-calendar.mjs'),parser);
 fs.writeFileSync(path.join(dataRoot,'config.json'),JSON.stringify({source:PC_HEAD,enabled:true,collectionTarget:'pc',secret:'NEVER_EXPORTED'}));
 const reportPath=path.join(outputDir,'MARKET_CALENDAR_R21_PC_SOURCE_EXPORT_RESULT.txt');
 const options={reportPath,dataRoot,getTaskXml:()=>'',getCoreRoot:()=>root,
  gitCall:(_root,args)=>args[0]==='rev-parse'&&args[1]==='HEAD'?PC_HEAD:'a'.repeat(40),
  expectedWorktreeId:worktreeIdentity(root),expectedParserSha256:sha(parser)};
 return {root,dataRoot,outputDir,collector,original,reportPath,options};
}

test('exports actual PC collector, not a GitHub-derived baseline, without altering Core',t=>{
 const f=fixture(t);
 const before=fs.readFileSync(f.collector);
 const result=runR21SourceExport(f.options);
 assert.equal(result.decision,'PC_COLLECTOR_EXPORTED_READONLY');
 assert.equal(result.pcCollectorSha256,sha(f.original));
 assert.equal(result.collectorMatchesTrackedHead,true);
 assert.deepEqual(fs.readFileSync(f.collector),before);
 assert.deepEqual(fs.readFileSync(path.join(f.outputDir,result.exportedFile)),f.original);
 assert.equal(fs.readFileSync(path.join(f.dataRoot,'config.json'),'utf8').includes('NEVER_EXPORTED'),true);
 assert.equal(JSON.stringify(result).includes('NEVER_EXPORTED'),false);
});

test('read-only collector export records tracked-head drift without overwriting PC',t=>{
 const f=fixture(t);
 const opts={...f.options,gitCall:(_root,args)=>{
  if(args[0]==='rev-parse'&&args[1]==='HEAD')return PC_HEAD;
  return args[0]==='hash-object'?'b'.repeat(40):'a'.repeat(40);
 }};
 const result=runR21SourceExport(opts);
 assert.equal(result.decision,'PC_COLLECTOR_EXPORTED_WITH_TRACKED_DRIFT');
 assert.equal(result.collectorMatchesTrackedHead,false);
 assert.deepEqual(fs.readFileSync(f.collector),f.original);
});

test('stops before export if approved Core HEAD or config changes',t=>{
 const f=fixture(t);
 const first=runR21SourceExport({...f.options,approvedSource:'f'.repeat(40)});
 assert.equal(first.decision,'PC_HEAD_CHANGED_STOP');
 assert.equal(first.exportedFile,null);
 const config=path.join(f.dataRoot,'config.json');
 fs.writeFileSync(config,JSON.stringify({source:'changed',enabled:true,collectionTarget:'pc'}));
 const second=runR21SourceExport(f.options);
 assert.equal(second.decision,'PC_CONFIG_CHANGED_STOP');
 assert.deepEqual(fs.readdirSync(f.outputDir),[]);
});

test('stops before export on R20 parser mismatch',t=>{
 const f=fixture(t);
 const result=runR21SourceExport({...f.options,expectedParserSha256:'f'.repeat(64)});
 assert.equal(result.decision,'R20_PARSER_MISMATCH_STOP');
 assert.deepEqual(fs.readdirSync(f.outputDir),[]);
});
