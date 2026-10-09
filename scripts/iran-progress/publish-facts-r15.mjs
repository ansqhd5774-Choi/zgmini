import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import {openStore} from './store.mjs';
import {buildOfficialFacts} from './facts-r15.mjs';
import {publishOfficialFacts} from './publication.mjs';
import {client,credential} from '../pc-writer/d1.mjs';
if(process.argv.length!==3||!['--preview','--publish'].includes(process.argv[2]))throw Error('FACT_ARGS_INVALID');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const base=process.env.ZGMINI_IRAN_HOME??path.join(os.homedir(),'.zgmini','iran-progress-r13');
const store=openStore(path.join(base,'iran.sqlite')),owner=randomUUID(),now=Date.now();
try{
 if(!store.claim(owner,now))throw Error('FACT_LEASE_HELD');
 const body=buildOfficialFacts(store,now);
 if(process.argv[2]==='--preview')console.log(JSON.stringify(body));
 else{
  const config=JSON.parse(fs.readFileSync(path.join(os.homedir(),'.zgmini','pc-writer','config.json'),'utf8'));
  const result=await publishOfficialFacts(client(config,credential(root)),config.core,body,{now});
  store.checkpoint('facts-publication-r15',{...result,factCount:body.facts.length});
  console.log(JSON.stringify({...result,factCount:body.facts.length,score:null,currentStateVerified:false}));
 }
}finally{store.release(owner);store.close();}
