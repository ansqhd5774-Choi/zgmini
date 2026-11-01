// Pure draft projection for an independently checkpointed Census QFR informational row.
// NO D1 writer, key registration, Worker route, HTTP call, score or PC database mutation.
import crypto from 'node:crypto';
import {PROVIDER,DATASET,CONTRACT}
  from './EARNINGS_CENSUS_QFR_R2_SQLITE_APPEND.mjs';

export const QFR_DRAFT_SCHEMA='earnings-companion-c-qfr-r1-v1';
// Key/schema approved 2026-10-28. This pure draft itself never authorizes a D1 write.
// Actual publication needs the separately source-gated R4_D1_ONCE publisher.
export const QFR_PROPOSED_D1_KEY='detail:earnings-recession-indicators:census-qfr-mfg-margin:v1';
const ID='census_qfr_manufacturing_after_tax_margin_nsa';
const URL='https://www.census.gov/econ_getzippedfile/?programCode=QFR';
const SHA=/^[a-f0-9]{64}$/;
const fail=code=>{throw Error(code);};
const keys=(v,allowed,code)=>{
  if(!v||typeof v!=='object'||Array.isArray(v)
    ||Object.keys(v).some(k=>!allowed.includes(k)))fail(code);
};
const isUtc=value=>typeof value==='string'
  &&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value)
  &&Number.isFinite(Date.parse(value))&&new Date(value).toISOString()===value;
const ordinal=value=>{
  if(!/^\d{4}-Q[1-4]$/.test(value??''))fail('QFR_R4_QUARTER_INVALID');
  const [year,quarter]=value.split('-Q').map(Number);
  return year*4+quarter-1;
};

export function draftQfrPayload(preview,{generatedAt=new Date().toISOString()}={}){
  if(!preview||preview.status!=='PASS_QFR_STORED_READONLY_PREVIEW'
    ||preview.provider!==PROVIDER||preview.dataset!==DATASET||preview.contract!==CONTRACT
    ||!SHA.test(preview.sourceSha256??'')||!SHA.test(preview.snapshotSha256??'')
    ||!Number.isSafeInteger(preview.sourceStoredAt)||preview.sourceStoredAt<=0
    ||!isUtc(preview.sourceRetrievedAt)
    ||Date.parse(preview.sourceRetrievedAt)!==preview.sourceStoredAt
    ||preview.historyMode!=='CURRENT_RETRIEVAL_NOT_PIT'
    ||preview.officialVintageId!==null||preview.adjustment!=='NOT_SEASONALLY_ADJUSTED'
    ||preview.sourceURL!==URL||preview.scoreInput!==false
    ||preview.independentSourceCount!==1||preview.storedSnapshotsChecked<1
    ||!isUtc(generatedAt)||Date.parse(generatedAt)<preview.sourceStoredAt
    ||Date.parse(generatedAt)>Date.now())
    fail('QFR_R4_SOURCE_PREVIEW_INVALID');
  if(!Array.isArray(preview.history)||preview.history.length!==5)
    fail('QFR_R4_HISTORY_INVALID');
  const sourceRows=preview.history;
  let first=null;
  for(let i=0;i<sourceRows.length;i++){
    const raw=sourceRows[i];
    keys(raw,['period','salesMillionsUSD','afterTaxProfitMillionsUSD','afterTaxProfitMarginPct'],
      'QFR_R4_RAW_EXTRA_FIELD');
    const at=ordinal(raw.period);
    if(first===null)first=at;
    if(at!==first+i||!(raw.salesMillionsUSD>0)
      ||!Number.isFinite(raw.afterTaxProfitMillionsUSD)
      ||raw.afterTaxProfitMarginPct!==100*raw.afterTaxProfitMillionsUSD/raw.salesMillionsUSD)
      fail('QFR_R4_HISTORY_LINEAGE_INVALID');
  }
  const current=sourceRows.at(-1),previous=sourceRows.at(-2),indicator=preview.indicator;
  if(!indicator||indicator.indicatorId!==ID||indicator.kind!=='DERIVED'
    ||indicator.unit!=='PERCENT'||indicator.observationPeriod!==current.period
    ||indicator.previousPeriod!==previous.period
    ||preview.observedThrough!==current.period
    ||indicator.value!==current.afterTaxProfitMarginPct
    ||indicator.previousValue!==previous.afterTaxProfitMarginPct
    ||indicator.changePercentagePoints!==indicator.value-indicator.previousValue
    ||indicator.releaseDate!==null
    ||indicator.methodology!=='100 * after_tax_profit_millions_usd / sales_millions_usd')
    fail('QFR_R4_INDICATOR_LINEAGE_INVALID');
  const payload={
    schemaVersion:QFR_DRAFT_SCHEMA,status:'READY',sourceVersion:preview.snapshotSha256,
    sourceSha256:preview.sourceSha256,
    sourceStoredAt:preview.sourceStoredAt,generatedAt,
    historicalMode:'CURRENT_RETRIEVAL_NOT_PIT',
    observedThrough:current.period,
    coverage:{configured:1,ready:1,independentSources:1},
    rows:[{
      indicatorId:ID,name:'미국 제조업 세후이익률',category:'PROFITABILITY',kind:'DERIVED',
      provider:'CENSUS',publisher:'U.S. Census Bureau',dataset:DATASET,
      sourceURL:URL,frequency:'QUARTERLY',adjustment:'NSA',unit:'PERCENT',
      value:indicator.value,previousValue:indicator.previousValue,
      change:indicator.changePercentagePoints,changeUnit:'PERCENTAGE_POINTS',
      observationPeriod:current.period,previousPeriod:previous.period,
      retrievedAt:preview.sourceRetrievedAt,releaseDate:null,officialVintageId:null,
      method:'AFTER_TAX_PROFIT_DIVIDED_BY_NET_SALES',status:'READY',
      history:sourceRows.map(row=>({period:row.period,value:row.afterTaxProfitMarginPct})),
    }],
  };
  if(JSON.stringify(payload).length>30_000)fail('QFR_R4_PAYLOAD_TOO_LARGE');
  return {proposedKey:QFR_PROPOSED_D1_KEY,payload,
    previewSha256:crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex'),
    checkpoint:{sourceVersion:payload.sourceVersion,sourceStoredAt:payload.sourceStoredAt},
    approvedForD1Write:false,workerRegistered:false,siteDeployed:false};
}
