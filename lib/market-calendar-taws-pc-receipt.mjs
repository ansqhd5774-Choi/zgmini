import {judgeTreasuryTaws365Audit} from './market-calendar-taws-audit-verdict.mjs';

const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const sha40=x=>typeof x==='string'&&/^[0-9a-f]{40}$/.test(x);
const sha64=x=>typeof x==='string'&&/^[0-9a-f]{64}$/.test(x);
const blocked=code=>Object.freeze({status:'BLOCKED',code,receiptVerified:false,
 readyForFinalCompletion:false});

// The existing Runner TXT is a bounded key=value summary, not a JSON replica.
// Never echo any unrecognized lines or the original receipt in a verdict.
function txtFields(txt){
 if(typeof txt!=='string'||Buffer.byteLength(txt)>32768)return null;
 const values=new Map();
 for(const line of txt.split(/\r?\n/)){
  if(!line)continue;
  const match=/^([A-Za-z][A-Za-z0-9]*)=(.*)$/.exec(line);
  if(!match||values.has(match[1]))return null;
  values.set(match[1],match[2]);
 }
 return values;
}

/** Verify a single approved pc-job result envelope before interpreting its bounded TA_WS metadata.
 * expected fields must come from the original Issue, Run, installed source and an independent
 * collection-window checkpoint, not from the receipt being verified.
 */
export function checkTreasuryTawsPcReceipt(receipt,txt,expected={}){
 if(!object(receipt)||!object(expected)||!sha40(expected.controlSourceSha)||
    typeof expected.requestId!=='string'||!expected.requestId||
    typeof expected.jobId!=='string'||!/^run-\d+-\d+-seat-[1-6]$/.test(expected.jobId))
  return blocked('EXPECTED_RUN_IDENTITY_UNVERIFIED');
 if(receipt.schema!=='ZGMINI_PC_RESULT_V1'||
    receipt.operation!=='source-inventory-runtime-readonly'||
    receipt.requestId!==expected.requestId||receipt.jobId!==expected.jobId||
    receipt.controlRepository!=='ansqhd5774-Choi/zgmini-pc-control'||
    receipt.status!=='PASS'||receipt.code!=='SOURCE_INVENTORY_STORED_READONLY'||
    receipt.exitCode!==0||receipt.firstFail!==null||
    receipt.lastPass!=='ALLOWLISTED_OPERATION_COMPLETED'||
    receipt.seat!==Number(expected.jobId.split('-').at(-1)))
  return blocked('PC_JOB_IDENTITY_OR_STATUS_MISMATCH');
 if(receipt.controlSourceSha!==expected.controlSourceSha||
    receipt.actualExecutionSha!==expected.controlSourceSha)
  return blocked('PC_INSTALLED_SHA_UNVERIFIED');
 if(receipt.protectedStateUnchanged!==true||
    !sha64(receipt.protectedBeforeSha256)||
    receipt.protectedBeforeSha256!==receipt.protectedAfterSha256||
    receipt.providerCalls!==0||receipt.d1Writes!==0||receipt.operationalWrites!==0)
  return blocked('PC_PROTECTION_OR_READONLY_UNVERIFIED');
 const fields=txtFields(txt);
 if(!fields)return blocked('PC_JSON_TXT_PAIR_UNVERIFIED');
 const mirrored=['schema','jobId','requestId','controlRepository','controlSourceSha',
  'operation','seat','status','code','lastPass','firstFail','actualExecutionSha',
  'protectedStateUnchanged','protectedBeforeSha256','protectedAfterSha256',
  'providerCalls','d1Writes','operationalWrites','exitCode'];
 if(mirrored.some(key=>fields.get(key)!==String(receipt[key])))
  return blocked('PC_JSON_TXT_PAIR_UNVERIFIED');
 const inner=judgeTreasuryTaws365Audit(receipt.result,{expectedToDate:expected.expectedToDate});
 return Object.freeze({status:inner.status,code:inner.code,receiptVerified:true,
  readyForFinalCompletion:false,rawDuplicateAudit:'NOT_PROVIDED_BY_READER',
  nextVerification:inner.nextVerification??'TAWS_INPUT_METRICS_NOT_VERIFIED'});
}
