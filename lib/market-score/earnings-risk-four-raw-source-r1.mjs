// Pure publication model from E1-R4 replay of already stored SEC issuer facts.
// The fingerprint identifies the aggregate snapshot, not a provider raw-file SHA.
import {createHash} from 'node:crypto';
import {validateRiskFourRaw,RISK_R4_RAW_SCHEMA} from '../../worker/earnings-risk-four-raw-r1.mjs';

const ORDER=['epsGrowth','margin','revenueGrowth','earningsGrowthBreadth'];
export function buildRiskFourRawPayload(evidence,{now=Date.now()}={}){
 if(evidence?.status!=='READY'||evidence?.methodologyVersion!=='E1-R4'
   ||evidence?.historyMode!=='CURRENT_VINTAGE_NOT_PIT'
   ||!Array.isArray(evidence?.rawFactors)||!Array.isArray(evidence?.rawHistory)
   ||!Array.isArray(evidence?.factors))
   throw Error('RISK_R4_RAW_PC_EVIDENCE_NOT_READY');
 const sourceStoredAt=typeof evidence.sourceStoredAt==='number'
   ?evidence.sourceStoredAt:Date.parse(evidence.sourceStoredAt??'');
 if(!Number.isSafeInteger(sourceStoredAt)||sourceStoredAt<=0)
   throw Error('RISK_R4_RAW_PC_CHECKPOINT_INVALID');
 const factors=ORDER.map(id=>{
   const row=evidence.rawFactors.find(f=>f.id===id);
   if(!row)throw Error('RISK_R4_RAW_PC_FACTOR_MISSING');
   return {id,value:row.value,previousValue:row.previousValue,unit:'PERCENT'};
 });
 const scoreFactors=ORDER.map(id=>{
   const row=evidence.factors.find(f=>f.id===id);
   if(!row)throw Error('RISK_R4_RAW_PC_SCORE_MISSING');
   return {id,score:row.score};
 });
 const history=evidence.rawHistory.map(row=>({
   periodEnd:row.periodEnd,
   values:Object.fromEntries(ORDER.map(id=>[id,row.values?.[id]])),
 }));
 const versionInput={sourceStoredAt,financialPeriodEnd:evidence.financialPeriodEnd,
   diagnosticScore:evidence.score,scoreFactors,factors,history};
 const sourceVersion=createHash('sha256').update(JSON.stringify(versionInput)).digest('hex');
 const payload={schemaVersion:RISK_R4_RAW_SCHEMA,status:'READY',sourceVersion,sourceStoredAt,
   sourceRetrievedAt:new Date(sourceStoredAt).toISOString(),
   source:'PC_STORED_SEC_EDGAR_E1_R4',methodologyVersion:'E1-R4',
   historyMode:'CURRENT_VINTAGE_NOT_PIT',financialPeriodEnd:evidence.financialPeriodEnd,
   diagnosticScore:evidence.score,scoreFactors,factors,history};
 return validateRiskFourRaw(payload,{now});
}
