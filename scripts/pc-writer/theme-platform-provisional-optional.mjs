// Read-only, existing-writer provisional proof for the two optional public
// themes. Callers inject an approved fixed-key D1 reader; no client, token,
// collector, writer, scheduler, or publication is created by this module.
import {createHash} from 'node:crypto';
import {identity} from './theme-platform.mjs';
import {buildDcProvisionalFromStorageR8} from './theme-data-center-power-provisional-r8.mjs';
import {buildSpaceProvisionalFromStorageR8} from './theme-space-satellite-provisional-r8.mjs';
import {DC_POWER_PUBLIC_KEY,DC_POWER_PUBLIC_VERSION} from
 '../../worker/theme-data-center-power-r1.mjs';
import {DC_POWER_PROVISIONAL_KEY,validDcPowerProvisionalR1} from
 '../../worker/theme-data-center-power-provisional-r1.mjs';
import {SPACE_SATELLITE_R2_PUBLIC_KEY,SPACE_SATELLITE_R2_PUBLIC_VERSION} from
 '../../worker/theme-space-satellite-r2.mjs';
import {SPACE_PROVISIONAL_KEY,validSpaceProvisionalR1} from
 '../../worker/theme-space-satellite-provisional-r1.mjs';

const need=(ok,code)=>{if(!ok)throw Object.assign(new Error(code),{code});};
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const date=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s);
const score=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=100;
const families={
 'data-center':{id:'data-center-power',label:'데이터센터·전력',
  confirmedKey:DC_POWER_PUBLIC_KEY,confirmedVersion:DC_POWER_PUBLIC_VERSION,
  provisionalKey:DC_POWER_PROVISIONAL_KEY,
  validate:validDcPowerProvisionalR1,
  etfs:['DTCR','GRID']},
 space:{id:'space-satellite',label:'우주·위성',
  confirmedKey:SPACE_SATELLITE_R2_PUBLIC_KEY,
  confirmedVersion:SPACE_SATELLITE_R2_PUBLIC_VERSION,
  provisionalKey:SPACE_PROVISIONAL_KEY,
  validate:validSpaceProvisionalR1,
  etfs:['UFO','NASA','WARP','ROKT']},
};

export function createVerifiedOptionalProvisionalCalculator({readFeed,
 buildDc=buildDcProvisionalFromStorageR8,
 buildSpace=buildSpaceProvisionalFromStorageR8,now=new Date(),decoder=null}={}){
 need(typeof readFeed==='function','THEME_OPTIONAL_APPROVED_D1_READER_REQUIRED');
 need(now instanceof Date&&!Number.isNaN(now.getTime()),'THEME_OPTIONAL_CLOCK_INVALID');
 return async({dataRoot,theme,group,confirmedResult}={})=>{
  const family=families[group];
  need(family&&theme?.id===family.id&&theme.label===family.label&&
   JSON.stringify(theme.etfs)===JSON.stringify(family.etfs),
   'THEME_OPTIONAL_FAMILY_OR_ROSTER_MISMATCH');
  // Only these four existing keys are ever passed to the supplied reader.
  const [confirmedRow,provisionalRow]=await Promise.all([
   readFeed(family.confirmedKey),readFeed(family.provisionalKey)]);
  need(confirmedRow?.body,'THEME_OPTIONAL_CONFIRMED_D1_MISSING');
  need(provisionalRow?.body,'THEME_OPTIONAL_PROVISIONAL_D1_MISSING');
  const confirmed=confirmedRow.body,published=provisionalRow.body;
  need(confirmed.status==='READY'&&confirmed.phase==='CONFIRMED'&&
   confirmed.version===family.confirmedVersion&&
   confirmed.theme===family.label&&
   confirmed.methodologyVersion===theme.methodologyVersion&&
   confirmed.referenceSymbol==='SPY'&&Array.isArray(confirmed.etfs)&&
   (group==='data-center'?JSON.stringify(confirmed.etfs)===JSON.stringify(family.etfs):
    confirmed.etfs.length>=3&&
    confirmed.etfs.every(ticker=>family.etfs.includes(ticker)))&&
   date(confirmed.observationDate)&&score(confirmed.score)&&
   confirmed.history?.length===252&&
   confirmed.history.at(-1)?.date===confirmed.observationDate&&
   confirmed.history.at(-1)?.score===confirmed.score&&
   typeof confirmed.sourceVersion==='string'&&
   Number.isSafeInteger(Number(confirmedRow.storedAt))&&
   Number(confirmedRow.storedAt)>0&&
   Number(confirmedRow.storedAt)<=now.getTime(),
   'THEME_OPTIONAL_CONFIRMED_D1_INVALID');
  const saved=confirmedResult?.rows?.find(row=>row.label===family.label);
  const spaceLineage=/^GMH_MANIFEST_SHA256_([a-f0-9]{64})_SPY_SHA256_([a-f0-9]{64})$/
   .exec(confirmed.sourceVersion);
  const expectedSavedSource=group==='space'&&spaceLineage?
   identity({spaceManifestSha256:spaceLineage[1],
    sharedSpyManifestSha256:spaceLineage[2]}):confirmed.sourceVersion;
  need(saved&&saved.observationDate===confirmed.observationDate&&
   saved.score===confirmed.score&&
   saved.sourceVersion===expectedSavedSource&&saved.history?.length===252&&
   saved.history.every((p,i)=>p.date===confirmed.history[i]?.date&&
    p.score===confirmed.history[i]?.score),
   'THEME_OPTIONAL_STORED_CONFIRMED_NOT_EQUAL_D1');
  need(date(published?.confirmedObservationDate)&&
   published.confirmedObservationDate===confirmed.observationDate&&
   typeof published.asOf==='string'&&Number.isFinite(Date.parse(published.asOf))&&
   Date.parse(published.asOf)<=now.getTime()&&
   Number.isSafeInteger(Number(provisionalRow.storedAt))&&
   Number(provisionalRow.storedAt)>0,
   'THEME_OPTIONAL_PROVISIONAL_D1_INVALID');
  // The saved candidate embeds asOf. Replay at that original instant so a
  // different inspection time cannot turn an identical candidate into drift.
  const builder=group==='data-center'?buildDc:buildSpace;
  const replay=await builder({dataRoot,confirmed,now:Date.parse(published.asOf),
   decoder,targetObservationDate:published.observationDate});
  need(replay?.status==='PRIVATE_PROVISIONAL_CANDIDATE'&&replay.record,
   'THEME_OPTIONAL_PROVISIONAL_REPLAY_NOT_READY');
  need(JSON.stringify(replay.record)===JSON.stringify(published),
   'THEME_OPTIONAL_PROVISIONAL_D1_REPLAY_MISMATCH');
  const visible={theme:family.label,etfs:family.etfs,score:confirmed.score,
   history:confirmed.history};
  // Preserve the real Reader freshness rule for publication, but separate
  // historical replay identity from the question of visibility *today*.
  // Unlike R88, these records include the actual approved D1 stored_at.
  const storedAt=Number(provisionalRow.storedAt);
  need(storedAt<=now.getTime(),'THEME_OPTIONAL_D1_FUTURE_PUBLICATION');
  const replayClock=Math.max(Date.parse(published.asOf),
   Date.parse(published.sourceStoredAt),storedAt,
   Date.parse(published.observationDate+'T23:59:59Z'));
  need(Number.isSafeInteger(replayClock)&&
   family.validate(published,visible,{now:replayClock,storedAt}),
   'THEME_OPTIONAL_PUBLIC_READER_REJECTED');
  const currentVisibility=family.validate(published,visible,
   {now:now.getTime(),storedAt})?'READY':'STALE';
  const point=published.points.at(-1);
  need(point&&score(point.score)&&point.date===published.observationDate&&
   published.methodologyVersion===theme.methodologyVersion,
   'THEME_OPTIONAL_PROVISIONAL_PROJECTION_INVALID');
  return {artifactSha256:sha(Buffer.from(JSON.stringify(published))),
   historicalReaderContract:'VALID_AT_PUBLISHED_TIME',currentVisibility,
   rows:[{label:family.label,etfs:[...family.etfs],
    methodologyVersion:published.methodologyVersion,
    observationDate:published.observationDate,score:point.score,
    confirmedObservationDate:published.confirmedObservationDate,
    points:published.points,sourceVersion:published.sourceVersion}]};
 };
}
