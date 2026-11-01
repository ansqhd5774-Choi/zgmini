// Acquisition validity only. Scoring, observation dates and the existing
// 36-hour input TTL remain the responsibility of their existing consumers.
const dated=row=>typeof row?.observationDate==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(row.observationDate);
export function validCreditInput(body){
 const external=body?.external;
 return ['dvpRepoRows','triPartyRepoRows'].every(key=>Array.isArray(external?.[key])&&external[key].some(row=>dated(row)&&Number.isFinite(row.value)))
  &&Array.isArray(external?.cmdiRows)&&external.cmdiRows.some(row=>dated(row)&&['market','ig','hy'].every(key=>Number.isFinite(row[key])));
}
export async function readLastValidCredit(db,decode){
 const rows=await db.prepare('SELECT body,stored_at FROM market_input_batches_v1 WHERE batch_key LIKE ? ORDER BY stored_at DESC LIMIT 10').bind('credit:%').all();
 for(const row of rows.results??[]){
  try{const body=decode(row.body);if(validCreditInput(body))return {body,storedAt:row.stored_at};}catch{}
 }
 return null;
}
