// R88 stored-only replay for the shared operational platform. A caller must
// inject the real, already-read public base; this module never fetches prices,
// reads D1, writes candidate files or alters an existing publisher/schedule.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {readNineR45SavedDates,compileNineR45PrivateEodFeed} from
 './theme-nine-r45-private-eod-feed.mjs';
import {calculateNineR88} from './theme-nine-r88-provisional.mjs';
import {R88_VERSION,R88_PRICE_MODE,validNineR88,R88_PUBLIC_ROSTER} from
 '../../worker/theme-nine-r88-provisional.mjs';
import {THEME_NINE_R37_METHOD,THEME_NINE_R37_VERSION} from
 '../../worker/theme-nine-r37-public.mjs';

const name=/^THEME_NINE_R88_PROVISIONAL_(\d{4}-\d{2}-\d{2})_([a-f0-9]{64})\.json$/;
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const fail=code=>{throw Object.assign(new Error('THEME_STORED_R88_'+code),
 {code:'THEME_STORED_R88_'+code});};
const need=(ok,code)=>{if(!ok)fail(code);};
const bytesFor=record=>Buffer.from(JSON.stringify(record,null,2)+'\n');

function savedCandidate(dataRoot,{targetDate}={}){
 const root=fs.realpathSync(dataRoot);
 const dir=path.join(root,'themes','legacy-nine-r88-provisional');
 if(!fs.existsSync(dir))fail('CANDIDATE_DIRECTORY_MISSING');
 need(fs.realpathSync(dir)===dir&&fs.lstatSync(dir).isDirectory()&&
  !fs.lstatSync(dir).isSymbolicLink(),'CANDIDATE_DIRECTORY_REDIRECT');
 const found=[];
 for(const entry of fs.readdirSync(dir)){
  const match=name.exec(entry);
  if(!match||targetDate&&match[1]!==targetDate)continue;
  const file=path.join(dir,entry),stat=fs.lstatSync(file);
  need(stat.isFile()&&!stat.isSymbolicLink()&&fs.realpathSync(file)===file,
   'CANDIDATE_PATH_REDIRECT');
  const bytes=fs.readFileSync(file);
  need(sha(bytes)===match[2],'CANDIDATE_FILENAME_SHA_MISMATCH');
  let record;
  try{record=JSON.parse(bytes);}catch{fail('CANDIDATE_JSON_INVALID');}
  const asOf=Date.parse(record?.asOf);
  need(Number.isFinite(asOf)&&record.observationDate===match[1]&&
   sha(bytesFor(record))===match[2],'CANDIDATE_CONTENT_MISMATCH');
  found.push({record,bytes,sha256:match[2],asOf});
 }
 if(!found.length)fail('SAVED_CANDIDATE_NOT_FOUND');
 const selectedDate=targetDate??found.map(f=>f.record.observationDate).sort().at(-1);
 const latest=found.filter(f=>f.record.observationDate===selectedDate)
  .sort((a,b)=>b.asOf-a.asOf||a.sha256.localeCompare(b.sha256));
 need(latest.length===1||latest[0].asOf!==latest[1].asOf,
  'SAVED_CANDIDATE_AMBIGUOUS');
 return latest[0];
}

export async function calculateStoredR88({dataRoot,publicBase,confirmedResult,
 targetDate=null,now=new Date(),decoder=null,
 readSaved=readNineR45SavedDates,compile=compileNineR45PrivateEodFeed,
 calculate=calculateNineR88,validate=validNineR88}={}){
 need(typeof dataRoot==='string'&&dataRoot,'DATA_ROOT_REQUIRED');
 need(now instanceof Date&&!Number.isNaN(now.getTime()),'CLOCK_REQUIRED');
 // A missing or older public R37 anchor cannot be replaced by a private score.
 need(publicBase?.status==='READY'&&
  publicBase.modelRevision===THEME_NINE_R37_VERSION&&
  publicBase.methodologyVersion===THEME_NINE_R37_METHOD&&
  publicBase.r32ProvisionalReaderVersion===R88_VERSION&&
  /^\d{4}-\d{2}-\d{2}$/.test(publicBase.confirmedObservationDate??''),
  'PUBLIC_CONFIRMED_R32_BASE_REQUIRED');
 const context=confirmedResult?.replayContext;
 need(context?.scores?.source&&context.sessions instanceof Map&&
  context.evidence?.roster,'CONFIRMED_REPLAY_CONTEXT_REQUIRED');
 const saved=savedCandidate(dataRoot,{targetDate});
 const date=saved.record.observationDate,baseDate=publicBase.confirmedObservationDate;
 need(date>baseDate,'PROVISIONAL_DATE_AFTER_CONFIRMED_REQUIRED');
 // Recreate exactly the immutable candidate's original asOf. Replaying with
 // the current clock would generate a different hash for the same scores.
 const rows=await readSaved({dataRoot,dates:[baseDate,date],decoder});
 const parquet={...compile({roster:context.evidence.roster,
  verifiedRowsByDate:rows.rows,shaByDate:rows.hashes}),
  sourceStoredAt:rows.sourceStoredAt};
 const record=calculate({base:publicBase,sessions:context.sessions,
  scores:context.scores,evidence:context.evidence,parquet,now:saved.asOf});
 need(record?.status==='READY'&&record.version===R88_VERSION&&
  record.phase==='PROVISIONAL'&&record.methodologyVersion===THEME_NINE_R37_METHOD&&
  record.sourcePriceMode===R88_PRICE_MODE&&record.observationDate===date&&
  Array.isArray(record.themes)&&record.themes.length===R88_PUBLIC_ROSTER.length,
  'R88_APPROVED_PROVISIONAL_CONTRACT');
 need(sha(bytesFor(record))===saved.sha256&&
  Buffer.compare(saved.bytes,bytesFor(record))===0,
  'SAVED_CANDIDATE_REPLAY_MISMATCH');
 // The public Reader's eight-day freshness gate must not invalidate an
 // otherwise byte-identical historical replay. Its D1 stored_at is not the
 // local candidate file's mtime. Check structural Reader compatibility at
 // the candidate's historical time, but do not claim current visibility
 // until an actual D1 readback supplies that independent timestamp.
 const replayClock=Math.max(saved.asOf,Date.parse(record.sourceStoredAt),
  Date.parse(date+'T23:59:59Z'));
 need(Number.isSafeInteger(replayClock)&&
  validate(record,publicBase,{now:replayClock,storedAt:replayClock}),
  'R88_HISTORICAL_READER_CONTRACT_INVALID');
 return {artifactSha256:saved.sha256,
  historicalReaderContract:'SHAPE_VERIFIED_WITH_REPLAY_CLOCK',
  currentVisibility:'UNKNOWN_D1_STORED_AT_NOT_READ',
  rows:record.themes.map(t=>({
  label:t.theme,etfs:t.approvedEtfs,methodologyVersion:record.methodologyVersion,
  observationDate:record.observationDate,score:t.points.at(-1)?.score,
  points:t.points,confirmedObservationDate:record.confirmedObservationDate,
  sourceVersion:record.sourceVersion,
 }))};
}
