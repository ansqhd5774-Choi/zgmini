/**
 * Stage05-only reader for explicitly identified, already-completed files.
 * No discovery, network access, Stage01-04 execution or score computation.
 */
import {readFile} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {SCHEMA_VERSION} from './stage05-fusion-core.mjs';

export const FILES_MANIFEST_VERSION = 'STAGE05_EXISTING_FILES_MANIFEST_V1';
const stageNames = ['stage01','stage02','stage03','stage04'];

export async function loadCompletedStageFiles(manifestPath,{readText=readFile}={}) {
  if (typeof manifestPath !== 'string' || !manifestPath.trim())
    throw new Error('STAGE05_MANIFEST_PATH_REQUIRED');

  const absoluteManifest = resolve(manifestPath);
  let manifest;
  try { manifest=JSON.parse(await readText(absoluteManifest,'utf8')); }
  catch (error) { throw new Error(`STAGE05_MANIFEST_UNREADABLE:${error.message}`); }
  if (manifest?.version !== FILES_MANIFEST_VERSION
    || typeof manifest.snapshotDate !== 'string' || !manifest.snapshotDate.trim()
    || !manifest.files || typeof manifest.files !== 'object')
    throw new Error('STAGE05_MANIFEST_CONTRACT_INVALID');

  const directory=dirname(absoluteManifest);
  const entries=await Promise.all(stageNames.map(async stage=>{
    const name=manifest.files[stage];
    if (typeof name !== 'string' || !name.trim())
      throw new Error(`STAGE05_SOURCE_PATH_MISSING_${stage}`);
    const path=resolve(directory,name);
    let saved;
    try { saved=JSON.parse(await readText(path,'utf8')); }
    catch (error) { throw new Error(`STAGE05_SOURCE_UNREADABLE_${stage}:${error.message}`); }
    // Accept the exact StageXX object or a result containing a StageXX object.
    // Never reinterpret source indicators or derive scores from them.
    const data=saved?.[stage] ?? saved;
    if (!data || typeof data!=='object' || Array.isArray(data))
      throw new Error(`STAGE05_SOURCE_OBJECT_INVALID_${stage}`);
    return [stage,data];
  }));

  const snapshot={schemaVersion:SCHEMA_VERSION,
    snapshotDate:manifest.snapshotDate,...Object.fromEntries(entries)};
  return {snapshot,sourceMode:'EXPLICIT_COMPLETED_FILES_NO_RECALCULATION'};
}
