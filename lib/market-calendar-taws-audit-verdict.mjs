// Source-only, fail-closed interpretation of an approved PC inventory Reader result.
// It never opens SQLite, re-fetches TA_WS, or promotes private metadata to full verification.
const isObject=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const positiveInteger=value=>Number.isSafeInteger(value)&&value>0;
const validDay=value=>{
 if(typeof value!=='string'||!/^20\d{2}-\d{2}-\d{2}$/.test(value))return false;
 const ms=Date.parse(`${value}T00:00:00Z`);
 return Number.isFinite(ms)&&new Date(ms).toISOString().slice(0,10)===value;
};
const reject=code=>Object.freeze({status:'BLOCKED',code,
 readyForFinalCompletion:false,rawDuplicateAudit:'NOT_PROVIDED_BY_READER'});

/**
 * Classify only the bounded fields of source-inventory-runtime-readonly.
 * expectedToDate must come from an independently verified collection checkpoint.
 * Even a clean verdict is metadata-only: a separate D1/API/UI readback remains required.
 */
export function judgeTreasuryTaws365Audit(reader,{expectedToDate}={}){
 if(!isObject(reader)||reader.status!=='PASS'||reader.code!=='SOURCE_INVENTORY_STORED_READONLY'||
    reader.sqliteOpened!==true||reader.core?.status!=='PASS'||reader.core?.sqliteOpened!==true)
  return reject('READER_OR_SQLITE_NOT_PASS');
 if(reader.providerCalls!==0||reader.d1Writes!==0||reader.operationalWrites!==0)
  return reject('READ_ONLY_GUARD_NOT_VERIFIED');
 const data=reader.core.treasuryTawsInput;
 if(!isObject(data)||data.status==='NOT_STORED')return reject('TAWS_NOT_STORED');
 if(data.status!=='OBSERVED')return reject('TAWS_UNREADABLE_OR_UNKNOWN');
 if(!validDay(data.fromDate)||!validDay(data.toDate))return reject('TAWS_DATES_INVALID');
 const spanDays=(Date.parse(`${data.toDate}T00:00:00Z`)-Date.parse(`${data.fromDate}T00:00:00Z`))/86400000;
 if(spanDays!==364)return reject('TAWS_WINDOW_NOT_EXACT_365_DAYS');
 if(!validDay(expectedToDate)||data.toDate!==expectedToDate)
  return reject('COLLECTION_CHECKPOINT_DATE_UNVERIFIED');
 if(!positiveInteger(data.storedAt)||!positiveInteger(data.rawRowCount)||
    !positiveInteger(data.storedAwardedCount)||!positiveInteger(data.eligibleAwardedRows)||
    data.rawRowCount>2000||data.eligibleAwardedRows>data.rawRowCount||
    data.storedAwardedCount>data.rawRowCount)
  return reject('TAWS_COUNTS_OR_TIMESTAMP_INVALID');
 if(data.eligibleCountMatchesStored!==true||data.storedAwardedCount!==data.eligibleAwardedRows)
  return reject('TAWS_AWARDED_COUNT_MISMATCH');
 if(!positiveInteger(data.textBytes)||data.textBytes>6*1024*1024||
    typeof data.textSha256!=='string'||!/^[0-9a-f]{64}$/.test(data.textSha256)||
    data.scope!=='ELIGIBLE_RESULT_COUNT_NOT_FULL_PARSER_REVALIDATION')
  return reject('TAWS_DIGEST_OR_SCOPE_UNVERIFIED');
 return Object.freeze({status:'METADATA_PASS',code:'TAWS_365_DAY_METADATA_MATCH',
  readyForFinalCompletion:false,rawDuplicateAudit:'NOT_PROVIDED_BY_READER',
  nextVerification:'D1_API_UI_VERSION_AND_PRIVATE_DUPLICATE_SCOPE_PENDING'});
}
