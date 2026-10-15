// Explicit status publication from stored verified inputs; never publishes a score.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {openStore} from './store.mjs';
import {buildIranProgress} from '../../lib/iran-progress/r13.mjs';
import {publishIranStatus} from './publication.mjs';
import {client,credential} from '../pc-writer/d1.mjs';
import {fileURLToPath} from 'node:url';
if(process.argv.length!==3||process.argv[2]!=='--publish')throw Error('IRAN_STATUS_ARGS_INVALID');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const base=process.env.ZGMINI_IRAN_HOME??path.join(os.homedir(),'.zgmini','iran-progress-r13');
const store=openStore(path.join(base,'iran.sqlite')),owner=randomUUID(),now=Date.now();
try{
 if(!store.claim(owner,now))throw Error('IRAN_STATUS_LEASE_HELD');
 const input={...(store.getCheckpoint('verified-input')??{}),events:store.events()};
 const result=buildIranProgress(input,now);
 // READY belongs to the separately gated complete publisher, not this status lane.
 if(result.status!=='PENDING')throw Error('IRAN_READY_PUBLICATION_REQUIRED');
 const id=store.calculate(input,result);
 const config=JSON.parse(fs.readFileSync(path.join(os.homedir(),'.zgmini','pc-writer','config.json'),'utf8'));
 const published=await publishIranStatus(client(config,credential(root)),config.core,result);
 const report={id,status:result.status,score:null,missing:result.missing,calculatedAt:now,publication:published.status};
 store.checkpoint('status-publication-r14',report);
 console.log(JSON.stringify(report));
}finally{store.release(owner);store.close();}
