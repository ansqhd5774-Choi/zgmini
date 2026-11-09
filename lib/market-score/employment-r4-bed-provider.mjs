import {
  EMPLOYMENT_R4_PIT_CLASSES,
  EMPLOYMENT_R4_SHADOW_SCHEMA_VERSION,
} from "./employment-r4-shadow-contract.mjs";
import {
  EMPLOYMENT_R4_BED_FREEZE,
} from "./employment-r4-bed-candidate.mjs";

export const BLS_BED_PUBLIC_API_URL = "https://api.bls.gov/publicAPI/v1/timeseries/data/";
const BLS_BED_REGISTERED_API_URL = "https://api.bls.gov/publicAPI/v2/timeseries/data/";
export const EMPLOYMENT_R4_BED_PROVIDER_REVISION = "EMP-R4-BED-PROVIDER-R1";

const MAX_SERIES_PER_REQUEST = 50;
const finite = value => typeof value === "number" && Number.isFinite(value);

function registrationKey(env) {
  return (typeof env?.BLS_API_KEY === "string" ? env.BLS_API_KEY.trim() : "")
    || (typeof env?.BLS_REGISTRATION_KEY === "string" ? env.BLS_REGISTRATION_KEY.trim() : "");
}

function responseSeries(payload) {
  const result=payload?.Results;
  if(Array.isArray(result?.series))return result.series;
  if(Array.isArray(result))return result.flatMap(batch=>Array.isArray(batch?.series)?batch.series:[]);
  throw new Error("BLS_BED_RESPONSE_MALFORMED");
}

function stable(value) {
  if (value == null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(stable);
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
}
async function sha256Hex(value) {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map(v => v.toString(16).padStart(2,"0")).join("");
}
function retrievedIso(value) {
  const out = value instanceof Date ? value.toISOString() : String(value ?? "");
  if (!Number.isFinite(Date.parse(out))) throw new TypeError("RETRIEVED_AT_INVALID");
  return out;
}
function quarterEnd(year, period) {
  const q = Number(String(period ?? "").replace(/^Q0?/,""));
  if (!Number.isInteger(q) || q < 1 || q > 4) return null;
  const month = q * 3;
  return new Date(Date.UTC(Number(year), month, 0)).toISOString().slice(0,10);
}
function chunk(values, size) {
  const out=[];
  for(let i=0;i<values.length;i+=size) out.push(values.slice(i,i+size));
  return out;
}

function descriptorMap() {
  const out = new Map();
  const f = EMPLOYMENT_R4_BED_FREEZE.features;
  out.set(f.BED_NET_GROSS_RATE.gainSeriesId, {
    logicalSeriesId:"BED_GROSS_GAINS_RATE",
    geographyType:"NATIONAL",
    geographyCode:"US",
    unit:"BLS_BED_RATE",
    populationCoverage:"PRIVATE_SECTOR",
  });
  out.set(f.BED_NET_GROSS_RATE.lossSeriesId, {
    logicalSeriesId:"BED_GROSS_LOSSES_RATE",
    geographyType:"NATIONAL",
    geographyCode:"US",
    unit:"BLS_BED_RATE",
    populationCoverage:"PRIVATE_SECTOR",
  });

  for (const code of EMPLOYMENT_R4_BED_FREEZE.researchUniverse.smallFirm.sizeClassCodes) {
    const p = EMPLOYMENT_R4_BED_FREEZE.researchUniverse.smallFirm.levelPairs[code];
    out.set(p.gainSeriesId, {
      logicalSeriesId:"BED_SMALL_FIRM_GAINS_LEVEL",
      geographyType:"FIRM_SIZE_CLASS",
      geographyCode:code,
      unit:"BLS_BED_LEVEL",
      populationCoverage:"PRIVATE_SECTOR_FIRM_SIZE_1_49",
    });
    out.set(p.lossSeriesId, {
      logicalSeriesId:"BED_SMALL_FIRM_LOSSES_LEVEL",
      geographyType:"FIRM_SIZE_CLASS",
      geographyCode:code,
      unit:"BLS_BED_LEVEL",
      populationCoverage:"PRIVATE_SECTOR_FIRM_SIZE_1_49",
    });
  }

  for (const p of EMPLOYMENT_R4_BED_FREEZE.researchUniverse.stateBreadth.pairs) {
    out.set(p.gainSeriesId, {
      logicalSeriesId:"BED_STATE_GAINS_LEVEL",
      geographyType:"STATE",
      geographyCode:p.code,
      unit:"BLS_BED_LEVEL",
      populationCoverage:"PRIVATE_SECTOR_STATE",
    });
    out.set(p.lossSeriesId, {
      logicalSeriesId:"BED_STATE_LOSSES_LEVEL",
      geographyType:"STATE",
      geographyCode:p.code,
      unit:"BLS_BED_LEVEL",
      populationCoverage:"PRIVATE_SECTOR_STATE",
    });
  }

  out.set(f.BED_BIRTH_DEATH_DIAGNOSTIC.birthRateSeriesId, {
    logicalSeriesId:"BED_ESTABLISHMENT_BIRTH_RATE",
    geographyType:"NATIONAL",
    geographyCode:"US",
    unit:"BLS_BED_RATE",
    populationCoverage:"PRIVATE_SECTOR",
  });
  out.set(f.BED_BIRTH_DEATH_DIAGNOSTIC.deathRateSeriesId, {
    logicalSeriesId:"BED_ESTABLISHMENT_DEATH_RATE",
    geographyType:"NATIONAL",
    geographyCode:"US",
    unit:"BLS_BED_RATE",
    populationCoverage:"PRIVATE_SECTOR",
  });
  return out;
}
export const EMPLOYMENT_R4_BED_SERIES = Object.freeze(
  Object.fromEntries([...descriptorMap()].map(([id, meta]) => [id, Object.freeze({...meta})]))
);
export const EMPLOYMENT_R4_BED_SERIES_IDS = Object.freeze(Object.keys(EMPLOYMENT_R4_BED_SERIES));

export async function parseBlsBedShadowRows(payload, {
  retrievedAt,
  requestedSeriesIds = EMPLOYMENT_R4_BED_SERIES_IDS,
  sourceUrl = BLS_BED_PUBLIC_API_URL,
} = {}) {
  const rt = retrievedIso(retrievedAt);
  const requested = new Set(requestedSeriesIds.map(String));
  const responseHash = await sha256Hex(JSON.stringify(stable(payload)));
  const rows=[];
  const returned=new Set();
  const series = responseSeries(payload);
  for (const s of series) {
    const id = String(s?.seriesID ?? "");
    const meta = EMPLOYMENT_R4_BED_SERIES[id];
    if (!meta || !requested.has(id)) continue;
    const data = (s.data ?? [])
      .filter(d => {
        const raw = String(d?.value ?? "").trim();
        return raw !== "" && /^Q0?[1-4]$/.test(String(d?.period ?? ""))
          && finite(Number(raw.replace(/,/g, "")));
      })
      .map(d => ({...d, value:Number(String(d.value).trim().replace(/,/g, "")), observationDate:quarterEnd(d.year,d.period)}))
      .filter(d => d.observationDate)
      .sort((a,b)=>a.observationDate.localeCompare(b.observationDate));
    // A returned series with no valid observation remains missing.
    if (!data.length) continue;
    returned.add(id);

    for (const item of data) {
      const canonical = JSON.stringify(stable({
        seriesID:id,
        year:item.year,
        period:item.period,
        value:item.value,
        footnotes:item.footnotes ?? [],
      }));
      rows.push({
        logicalSeriesId:meta.logicalSeriesId,
        provider:"BLS_BED",
        providerSeriesId:id,
        geographyType:meta.geographyType,
        geographyCode:meta.geographyCode,
        frequency:"QUARTERLY",
        unit:meta.unit,
        seasonalAdjustment:"SA",
        populationCoverage:meta.populationCoverage,
        observationDate:item.observationDate,
        releaseDate:null,
        availableAt:null,
        retrievedAt:rt,
        value:item.value,
        sourceRevision:null,
        sourceHash:await sha256Hex(canonical),
        qualityStatus:"READY_BED",
        pitClass:EMPLOYMENT_R4_PIT_CLASSES.historicalCurrentVintage,
        schemaVersion:EMPLOYMENT_R4_SHADOW_SCHEMA_VERSION,
        provenance:{
          sourceUrl,
          seriesID:id,
          observationPeriod:`${item.year}-${item.period}`,
          observationDateConvention:"QUARTER_END",
          footnotes:item.footnotes ?? [],
          responseHash,
          rawRecordHash:await sha256Hex(canonical),
          bedRole:"OPTIONAL_STRUCTURAL_CANDIDATE",
        },
      });
    }
  }
  return {
    rows,
    meta:{
      sourceUrl,
      responseHash,
      requestedSeries:[...requested].sort(),
      returnedSeries:[...returned].sort(),
      missingSeries:[...requested].filter(id=>!returned.has(id)).sort(),
    },
  };
}

export function createEmploymentR4BedProvider({
  fetchImpl=globalThis.fetch,
  now=()=>new Date(),
  env={},
}={}) {
  if (typeof fetchImpl !== "function") throw new TypeError("FETCH_REQUIRED");
  return {
    async fetchBedQuarterly({startyear=null,endyear=null}={}) {
      const key=registrationKey(env);
      if(!key)throw new Error("BLS_REGISTRATION_KEY_MISSING");
      const retrievedAt=now().toISOString();
      const currentYear=Number(retrievedAt.slice(0,4));
      const start=String(startyear ?? Math.max(1992,currentYear-2));
      const end=String(endyear ?? currentYear);
      const batches=chunk(EMPLOYMENT_R4_BED_SERIES_IDS,MAX_SERIES_PER_REQUEST);
      const rows=[],missing=new Set(),batchMeta=[];
      let requestCount=0;
      for (let i=0;i<batches.length;i++) {
        const seriesid=batches[i];
        const response=await fetchImpl(BLS_BED_REGISTERED_API_URL,{
          method:"POST",
          headers:{"content-type":"application/json","user-agent":"ZGMINI-R4-BED/1.0"},
          body:JSON.stringify({seriesid,startyear:start,endyear:end,registrationkey:key}),
        });
        requestCount++;
        if(!response?.ok) throw new Error(`BLS_BED_HTTP_${response?.status ?? "ERR"}`);
        const payload=await response.json();
        if(payload?.status!=="REQUEST_SUCCEEDED") {
          const message=(payload?.message ?? []).join("|");
          throw new Error(`BLS_BED_REQUEST_${payload?.status ?? "FAILED"}:${message}`);
        }
        const parsed=await parseBlsBedShadowRows(payload,{retrievedAt,requestedSeriesIds:seriesid,sourceUrl:BLS_BED_REGISTERED_API_URL});
        rows.push(...parsed.rows);
        parsed.meta.missingSeries.forEach(id=>missing.add(id));
        batchMeta.push({
          batch:i+1,
          requested:seriesid.length,
          returned:parsed.meta.returnedSeries.length,
          missing:parsed.meta.missingSeries,
          responseHash:parsed.meta.responseHash,
        });
      }
      return {
        rows,
        requestCount,
        retrievedAt,
        startyear:start,
        endyear:end,
        meta:{
          sourceUrl:BLS_BED_REGISTERED_API_URL,
          seriesRequested:EMPLOYMENT_R4_BED_SERIES_IDS,
          missingSeries:[...missing].sort(),
          batches:batchMeta,
        },
      };
    },
  };
}

export const EMPLOYMENT_R4_BED_PROVIDER_CONTRACT = Object.freeze({
  revision:EMPLOYMENT_R4_BED_PROVIDER_REVISION,
  provider:"BLS_BED",
  quarterly:true,
  requestsPerRun:Math.ceil(EMPLOYMENT_R4_BED_SERIES_IDS.length/MAX_SERIES_PER_REQUEST),
  seriesPerRequestMax:MAX_SERIES_PER_REQUEST,
  seriesCount:EMPLOYMENT_R4_BED_SERIES_IDS.length,
  storeOnly:true,
  scoreComputed:false,
  activeMethodologyChanged:false,
  publicScoreWiring:false,
});
