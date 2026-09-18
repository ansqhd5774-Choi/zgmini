import {fetchRev7Date} from './korea-rev7-provider.mjs';
import {calculateRev7,REV7_VERSION} from './korea-rev7-engine.mjs';

export const REV7_BACKFILL_POLICY=Object.freeze({
  anchor:'20260915',
  targetHistoryDates:1030,
  maxAdditionalDatesPerRun:2,
  maxCalendarCandidates:16,
  researchOnly:true,
  productionEligible:false,
});
const validDate=value=>typeof value==='string'&&/^\d{8}$/.test(value);
export function previousRev7Candidate(date){
  if(!validDate(date))throw Error('INVALID_DATE');
  const d=new Date(`${date.slice(0,4)}-${date.slice(4,6)}-${date.slice(6,8)}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate()-1);
  return d.toISOString().slice(0,10).replaceAll('-','');
}
const weekend=date=>[0,6].includes(new Date(`${date.slice(0,4)}-${date.slice(4,6)}-${date.slice(6,8)}T00:00:00Z`).getUTCDay());

/**
 * Bounded Revision 7 historical runner.
 * No implicit route or scheduler. Live transport exists only through injected fetchDate.
 */
export async function runRev7Backfill({
  store,
  krxKey,
  bokKey,
  fetchImpl=globalThis.fetch,
  fetchDate=fetchRev7Date,
  targetAdditionalDates=1,
  maxCalendarCandidates=REV7_BACKFILL_POLICY.maxCalendarCandidates,
  runId,
}={}) {
  if(!store || typeof store.acquireLease!=='function' || typeof store.getBackfillProgress!=='function' ||
     typeof store.getDate!=='function' || typeof store.saveDate!=='function' ||
     typeof store.getHistory!=='function' || typeof store.saveSnapshot!=='function' ||
     typeof store.markBackfillStatus!=='function' || typeof store.releaseLease!=='function' ||
     typeof fetchDate!=='function')
    throw Error('INVALID_RUN_CONFIGURATION');
  if(!Number.isSafeInteger(targetAdditionalDates)||targetAdditionalDates<1||
     targetAdditionalDates>REV7_BACKFILL_POLICY.maxAdditionalDatesPerRun)
    throw Error('INVALID_RUN_CONFIGURATION');
  if(!Number.isSafeInteger(maxCalendarCandidates)||maxCalendarCandidates<1||maxCalendarCandidates>32)
    throw Error('INVALID_RUN_CONFIGURATION');

  const acquired=await store.acquireLease(runId);
  if(!acquired) return {
    researchOnly:true,productionEligible:false,status:'ALREADY_RUNNING',
    failureCode:null,providerRequests:0,krxRequests:0,bokRequests:0,
    additionalSuccessfulDates:0,rowsStored:0,snapshotWritten:false,leaseReleased:false,
  };

  let providerRequests=0,krxRequests=0,bokRequests=0,additional=0,rowsStored=0,
    examined=0,skippedWeekends=0,noObservations=0,reusedDates=0,snapshotWritten=false;
  let failureCode=null,output=null;
  try {
    await store.markBackfillStatus('RUNNING',null);
    let progress=await store.getBackfillProgress();
    let date=progress?.oldestProcessedDate
      ? previousRev7Candidate(progress.oldestProcessedDate)
      : REV7_BACKFILL_POLICY.anchor;

    while(additional<targetAdditionalDates && examined<maxCalendarCandidates) {
      if(typeof store.renewLease==='function') await store.renewLease();
      examined++;
      if(weekend(date)){skippedWeekends++;date=previousRev7Candidate(date);continue;}

      let existing=await store.getDate(date);
      if(existing) {
        reusedDates++;
        if(existing.status==='SUCCESS') additional++;
        date=previousRev7Candidate(date);
        continue;
      }

      let snapshot;
      try {
        snapshot=await fetchDate(date,{krxKey,bokKey,fetchImpl});
      } catch {
        failureCode='PROVIDER_FAILURE';
        await store.markBackfillStatus('ERROR',failureCode);
        return output={
          researchOnly:true,productionEligible:false,status:'ERROR',failureCode,
          providerRequests,krxRequests,bokRequests,additionalSuccessfulDates:additional,
          rowsStored,snapshotWritten,examined,skippedWeekends,noObservationDates:noObservations,reusedDates,
          progress:await store.getBackfillProgress(),leaseReleased:false,
        };
      }

      const k=snapshot?.krxRequestCount??0,b=snapshot?.bokRequestCount??0;
      if(!Number.isSafeInteger(k)||k<0||!Number.isSafeInteger(b)||b<0) {
        failureCode='INVALID_PROVIDER_REQUEST_COUNT';
        await store.markBackfillStatus('ERROR',failureCode);
        return output={
          researchOnly:true,productionEligible:false,status:'ERROR',failureCode,
          providerRequests,krxRequests,bokRequests,additionalSuccessfulDates:additional,
          rowsStored,snapshotWritten,examined,skippedWeekends,noObservationDates:noObservations,reusedDates,
          progress:await store.getBackfillProgress(),leaseReleased:false,
        };
      }
      krxRequests+=k;bokRequests+=b;providerRequests+=k+b;

      if(!snapshot?.complete || snapshot.requestedDate!==date ||
         !['SUCCESS','NO_TRADING_OBSERVATION'].includes(snapshot.status)) {
        failureCode='INVALID_PROVIDER_SNAPSHOT';
        await store.markBackfillStatus('ERROR',failureCode);
        return output={
          researchOnly:true,productionEligible:false,status:'ERROR',failureCode,
          providerRequests,krxRequests,bokRequests,additionalSuccessfulDates:additional,
          rowsStored,snapshotWritten,examined,skippedWeekends,noObservationDates:noObservations,reusedDates,
          progress:await store.getBackfillProgress(),leaseReleased:false,
        };
      }

      try { await store.saveDate(snapshot); }
      catch {
        failureCode='DATE_SAVE_FAILED';
        await store.markBackfillStatus('ERROR',failureCode);
        return output={
          researchOnly:true,productionEligible:false,status:'ERROR',failureCode,
          providerRequests,krxRequests,bokRequests,additionalSuccessfulDates:additional,
          rowsStored,snapshotWritten,examined,skippedWeekends,noObservationDates:noObservations,reusedDates,
          progress:await store.getBackfillProgress(),leaseReleased:false,
        };
      }

      if(snapshot.status==='SUCCESS'){
        additional++;
        rowsStored+=snapshot.rows.length;
      }else{
        noObservations++;
      }
      date=previousRev7Candidate(date);
    }

    const finalProgress=await store.getBackfillProgress();
    if((finalProgress?.successfulTradingDates??0)>=REV7_BACKFILL_POLICY.targetHistoryDates) {
      const history=await store.getHistory(REV7_BACKFILL_POLICY.targetHistoryDates);
      const calculated=calculateRev7(history);
      snapshotWritten=await store.saveSnapshot(calculated);
      await store.markBackfillStatus('COMPLETE',null);
    } else {
      await store.markBackfillStatus('PAUSED',null);
    }

    return output={
      researchOnly:true,
      productionEligible:false,
      methodologyVersion:REV7_VERSION,
      status:additional===targetAdditionalDates?'CHUNK_COMPLETE':'LIMIT_REACHED',
      failureCode:null,
      providerRequests,krxRequests,bokRequests,
      additionalSuccessfulDates:additional,rowsStored,snapshotWritten,
      examined,skippedWeekends,noObservationDates:noObservations,reusedDates,
      progress:await store.getBackfillProgress(),
      leaseReleased:false,
    };
  } catch {
    failureCode=failureCode??'BACKFILL_FAILURE';
    try{await store.markBackfillStatus('ERROR',failureCode);}catch{}
    return output={
      researchOnly:true,productionEligible:false,status:'ERROR',failureCode,
      providerRequests,krxRequests,bokRequests,additionalSuccessfulDates:additional,
      rowsStored,snapshotWritten,examined,skippedWeekends,noObservationDates:noObservations,reusedDates,
      progress:await store.getBackfillProgress().catch(()=>null),leaseReleased:false,
    };
  } finally {
    let released=false;
    try{released=await store.releaseLease();}catch{}
    if(output) output.leaseReleased=released;
  }
}
