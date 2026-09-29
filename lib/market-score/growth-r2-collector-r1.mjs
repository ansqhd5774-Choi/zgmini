import crypto from 'node:crypto';
import {GROWTH_R2_FEATURE_IDS} from './growth-r2-contract.mjs';

const REQUIRED = new Set(GROWTH_R2_FEATURE_IDS);
const finite = value => typeof value === 'number' && Number.isFinite(value);

function key(row) {
  return `${row.candidateId}|${row.observationDate}|${row.availableAt}|${row.vintageId ?? ''}`;
}

export function projectGrowthR2Current(featureRecords, asOf) {
  const current = new Map();
  for (const row of featureRecords ?? []) {
    if (!REQUIRED.has(row?.candidateId)) continue;
    if (row?.pitEligible !== true) continue;
    if (typeof row?.availableAt !== 'string' || row.availableAt > asOf) continue;
    if (!finite(row?.harmonizedValue)) continue;
    const prev = current.get(row.candidateId);
    if (!prev ||
        row.observationDate > prev.observationDate ||
        (row.observationDate === prev.observationDate && row.availableAt > prev.availableAt)) {
      current.set(row.candidateId,row);
    }
  }
  return Object.fromEntries([...current.entries()].sort(([a],[b])=>a.localeCompare(b)));
}

export function appendGrowthR2History(existingRows, incomingRows) {
  const out = [...(existingRows ?? [])];
  const keys = new Set(out.map(key));
  let appended = 0;
  let ignoredNull = 0;
  let duplicate = 0;
  for (const row of incomingRows ?? []) {
    if (!REQUIRED.has(row?.candidateId)) continue;
    if (!finite(row?.harmonizedValue)) { ignoredNull++; continue; }
    const k = key(row);
    if (keys.has(k)) { duplicate++; continue; }
    out.push(row); keys.add(k); appended++;
  }
  out.sort((a,b)=>
    String(a.candidateId).localeCompare(String(b.candidateId)) ||
    String(a.observationDate).localeCompare(String(b.observationDate)) ||
    String(a.availableAt).localeCompare(String(b.availableAt)));
  const historyHash = crypto.createHash('sha256').update(JSON.stringify(out)).digest('hex');
  return {rows:out, appended, ignoredNull, duplicate, historyHash};
}
