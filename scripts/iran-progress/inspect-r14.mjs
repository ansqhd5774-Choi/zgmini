// Read-only operational evidence; never prints raw source bodies or credentials.
import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {execFileSync} from 'node:child_process';
import {collectionTaskReadback} from './collection-policy.mjs';
const base=process.env.ZGMINI_IRAN_HOME??path.join(os.homedir(),'.zgmini','iran-progress-r13');
const db=new DatabaseSync(path.join(base,'iran.sqlite'),{readOnly:true});
const checkpoint=name=>{const r=db.prepare('SELECT body FROM checkpoints WHERE name=?').get(name);return r?JSON.parse(r.body):null;};
const count=table=>db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get().count;
const cp=checkpoint('gdelt-events-r14'),index=checkpoint('gdelt-events-index-r14');
const archives=db.prepare("SELECT body FROM sources WHERE id LIKE 'gdelt-export:%'").all().map(r=>JSON.parse(r.body));
let task={status:'NOT_FOUND'};
try{const xml=execFileSync('schtasks.exe',['/Query','/TN','ZGMINI-PC-Iran-Progress-R13','/XML'],{encoding:'utf8',windowsHide:true});
 task={status:collectionTaskReadback(xml,path.join(base,'run.vbs'))?'CONFIGURATION_VERIFIED':'READBACK_FAILED',wake:false,triggersKst:['00:00','06:00','12:00','18:00']};
}catch{}
console.log(JSON.stringify({checkpoint:cp?{...cp,nextAtUtc:new Date(cp.nextAt).toISOString(),targetAtUtc:new Date(cp.targetAt).toISOString(),remainingSlices:Math.max(0,Math.floor((cp.targetAt-cp.nextAt)/900000)+1)}:null,
 index:index?{checkedAt:index.checkedAt,entries:index.entries?.length}:null,
 archives:{count:archives.length,bytes:archives.reduce((s,r)=>s+r.archiveBytes,0),rowsRead:archives.reduce((s,r)=>s+r.rowsRead,0),checksumsVerified:archives.every(r=>r.checksumVerified&&/^[a-f0-9]{64}$/.test(r.sha256))},
 candidates:count('discovery_candidates'),verifiedRevisions:count('event_revisions'),publications:count('publications'),
 lease:db.prepare('SELECT until_at FROM lease').get()??null,
 collection:checkpoint('collection-last-run-r14'),task,rawArchives:fs.existsSync(path.join(base,'gdelt-archives'))?fs.readdirSync(path.join(base,'gdelt-archives')).length:0}));
db.close();
