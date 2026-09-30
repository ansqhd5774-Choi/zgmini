import {
  EMPLOYMENT_R6_REQUIRED_LOGICAL_SERIES,
} from "./employment-r6-formula.mjs";
import {
  EMPLOYMENT_R6_TABLES,
} from "./employment-r6-contract.mjs";

const rowsFromAll = r => Array.isArray(r?.results) ? r.results : Array.isArray(r) ? r : [];
const finite = n => Number.isFinite(Number(n));
const text = v => v == null ? null : String(v);

function knownAt(row) {
  const s = row.availableAt ?? row.available_at ?? row.retrievedAt ?? row.retrieved_at;
  const t = Date.parse(String(s ?? ""));
  return Number.isFinite(t) ? t : NaN;
}
function retrievedAt(row) {
  const t = Date.parse(String(row.retrievedAt ?? row.retrieved_at ?? ""));
  return Number.isFinite(t) ? t : -Infinity;
}
function key(row) {
  return [
    row.logicalSeriesId ?? row.logical_series_id,
    row.geographyType ?? row.geography_type,
    row.geographyCode ?? row.geography_code,
    row.observationDate ?? row.observation_date,
  ].join("|");
}
export function normalizeStoredObservation(row) {
  return {
    logicalSeriesId:text(row.logicalSeriesId ?? row.logical_series_id),
    provider:text(row.provider),
    providerSeriesId:text(row.providerSeriesId ?? row.provider_series_id),
    geographyType:text(row.geographyType ?? row.geography_type),
    geographyCode:text(row.geographyCode ?? row.geography_code),
    frequency:text(row.frequency),
    unit:text(row.unit),
    seasonalAdjustment:text(row.seasonalAdjustment ?? row.seasonal_adjustment),
    populationCoverage:text(row.populationCoverage ?? row.population_coverage),
    observationDate:text(row.observationDate ?? row.observation_date),
    releaseDate:text(row.releaseDate ?? row.release_date),
    availableAt:text(row.availableAt ?? row.available_at),
    retrievedAt:text(row.retrievedAt ?? row.retrieved_at),
    value:finite(row.value)?Number(row.value):null,
    sourceRevision:text(row.sourceRevision ?? row.source_revision),
    sourceHash:text(row.sourceHash ?? row.source_hash),
    qualityStatus:text(row.qualityStatus ?? row.quality_status),
    pitClass:text(row.pitClass ?? row.pit_class),
    schemaVersion:Number(row.schemaVersion ?? row.schema_version ?? 0),
    provenanceJson:text(row.provenanceJson ?? row.provenance_json),
    changeType:text(row.changeType ?? row.change_type),
    recordedAt:text(row.recordedAt ?? row.recorded_at),
  };
}

export function selectAsOfRevisions(rows, scoreAsOf) {
  const T=Date.parse(String(scoreAsOf ?? ""));
  if(!Number.isFinite(T)) throw new TypeError("SCORE_AS_OF_INVALID");
  const groups=new Map();
  for(const raw of rows ?? []) {
    const row=normalizeStoredObservation(raw);
    const ka=knownAt(row);
    if(!Number.isFinite(ka)||ka>T||!finite(row.value)) continue;
    const k=key(row);
    const old=groups.get(k);
    if(!old) { groups.set(k,row); continue; }
    const oldKnown=knownAt(old);
    if(ka>oldKnown
      || (ka===oldKnown && retrievedAt(row)>retrievedAt(old))
      || (ka===oldKnown && retrievedAt(row)===retrievedAt(old) && String(row.sourceHash??"").localeCompare(String(old.sourceHash??""))>0)) {
      groups.set(k,row);
    }
  }
  return [...groups.values()].sort((a,b)=>
    String(a.logicalSeriesId).localeCompare(String(b.logicalSeriesId))
    || String(a.observationDate).localeCompare(String(b.observationDate))
    || String(a.geographyCode).localeCompare(String(b.geographyCode))
  );
}

function startBuffer(scoreAsOf) {
  const d=new Date(scoreAsOf);
  if(!Number.isFinite(d.getTime())) throw new TypeError("SCORE_AS_OF_INVALID");
  d.setUTCFullYear(d.getUTCFullYear()-12);
  return d.toISOString().slice(0,10);
}

export function createEmploymentR6ObservationReader(db) {
  if(!db || typeof db.prepare!=="function") throw new TypeError("D1_DATABASE_REQUIRED");
  const stmt=(sql,values=[])=>db.prepare(sql).bind(...values);

  async function loadAsOf(scoreAsOf, {
    logicalSeriesIds=EMPLOYMENT_R6_REQUIRED_LOGICAL_SERIES,
  }={}) {
    if(!Array.isArray(logicalSeriesIds)||!logicalSeriesIds.length) return [];
    const startDate=startBuffer(scoreAsOf);
    const endDate=new Date(scoreAsOf).toISOString().slice(0,10);
    const q=logicalSeriesIds.map(()=>"?").join(",");
    const r=await stmt(`SELECT * FROM ${EMPLOYMENT_R6_TABLES.observationHistory}
      WHERE logical_series_id IN (${q})
        AND observation_date>=?
        AND observation_date<=?
      ORDER BY logical_series_id,observation_date,history_id`,
      [...logicalSeriesIds,startDate,endDate]).all();
    return selectAsOfRevisions(rowsFromAll(r),scoreAsOf);
  }

  return { loadAsOf };
}

export const EMPLOYMENT_R6_OBSERVATION_READER_CONTRACT=Object.freeze({
  storedHistoryOnly:true,
  providerCalls:0,
  futureRevisionForbidden:true,
  lookbackBufferYears:12,
});
