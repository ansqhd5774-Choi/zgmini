// Acquisition validity only. Scoring minimums, provenance and TTL stay downstream.
export const finiteObservation=row=>typeof row?.observationDate==='string'
 && /^\d{4}-\d{2}-\d{2}$/.test(row.observationDate)
 && Number.isFinite(Date.parse(row.observationDate))
 && new Date(row.observationDate).toISOString().slice(0,10)===row.observationDate
 && Number.isFinite(row.value);
export const hasObservations=rows=>Array.isArray(rows)&&rows.some(finiteObservation);
export function groupedInputValid(job,body){
 const keys={supply:['gscpiRows','copperRows'],fundFlows:['registeredFundFlowRows']}[job];
 return !keys||keys.every(key=>hasObservations(body?.external?.[key]));
}
