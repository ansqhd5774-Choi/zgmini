import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {hash,read,save} from './d1.mjs';

// UI/content commits do not change the approved publisher contract.
export function affectsPublication(file){
 // Iran uses a separate collector and publisher; it is not a core PC writer dependency.
 if(file.startsWith('lib/iran-progress/')||file==='worker/iran-progress-public.mjs')return false;
 return /^(worker\/|lib\/)/.test(file)||/^package(?:-lock)?\.json$/.test(file)||
  (file.startsWith('scripts/pc-writer/')&&!/(?:^|\/)(?:backfill-|backtest-|inspect-|probe-|check-|verify-|read-)/.test(file)&&!file.endsWith('.test.mjs'));
}
export function publicationCompatibility(root,approved,source,main){
 if(!/^[a-f0-9]{40}$/.test(approved??''))return {status:'SOURCE_APPROVAL_MISSING'};
 const changes=new Set();
 for(const ref of [approved,main]){
  const files=execFileSync('git',['diff','--name-only',ref,source,'--'],{cwd:root,encoding:'utf8',windowsHide:true}).trim().split(/\r?\n/).filter(Boolean);
  for(const file of files.filter(affectsPublication))changes.add(file);
 }
 return changes.size?{status:'PUBLICATION_CONTRACT_CHANGED',files:[...changes].sort()}:null;
}

export async function recoverPublication(remote,db,base,now=Date.now()){
 const file=path.join(base,'local-publication-ledger.json');
 if(!fs.existsSync(file)||read(file).status!=='SUBMITTING')return null;
 const pending=read(file);
 // Read failure or a live remote writer keeps the pending record untouched.
 const job=(await remote.query(db,"SELECT lease_until FROM market_collection_jobs_v1 WHERE job='pipeline'")).results?.[0];
 if(Number(job?.lease_until)>now)throw Error('REMOTE_PUBLICATION_STILL_RUNNING');
 const market=(await remote.query(db,"SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key='current'")).results?.[0];
 const ledgerFile=path.join(base,'local-market-ledger.json');
 const ledger=fs.existsSync(ledgerFile)?read(ledgerFile):null;
 let outcome='NOT_APPLIED';
 if(market){
  const body=JSON.parse(market.body);
  if(body?.status!=='SUCCESS'||!Number.isSafeInteger(market.stored_at))throw Error('PUBLICATION_READBACK_INVALID');
  if(ledger?.storedAt===market.stored_at&&ledger.bodyHash&&hash(body)!==ledger.bodyHash)throw Error('PUBLICATION_READBACK_CONFLICT');
  outcome=market.stored_at>=(ledger?.storedAt??pending.at)?'APPLIED_OR_SUPERSEDED':'PARTIAL';
 }
 // Preserve evidence. This is not VERIFIED: remaining outputs are reconciled
 // individually by timestamp/source checkpoint during the following publication.
 save(path.join(base,`local-publication-ledger.readback-${pending.at}.json`),{...pending,readbackAt:now,outcome});
 const recovered={...pending,status:'READBACK_RECOVERED',readbackAt:now,outcome};
 save(file,recovered);
 return recovered;
}

export function appendPublicationEvent(base,event){
 fs.appendFileSync(path.join(base,'publication-events.jsonl'),JSON.stringify(event)+'\n');
}
