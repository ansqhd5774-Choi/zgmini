// Bind the six *existing* physical D1 owners to the Stage4 public coordinator.
// This is an opt-in source bridge, NOT a new publisher, schedule or deployment.
// In particular the R37 owner retains its full nine-theme (including AI
// research) payload. It must never receive an eight-theme replacement record.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {planPublicPhysicalCycle} from './theme-platform-public-cycle.mjs';
import {runNineR54PublicConnect,approvedNineR54SevenToken} from './theme-nine-r54-public-connect.mjs';
import {createNineR54D1Query} from './theme-nine-r54-d1-client.mjs';
import {buildNineR88FromStorage} from './theme-nine-r88-provisional.mjs';
import {publishNineR88} from './theme-nine-r88-publish.mjs';
import {runDcPowerPublishR3} from './theme-data-center-power-publish-r3.mjs';
import {dcPowerVersionedD1} from './theme-data-center-power-d1-r3.mjs';
import {runSpacePublishR32} from './theme-space-satellite-publish-r32.mjs';
import {runDcPowerR8} from './theme-data-center-power-auto-r8.mjs';
import {runSpaceR8} from './theme-space-satellite-auto-r8.mjs';
import {R88_KEY,R88_VERSION} from '../../worker/theme-nine-r88-provisional.mjs';
import {THEME_NINE_R37_KEY} from '../../worker/theme-nine-r37-public.mjs';
import {DC_POWER_PUBLIC_KEY} from '../../worker/theme-data-center-power-r1.mjs';
import {DC_POWER_PROVISIONAL_KEY} from '../../worker/theme-data-center-power-provisional-r1.mjs';
import {SPACE_SATELLITE_R2_PUBLIC_KEY} from '../../worker/theme-space-satellite-r2.mjs';
import {SPACE_PROVISIONAL_KEY} from '../../worker/theme-space-satellite-provisional-r1.mjs';

const need=(condition,code)=>{
 if(!condition)throw Object.assign(new Error(code),{code});
};
const expected=Object.freeze([
 ['r37','confirmed',THEME_NINE_R37_KEY],
 ['r37','provisional',R88_KEY],
 ['data-center','confirmed',DC_POWER_PUBLIC_KEY],
 ['data-center','provisional',DC_POWER_PROVISIONAL_KEY],
 ['space','confirmed',SPACE_SATELLITE_R2_PUBLIC_KEY],
 ['space','provisional',SPACE_PROVISIONAL_KEY],
]);
const defaultOperations=Object.freeze({runR37:runNineR54PublicConnect,
 token:approvedNineR54SevenToken,query:createNineR54D1Query,
 buildR88:buildNineR88FromStorage,publishR88:publishNineR88,
 runDc:runDcPowerPublishR3,dcDb:dcPowerVersionedD1,
 runSpace:runSpacePublishR32,runDcR8:runDcPowerR8,runSpaceR8});
const ISO=/^\d{4}-\d{2}-\d{2}$/;

export async function readExistingThemePublic({fetchImpl=fetch,now=Date.now()}={}){
 const response=await fetchImpl(`https://zgmini.kr/api/theme-fear-greed/?theme_stage4=${now}`,{
  method:'GET',redirect:'error',headers:{'cache-control':'no-cache',accept:'application/json'},
  signal:AbortSignal.timeout(20000)});
 need(response?.ok===true,'THEME_PUBLIC_API_HTTP_'+(response?.status??'UNKNOWN'));
 return response.json();
}

function normalizeReport(report,{legacyR37OrR88=false}={}){
 // Only the proven stored-only R37/R88 branches may omit providerCalls.
 // For other owners, missing effect counts must stay unknown to the
 // coordinator rather than being silently rewritten as zero.
 return legacyR37OrR88&&report?.providerCalls===undefined?
  {...report,providerCalls:0}:report;
}

function savedR88Date({dataRoot,base}){
 const confirmed=base?.confirmedObservationDate;
 need(base?.status==='READY'&&base.r32ProvisionalReaderVersion===R88_VERSION&&
  ISO.test(confirmed??'')&&!Number.isNaN(Date.parse(confirmed+'T00:00:00Z')),
 'R88_DEPLOYED_READER_OR_CONFIRMED_ANCHOR_REQUIRED');
 const archive=path.join(dataRoot,'theme-market-history-r131','marketparquet-r165');
 need(fs.existsSync(archive)&&fs.statSync(archive).isDirectory(),
  'R88_ARCHIVE_MISSING');
 const pending=fs.readdirSync(archive).flatMap(filename=>{
  const match=/^etf_daily_(\d{4}-\d{2}-\d{2})\.parquet$/.exec(filename);
  return match&&ISO.test(match[1])&&match[1]>confirmed?[match[1]]:[];
 }).sort();
 if(pending.length!==1)return {status:pending.length?'WAIT_CONFIRMED_REFRESH':
  'WAIT_PROVISIONAL_SOURCE',d1Writes:0,providerCalls:0,schedulerWrites:0};
 return {targetDate:pending[0]};
}

// Production callers must pass allowPublish:true ONLY after the coordinator's
// grant/rights checks and approved PC B-operation/lease have been established.
// This factory itself never does a provider GET, credential lookup, or D1 write.
export function createExistingPublicOwnerAdapters({sources,dataRoot='E:/ZGmini/data',
 configDirectory=fileURLToPath(new URL('../../config/',import.meta.url)),
 allowPublish=false,anonymousLicenseRiskAccepted=false,
 publicRead=readExistingThemePublic,operations={}}={}){
 const plan=planPublicPhysicalCycle({sources});
 const groups=plan.groups;
 need(groups.length===expected.length&&expected.every(([family,kind,key])=>
  groups.some(g=>g.family===family&&g.kind===kind&&g.feedKey===key)),
 'THEME_STAGE4_EXISTING_OWNER_BINDINGS_CHANGED');
 need(typeof publicRead==='function','THEME_STAGE4_PUBLIC_READER_REQUIRED');
 const ops={...defaultOperations,...operations};
 const token=()=>ops.token({dataRoot});
 const invoke={
  [THEME_NINE_R37_KEY]:()=>ops.runR37({dataRoot,configDirectory,
   publisherConsent:true}),
  [R88_KEY]:async()=>{
   const consent=path.join(dataRoot,'pc-writer','theme-nine-r54',
    'PUBLISHER_CONSENT_TEN_R88.txt');
   need(fs.existsSync(consent)&&fs.readFileSync(consent,'ascii').trim()===
    'APPROVED_TEN_THEMES_TWO_SOURCE_PROVISIONAL_20261030',
   'R88_TEN_SCOPE_CONSENT_REQUIRED');
   const base=await publicRead();
   const date=savedR88Date({dataRoot,base});
   if(!date.targetDate)return date;
   const staged=await ops.buildR88({dataRoot,configDirectory,base,
    targetDate:date.targetDate});
   need(staged?.record?.observationDate===date.targetDate&&
    staged.record.confirmedObservationDate===base.confirmedObservationDate,
   'R88_STORED_CANDIDATE_DATE_DRIFT');
   const approvedToken=await token();
   const query=ops.query({dataRoot,tokenFn:()=>approvedToken});
   return normalizeReport(await ops.publishR88({query,record:staged.record,base}),
    {legacyR37OrR88:true});
  },
  [DC_POWER_PUBLIC_KEY]:async()=>{
   // The independent anonymous-source risk acceptance cannot be inferred
   // from a general Stage4 opt-in or silently supplied by this adapter.
   need(anonymousLicenseRiskAccepted===true,
    'DC_POWER_R3_EXPLICIT_ANONYMOUS_RISK_ACKNOWLEDGEMENT_REQUIRED');
   const approvedToken=await token();
   const db=ops.dcDb({dataRoot,tokenFn:()=>approvedToken});
   return ops.runDc({dataRoot,allowCollect:false,allowPublish:true,
    acceptAnonymousLicenseRisk:anonymousLicenseRiskAccepted,db});
  },
  [SPACE_SATELLITE_R2_PUBLIC_KEY]:async()=>{
   const approvedToken=await token();
   return ops.runSpace({dataRoot,allowPublish:true,tokenFn:()=>approvedToken});
  },
  [DC_POWER_PROVISIONAL_KEY]:async()=>{
   const approvedToken=await token();
   return ops.runDcR8({dataRoot,allowPublish:true,tokenFn:()=>approvedToken,
    publicRead});
  },
  [SPACE_PROVISIONAL_KEY]:async()=>{
   const approvedToken=await token();
   return ops.runSpaceR8({dataRoot,allowPublish:true,tokenFn:()=>approvedToken,
    publicRead});
  },
 };
 return Object.fromEntries(groups.map(group=>[group.feedKey,async input=>{
  need(allowPublish===true,'THEME_STAGE4_PUBLISH_NOT_OPTED_IN');
  need(input?.feedKey===group.feedKey&&input.kind===group.kind&&
   input.family===group.family&&input.methodologyVersion===group.methodologyVersion,
  'THEME_STAGE4_OWNER_REQUEST_MISMATCH');
  // Only the known legacy owner is called; no new D1 keys or per-theme writes.
  const report=await invoke[group.feedKey]();
  return normalizeReport(report,{legacyR37OrR88:group.family==='r37'});
 }]));
}
