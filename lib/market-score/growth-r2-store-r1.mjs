import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {GROWTH_R2_FEATURE_IDS} from './growth-r2-contract.mjs';

const finite = value => typeof value === 'number' && Number.isFinite(value);
const validDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value);

function shaFile(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file,'utf8'));
}

export function readGrowthR2StoredInput(dataRoot) {
  const pitPath = path.join(dataRoot,'grw-pit-r2.json');
  const harmPath = path.join(dataRoot,'grw-harm-r1.json');
  if (!fs.existsSync(pitPath)) throw new Error('GROWTH_R2_PIT_STORE_MISSING');
  if (!fs.existsSync(harmPath)) throw new Error('GROWTH_R2_HARM_STORE_MISSING');
  const pit = readJson(pitPath);
  const harm = readJson(harmPath);
  const featureRecords = Array.isArray(harm?.featureRecords) ? harm.featureRecords : [];
  return {
    pitPath,
    harmPath,
    pitSha256: shaFile(pitPath),
    harmSha256: shaFile(harmPath),
    pit,
    harm,
    featureRecords,
  };
}

export function validateGrowthR2StoredRecords(featureRecords) {
  const required = new Set(GROWTH_R2_FEATURE_IDS);
  const seen = new Map();
  const issues = [];
  for (const row of featureRecords ?? []) {
    if (!required.has(row?.candidateId)) continue;
    if (!validDate(row?.observationDate)) { issues.push(`BAD_OBSERVATION_DATE:${row?.candidateId}`); continue; }
    if (!validDate(row?.availableAt)) { issues.push(`BAD_AVAILABLE_AT:${row?.candidateId}:${row?.observationDate}`); continue; }
    if (!finite(row?.harmonizedValue)) { issues.push(`BAD_VALUE:${row?.candidateId}:${row?.observationDate}`); continue; }
    const key = `${row.candidateId}|${row.observationDate}|${row.availableAt}|${row.vintageId ?? ''}`;
    if (seen.has(key)) issues.push(`DUPLICATE_KEY:${key}`);
    else seen.set(key,true);
  }
  return {pass:issues.length===0, issues, checked:seen.size};
}
