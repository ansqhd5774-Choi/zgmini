import {selectBisSeries} from '../lib/diagnostic-layer/bis-bulk-parser.mjs';
import {BIS_DEBT_SELECTORS} from '../lib/diagnostic-layer/bis-debt-components.mjs';
import {expandingPercentileRows} from '../lib/diagnostic-layer/series-math.mjs';
export const BIS_INPUT_TTL=192*3600000;
export const bisInputField=key=>({bisDsr:'bisDsrParsed',bisTc:'bisDebtGdpParsed'})[key];
export function validBisInput(key,body){
 try {
  const rows=selectBisSeries(body?.external?.[bisInputField(key)],key==='bisDsr'?BIS_DEBT_SELECTORS.dsr:BIS_DEBT_SELECTORS.debtGdp).rows;
  return expandingPercentileRows(rows.filter(r=>Number.isFinite(r.value)&&/^\d{4}-\d{2}-\d{2}$/.test(r.observationDate)),{inverse:true,minValid:key==='bisDsr'?12:20}).length>0;
 }catch{return false;}
}
export async function readLastValidBis(db,key,decode){
 const rows=await db.prepare('SELECT body,stored_at FROM market_input_batches_v1 WHERE batch_key LIKE ? ORDER BY stored_at DESC LIMIT 10').bind(key+':%').all();
 for(const row of rows.results??[]){try{const body=decode(row.body);if(validBisInput(key,body))return {body,storedAt:row.stored_at};}catch{}}
 return null;
}
