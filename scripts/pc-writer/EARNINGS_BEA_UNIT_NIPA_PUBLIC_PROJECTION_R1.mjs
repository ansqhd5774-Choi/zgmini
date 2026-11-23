// Source-only public projection builder from an already persisted, verified BEA JSON.
// No provider requests, raw-file writes, D1 access, scheduling or CLI entrypoint.
// Any actual D1 write requires a separate exact B approval and installed publisher.
import {computeBeaUnitNipaStoredPreview}
 from './EARNINGS_BEA_UNIT_NIPA_ARCHIVE_R1.mjs';
import {validateBeaUnitProfit,BEA_UNIT_SCHEMA}
 from '../../worker/earnings-bea-unit-profit-r1.mjs';

export const BEA_NIPA_PUBLIC_SERIES='A463RD';
export const BEA_NIPA_PUBLIC_SOURCE_URL='https://apps.bea.gov/api/data';

function quarterEnd(period){
 const match=/^(\d{4})Q([1-4])$/.exec(period??'');
 if(!match)throw Error('BEA_NIPA_PUBLIC_QUARTER_INVALID');
 return new Date(Date.UTC(Number(match[1]),Number(match[2])*3,0))
  .toISOString().slice(0,10);
}

// Caller pins the immutable statistical JSON SHA; this never falls back to FRED.
export function buildBeaUnitNipaPublicProjection({pcBase,sourceSha,now=Date.now()}={}){
 const calc=computeBeaUnitNipaStoredPreview({pcBase,sourceSha});
 if(calc.status!=='STORED_SOURCE_CALCULATED'||calc.transport!=='BEA_API_JSON'
   ||calc.history.length!==5||calc.sourceVersion!==sourceSha)
  throw Error('BEA_NIPA_PUBLIC_ARCHIVE_UNVERIFIED');
 const history=calc.history.map(item=>({date:quarterEnd(item.period),value:item.value}));
 if(history.at(-1).date!==calc.observationPeriodEnd
   ||history.at(-1).value!==calc.currentValue
   ||history.at(-2).value!==calc.previousValue)
  throw Error('BEA_NIPA_PUBLIC_HISTORY_MISMATCH');
 const payload={
  schemaVersion:BEA_UNIT_SCHEMA,status:'READY',
  sourceVersion:calc.sourceVersion,sourceStoredAt:calc.sourceStoredAt,
  retrievedAt:new Date(calc.sourceStoredAt).toISOString(),
  historyMode:'CURRENT_VINTAGE_SOURCE_PERIOD_END',
  indicator:{
   id:'bea_nonfinancial_unit_profit',
   source:'BEA NIPA Table 1.15 A463RD',
   seriesId:BEA_NIPA_PUBLIC_SERIES,
   sourceURL:BEA_NIPA_PUBLIC_SOURCE_URL,
   transport:'BEA_API_JSON',unit:'USD_PER_REAL_GVA_UNIT',
   observationPeriodEnd:calc.observationPeriodEnd,
   previousPeriodEnd:history.at(-2).date,
   value:calc.currentValue,previousValue:calc.previousValue,
   change:calc.change,history
  }
 };
 return validateBeaUnitProfit(payload,{now});
}
