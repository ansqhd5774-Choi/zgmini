import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';
import {client,credential,read,save} from './d1.mjs';
import {prepareStagflation,publishStagflation} from './stagflation-publication.mjs';

// A separate stored-data publisher lets the current Core/Korea release stay pinned.
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const base=process.env.ZGMINI_PC_HOME??path.join(os.homedir(),'.zgmini','pc-writer');
const config=read(path.join(base,'config.json'));
const publish=process.argv.includes('--publish');
const source=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8',windowsHide:true}).trim();
if(config.stagflationS21Publication!==true){console.log(JSON.stringify({status:'DISABLED'}));process.exit(0);}
if(publish){
 if(config.enabled!==true||config.collectionTarget!=='pc'||config.stagflationS21Source!==source)throw Error('STAGFLATION_SOURCE_NOT_APPROVED');
 execFileSync('git',['diff','--quiet','HEAD','--','scripts/pc-writer/publish-stagflation.mjs','scripts/pc-writer/stagflation-publication.mjs','scripts/pc-writer/d1.mjs','lib/diagnostic-layer/stagflation-s21.mjs','worker/stagflation-public.mjs','worker/public-display-freshness.mjs'],{cwd:root,windowsHide:true});
}
const lock=path.join(base,'stagflation-s21-publication.lock');
// Never delete an unknown/stale lock automatically: it may represent an uncertain write.
let fd;try{fd=fs.openSync(lock,'wx');}catch(e){if(e.code==='EEXIST'){console.log(JSON.stringify({status:'ALREADY_RUNNING_OR_REVIEW_REQUIRED'}));process.exit(0);}throw e;}
let db;
const report={at:new Date().toISOString(),source,providerCalls:0,localDbWrites:0,mode:publish?'PUBLISH':'PREPARE'};
try{
 fs.writeFileSync(fd,JSON.stringify({pid:process.pid,at:report.at}));
 db=new DatabaseSync(path.join(base,'storage','core.sqlite'),{readOnly:true});
 const core={prepare(sql){if(!/^SELECT /i.test(sql))throw Error('STAGFLATION_READ_ONLY_REQUIRED');return {async first(){return db.prepare(sql).get()}}}};
 const prepared=await prepareStagflation(core,{enabled:true});
 Object.assign(report,{status:prepared.status,score:prepared.body?.score??null,observationMonth:prepared.body?.observationMonth??null,historyCount:prepared.body?.history.length??0,reason:prepared.reason??null});
 if(publish&&prepared.prepared){
  const remote=client(config,credential(root));
  report.publication=(await publishStagflation(remote,config.core,prepared)).status;
  report.remote=remote.stats;
 }
}catch(e){report.status='FAILED';report.error=/^[A-Z0-9_]+$/.test(e.message??'')?e.message:'STAGFLATION_PUBLICATION_FAILED';process.exitCode=1;}
finally{
 db?.close();fs.closeSync(fd);fs.unlinkSync(lock);
 save(path.join(base,'local-stagflation-s21-last-run.json'),report);console.log(JSON.stringify(report));
}
