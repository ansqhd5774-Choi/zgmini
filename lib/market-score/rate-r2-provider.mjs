const validDate = value =>
  typeof value === 'string'
  && /^\d{4}-\d{2}-\d{2}$/.test(value)
  && Number.isFinite(Date.parse(value))
  && new Date(value).toISOString().slice(0,10) === value;

const finite = value => typeof value === 'number' && Number.isFinite(value);
const rateNumber = value => {
  if(value===null||value===undefined||(typeof value!=='number'&&typeof value!=='string')||(typeof value==='string'&&!value.trim()))return NaN;
  return Number(value);
};

export const RATE_R2_PROVIDER_URLS = Object.freeze({
  nyFedEffr: asOf =>
    `https://markets.newyorkfed.org/api/rates/unsecured/effr/search.json?startDate=2003-01-01&endDate=${asOf}&type=rate`,
  h15Nominal:
    'https://www.federalreserve.gov/datadownload/Output.aspx?filetype=csv&from=&label=include&lastobs=&layout=seriescolumn&rel=H15&series=bf17364827e38702b42a58cf8eaa3f78&to=&type=package',
  h15Real:
    'https://www.federalreserve.gov/datadownload/Output.aspx?filetype=csv&from=&label=include&lastobs=&layout=seriescolumn&rel=H15&series=0b98a66d3ff5e1ea0fbf88adc59b387f&to=&type=package',
});

const H15_SERIES = Object.freeze({
  DGS3MO:'RIFLGFCM03_N.B',
  DGS2:'RIFLGFCY02_N.B',
  DGS10:'RIFLGFCY10_N.B',
  DFII10:'RIFLGFCY10_XII_N.B',
});

function toIsoDate(value) {
  if (validDate(value)) return value;
  const match = typeof value === 'string' ? value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/) : null;
  if (!match) return null;
  const iso = `${match[3]}-${String(match[1]).padStart(2,'0')}-${String(match[2]).padStart(2,'0')}`;
  return validDate(iso) ? iso : null;
}

function csvLine(line) {
  const out = [];
  let value = '';
  let quoted = false;
  for (let i=0;i<line.length;i++) {
    const c=line[i];
    if (c === '"') {
      if (quoted && line[i+1] === '"') { value += '"'; i += 1; }
      else quoted = !quoted;
    } else if (c === ',' && !quoted) {
      out.push(value.trim());
      value = '';
    } else {
      value += c;
    }
  }
  out.push(value.trim());
  return out;
}

const cleanSeriesId = value => String(value ?? '').trim().replace(/^H15\/H15\//,'');

export function parseH15DdpCsv(text, asOf, mapping = {}) {
  if (!validDate(asOf)) throw new Error('INVALID_AS_OF');
  if (typeof text !== 'string' || !text.trim()) throw new Error('EMPTY_CSV');

  const lines=text.replace(/^\uFEFF/,'').replace(/\r/g,'').split('\n').filter(line=>line.trim());
  const rows=lines.map(csvLine);
  const headerIndex=rows.findIndex(cols => String(cols[0]??'').trim().toLowerCase() === 'time period');
  if (headerIndex < 0) throw new Error('TIME_PERIOD_HEADER_MISSING');

  const ids=rows[headerIndex].map(cleanSeriesId);
  const indexes={};
  for (const [outKey,seriesId] of Object.entries(mapping)) {
    const idx=ids.findIndex(id=>id===seriesId);
    if (idx<0) throw new Error(`SERIES_COLUMN_MISSING:${outKey}`);
    indexes[outKey]=idx;
  }

  const seen=Object.fromEntries(Object.keys(indexes).map(key=>[key,new Map()]));
  for (let i=headerIndex+1;i<rows.length;i++) {
    const cols=rows[i];
    const date=toIsoDate(cols[0]);
    if (!date || date<'2003-01-01' || date>asOf) continue;
    for (const [key,idx] of Object.entries(indexes)) {
      const raw=String(cols[idx]??'').trim();
      if (!raw || /^(ND|NA|N\/A)$/i.test(raw)) continue;
      const value=Number(raw);
      if (!finite(value)) throw new Error(`INVALID_NUMERIC:${key}`);
      if (seen[key].has(date) && seen[key].get(date)!==value) throw new Error(`DUPLICATE_CONFLICT:${key}`);
      seen[key].set(date,value);
    }
  }

  const out={};
  for (const key of Object.keys(indexes)) {
    out[key]=[...seen[key]]
      .sort(([a],[b])=>a.localeCompare(b))
      .map(([observationDate,value])=>({observationDate,value}));
    if (!out[key].length) throw new Error(`NO_VALID_ROWS:${key}`);
  }
  return out;
}

export function parseNyFedEffr(payload, asOf) {
  if (!validDate(asOf)) throw new Error('INVALID_AS_OF');
  if (!payload || !Array.isArray(payload.refRates)) throw new Error('INVALID_RESPONSE');
  const effr=new Map(),lower=new Map(),upper=new Map();
  for (const row of payload.refRates) {
    if (String(row?.type??'').toUpperCase() !== 'EFFR') continue;
    const date=toIsoDate(row?.effectiveDate);
    if (!date || date<'2003-01-01' || date>asOf) continue;
    const rate=rateNumber(row?.percentRate);
    if (finite(rate)) effr.set(date,rate);
    const lo=rateNumber(row?.targetRateFrom);
    const hi=rateNumber(row?.targetRateTo);
    if (finite(lo)) lower.set(date,lo);
    if (finite(hi)) upper.set(date,hi);
  }
  const rows = map => [...map]
    .sort(([a],[b])=>a.localeCompare(b))
    .map(([observationDate,value])=>({observationDate,value}));
  const result={EFFR:rows(effr),DFEDTARL:rows(lower),DFEDTARU:rows(upper)};
  if (!result.EFFR.length) throw new Error('NO_EFFR_ROWS');
  return result;
}

async function boundedText(url,{
  fetchImpl=globalThis.fetch,
  timeoutMs=10000,
  maxBytes=5_000_000,
  accept='*/*',
}={}) {
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),Math.min(Math.max(timeoutMs,1),12000));
  let reader;
  try {
    const response=await Reflect.apply(fetchImpl,globalThis,[url,{
      redirect:'follow',
      signal:controller.signal,
      headers:{
        accept,
        'user-agent':'ZGMINI/1.0 official-rate-data',
      },
    }]);
    if (!response?.ok) throw new Error(response?.status===429?'QUOTA_EXCEEDED':`HTTP_${response?.status??'ERROR'}`);
    reader=response.body?.getReader();
    if (!reader) throw new Error('INVALID_RESPONSE');
    const decoder=new TextDecoder();
    let text='',bytes=0;
    while (true) {
      const {done,value}=await reader.read();
      if (done) break;
      bytes+=value.byteLength;
      if (bytes>maxBytes) throw new Error('BODY_LIMIT');
      text+=decoder.decode(value,{stream:true});
    }
    text+=decoder.decode();
    return text;
  } catch (error) {
    if (controller.signal.aborted) throw new Error('TIMEOUT');
    throw error;
  } finally {
    clearTimeout(timer);
    if (reader) void reader.cancel().catch(()=>{});
  }
}

async function fetchNyFed(asOf,{fetchImpl=globalThis.fetch,timeoutMs=10000}={}) {
  const text=await boundedText(RATE_R2_PROVIDER_URLS.nyFedEffr(asOf),{
    fetchImpl,timeoutMs,maxBytes:4_000_000,accept:'application/json',
  });
  let payload;
  try { payload=JSON.parse(text); } catch { throw new Error('INVALID_JSON'); }
  return parseNyFedEffr(payload,asOf);
}

async function fetchH15Nominal(asOf,{fetchImpl=globalThis.fetch,timeoutMs=10000}={}) {
  const text=await boundedText(RATE_R2_PROVIDER_URLS.h15Nominal,{
    fetchImpl,timeoutMs,maxBytes:3_000_000,accept:'text/csv,*/*',
  });
  return parseH15DdpCsv(text,asOf,{
    DGS3MO:H15_SERIES.DGS3MO,
    DGS2:H15_SERIES.DGS2,
    DGS10:H15_SERIES.DGS10,
  });
}

async function fetchH15Real(asOf,{fetchImpl=globalThis.fetch,timeoutMs=10000}={}) {
  const text=await boundedText(RATE_R2_PROVIDER_URLS.h15Real,{
    fetchImpl,timeoutMs,maxBytes:3_000_000,accept:'text/csv,*/*',
  });
  return parseH15DdpCsv(text,asOf,{DFII10:H15_SERIES.DFII10});
}

export async function collectRateR2Inputs({
  base,
  asOf,
  fetchImpl=globalThis.fetch,
  timeoutMs=10000,
}={}) {
  if (!validDate(asOf)) {
    return {
      ...base,
      rateR2:{status:'PARTIAL',series:{},failures:[{provider:'RATE_R2',status:'INVALID_AS_OF'}]},
    };
  }
  const jobs=[
    ['NYFED_EFFR',()=>fetchNyFed(asOf,{fetchImpl,timeoutMs})],
    ['FED_H15_NOMINAL',()=>fetchH15Nominal(asOf,{fetchImpl,timeoutMs})],
    ['FED_H15_REAL',()=>fetchH15Real(asOf,{fetchImpl,timeoutMs})],
  ];
  const settled=await Promise.all(jobs.map(async([provider,fn])=>{
    try { return {provider,status:'READY',series:await fn()}; }
    catch(error) { return {provider,status:error?.message??'REQUEST_FAILED',series:{}}; }
  }));
  const series={};
  for (const result of settled) Object.assign(series,result.series);
  const required=['EFFR','DFEDTARL','DFEDTARU','DGS3MO','DGS2','DGS10','DFII10'];
  const missing=required.filter(id=>!Array.isArray(series[id])||!series[id].length);
  const failures=settled.filter(x=>x.status!=='READY').map(x=>({provider:x.provider,status:x.status}));
  const status=missing.length?'PARTIAL':'READY';
  return {
    ...base,
    rateR2:{
      status,
      series,
      missing,
      failures,
      providers:settled.map(x=>({provider:x.provider,status:x.status})),
      historyMode:'CURRENT_VINTAGE_ONLY',
      sourcePolicy:'OFFICIAL_PUBLICATION_DIRECT',
    },
    providerSummary:{
      ...(base?.providerSummary??{}),
      rateR2:{
        status,
        missing,
        failures,
        requestCount:3,
        sourcePolicy:'OFFICIAL_PUBLICATION_DIRECT',
      },
    },
  };
}

export const RATE_R2_PROVIDER_CONTRACT = Object.freeze({
  sourcePolicy:'OFFICIAL_PUBLICATION_DIRECT',
  nyFedTransport:'NYFED_MARKETS_API',
  treasuryTransport:'FED_BOARD_H15_DDP_CSV',
  h15NominalSeries:Object.freeze({
    DGS3MO:H15_SERIES.DGS3MO,
    DGS2:H15_SERIES.DGS2,
    DGS10:H15_SERIES.DGS10,
  }),
  h15RealSeries:Object.freeze({DFII10:H15_SERIES.DFII10}),
  requiredSeries:Object.freeze(['EFFR','DFEDTARL','DFEDTARU','DGS3MO','DGS2','DGS10','DFII10']),
  displaySeries:Object.freeze(['DFEDTARL','DFEDTARU','DGS2','DFII10','DGS10']),
  retries:0,
  timeoutMs:10000,
  secretsRequired:false,
});
