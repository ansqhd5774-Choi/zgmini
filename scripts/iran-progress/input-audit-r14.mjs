import {DatabaseSync} from 'node:sqlite';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {buildIranProgress,latestEvents} from '../../lib/iran-progress/r13.mjs';
import {H_TRANSIT_METHOD} from '../../lib/iran-progress/transit-ais.mjs';
import {hash} from './store.mjs';

// Read-only diagnostics use the same AIS row verification contract as run.mjs.
// They never create verified-input, verification receipts, calculations or publications.
export function auditInputs({verified=null,ais=null,policy=null,events=[]},now){
 const input={...(verified??{}),events};
 input.transit={method:H_TRANSIT_METHOD,source:'hormuz.now',termsApproved:true,
  upstreamTermsVerified:policy?.upstreamTermsVerified===true,restriction:verified?.aisRestriction,
  rows:(ais?.rows??[]).map(r=>({...r,qualityVerified:policy?.days?.[r.date]?.verified===true&&policy.days[r.date].rowHash===hash(r)})),
  observationDate:ais?.observationDate,sourceStoredAt:ais?.sourceStoredAt};
 const result=buildIranProgress(input,now),current=latestEvents(events,now);
 return {version:'IRAN_INPUT_AUDIT_R14',checkedAt:now,status:result.status,score:result.score,
  missing:result.missing,inputPresent:verified!==null,aisPolicyPresent:policy!==null,
  relations:Object.fromEntries(['IRN_ISR','IRN_USA'].map(axis=>[axis,{
   inputPresent:!!verified?.relations?.[axis],lastVerifiedAt:verified?.relations?.[axis]?.lastVerifiedAt??null,
   state:result.relations[axis]}])),
  militaryAxes:Object.fromEntries(Object.entries(result.military.axes??{}).map(([axis,s])=>[axis,{status:s.status,reason:s.reason??null}])),
  coveragePresent:Object.fromEntries(['IRN_ISR','IRN_USA','LINKED'].map(axis=>[axis,!!verified?.coverage?.[axis]])),
  hormuzCoveragePresent:!!verified?.hormuzCoverage,nuclearPresent:!!verified?.nuclear,
  ais:{observationDate:ais?.observationDate??null,rows:input.transit.rows.length,
   qualityVerifiedRows:input.transit.rows.filter(r=>r.qualityVerified).length,
   upstreamTermsVerified:input.transit.upstreamTermsVerified,restrictionPresent:!!verified?.aisRestriction,
   reason:result.hormuz.reason??null},
  events:{verified:current.filter(e=>e.status==='VERIFIED').length,
   materialPending:current.filter(e=>e.material===true&&e.status==='PENDING_REVIEW').map(e=>({eventId:e.eventId,axis:e.axis,eventAt:e.eventAt,holds:e.holds??[]}))},
  publication:'NOT_REQUESTED'};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv.length!==2)throw Error('INPUT_AUDIT_ARGS_INVALID');
 const base=process.env.ZGMINI_IRAN_HOME??path.join(os.homedir(),'.zgmini','iran-progress-r13');
 const db=new DatabaseSync(path.join(base,'iran.sqlite'),{readOnly:true});
 try{
  db.exec('BEGIN');
  const checkpoint=name=>{const r=db.prepare('SELECT body FROM checkpoints WHERE name=?').get(name);return r?JSON.parse(r.body):null;};
  let ais=null;
  // Historical provider bodies are not printed or reinterpreted as verified evidence.
  for(const row of db.prepare("SELECT body FROM sources WHERE id LIKE 'ais:%' ORDER BY stored_at DESC").iterate()){
   const candidate=JSON.parse(row.body);if(candidate.status==='COLLECTED'&&Array.isArray(candidate.rows)){ais=candidate;break;}
  }
  const report=auditInputs({verified:checkpoint('verified-input'),policy:checkpoint('ais-verification'),ais,
   events:db.prepare('SELECT body FROM event_revisions').all().map(r=>JSON.parse(r.body))},Date.now());
  db.exec('COMMIT');console.log(JSON.stringify(report));
 }finally{db.close();}
}
