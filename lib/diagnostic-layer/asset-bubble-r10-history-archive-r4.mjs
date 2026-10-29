// Pure validation of a previously audited R10 quarter-history snapshot.
// Do not replace old provenance with current collection timestamps.
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const macroVersion=x=>/^macro:(\d{4}-\d{2}-\d{2}):([a-f0-9]{64})$/i.exec(x??'');

export function parseAssetR10ArchivedAuditLog(text){
 if(typeof text!=='string'||text.length>40000||text.length<1000)
  throw Error('ASSET_R10_ARCHIVED_LOG_INVALID');
 const lines=text.replace(/\r/g,'').split('\n');
 if(lines[0]!=='ZGMINI_ASSET_R10_1Y_HISTORY_READONLY_R1'
  ||!lines.includes('SOURCE_BRANCH=codex/api-site-integration-r1-20261026')
  ||!lines.includes('SOURCE_SHA=42e3abbc671185cd9ea87b906ae32e84c51bd0e1')
  ||!lines.includes('AUDIT_EXIT_CODE=0')
  ||!lines.includes('WRAPPER_RESULT=PASS_READONLY_AUDIT_EXECUTED'))
  throw Error('ASSET_R10_ARCHIVED_AUDIT_PROVENANCE_INVALID');
 const evidenceLines=lines.filter(x=>x.startsWith('{'));
 if(evidenceLines.length!==1)throw Error('ASSET_R10_ARCHIVED_EVIDENCE_MISSING');
 try{return JSON.parse(evidenceLines[0]);}
 catch{throw Error('ASSET_R10_ARCHIVED_EVIDENCE_INVALID');}
}

export function validateArchivedAssetR10AgainstCurrent(archived,current){
 if(!archived||!current||archived.approvedRawParity!=='PASS'
  ||current.approvedRawParity!=='PASS'
  ||archived.status!=='PARTIAL_1Y_READONLY'
  ||current.status!=='PARTIAL_1Y_READONLY'
  ||archived.asOfDate!=='2026-10-28'
  ||archived.sourceStoredAt!==1793203206694
  ||archived.schemaVersion!=='asset-bubble-r10-one-year-readonly-r1'
  ||current.schemaVersion!==archived.schemaVersion)
  throw Error('ASSET_R10_ARCHIVED_AUDIT_GATE_FAILED');
 for(const e of [archived,current]){
  if(!Number.isSafeInteger(e.sourceStoredAt)||e.sourceStoredAt<=0
   ||e.pcSqliteWrites!==0||e.d1Writes!==0
   ||e.scoreWrites!==0||e.providerRequests!==0||e.deployments!==0)
   throw Error('ASSET_R10_ARCHIVED_READONLY_GATE_FAILED');
 }
 const oldVersion=macroVersion(archived.sourceVersion);
 const nowVersion=macroVersion(current.sourceVersion);
 if(!oldVersion||!nowVersion
  ||oldVersion[1]!==archived.asOfDate||nowVersion[1]!==current.asOfDate
  ||oldVersion[2]!==nowVersion[2]
  ||current.asOfDate<archived.asOfDate
  ||current.sourceStoredAt<archived.sourceStoredAt)
  throw Error('ASSET_R10_ARCHIVED_SOURCE_BATCH_DRIFT');
 const attrs=['scoreObservationQuarter','firstQuarter','lastQuarter','historicalMode',
  'rightsStatus','approvedScore'];
 if(attrs.some(k=>!same(archived[k],current[k]))
  ||!Array.isArray(archived.factors)||archived.factors.length!==6
  ||!same(archived.factors,current.factors))
  throw Error('ASSET_R10_ARCHIVED_FACTOR_OR_SCORE_DRIFT');
 // Original price batch must remain identical; macro may be re-recorded under
 // the same verified fingerprint without changing historical observations.
 if(!archived.storedInputs||!current.storedInputs
  ||archived.storedInputs.priceBatchKey!==current.storedInputs.priceBatchKey
  ||archived.storedInputs.priceStoredAt!==current.storedInputs.priceStoredAt)
  throw Error('ASSET_R10_ARCHIVED_PRICE_SOURCE_DRIFT');
 return archived;
}

export function assertArchivedR10MatchesD1Raw(raw,history){
 if(raw.sourceVersion!==history.sourceVersion
  ||raw.sourceStoredAt!==history.sourceStoredAt
  ||raw.asOfDate!==history.asOfDate
  ||raw.scoreObservationQuarter!==history.scoreObservationQuarter
  ||Math.abs(raw.diagnosticScore-history.approvedScore)>=1e-7
  ||raw.factors.length!==6||history.factors.length!==6)
  throw Error('ASSET_R10_ARCHIVED_RAW_D1_LINEAGE_MISMATCH');
 for(let i=0;i<6;i++){
  const f=raw.factors[i],h=history.factors[i];
  const p=h.points[4],prior=h.points[3];
  if(f.id!==h.id||f.unit!==h.unit||f.source!==h.source
   ||Math.abs(f.value-p.value)>=1e-7
   ||Math.abs(f.previousValue-prior.value)>=1e-7
   ||f.observationDate!==p.observationDate
   ||f.previousObservationDate!==prior.observationDate)
   throw Error('ASSET_R10_ARCHIVED_RAW_D1_LINEAGE_MISMATCH');
 }
 return true;
}
