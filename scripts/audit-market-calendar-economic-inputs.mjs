// Read-only, reproducible 10-domain *model input* census.
// Do not equate an input field with an independent provider publication.
// No provider requests, database access, changes to scoring or operational writes.
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {INFLATION_PIT_SERIES} from '../worker/inflation-pit-backfill.mjs';
import {EMPLOYMENT_R6_BLS_SERIES} from '../lib/market-score/employment-r6-contract.mjs';
import {EMPLOYMENT_R4_BED_SERIES} from '../lib/market-score/employment-r4-bed-provider.mjs';
import {EMPLOYMENT_R4_CORE_STATES} from '../lib/market-score/employment-r4-shadow-contract.mjs';
import {PROJECTION_MACRO_SERIES} from '../worker/projection-input-manifest-r60.mjs';
import {OFR_MNEMONICS} from '../lib/diagnostic-layer/batch-b-official-adapters.mjs';

const EXPECTED_DOMAIN_APPEARANCES=Object.freeze({
 inflation:16,employment:186,rate:7,credit:7,growth:21,
 consumption:29,liquidity:18,fundFlows:4,dollar:1,commodity:4,
});
const key=entry=>JSON.stringify([entry.provider,entry.sourceId,entry.geography]);
const sha256=x=>createHash('sha256').update(x).digest('hex');
const clean=x=>String(x).trim().toUpperCase();

/**
 * An input may be a provider series or a virtual model field. That distinction
 * matters when counting independent datasets or attaching official releases.
 * The keys below match the fixed model-input taxonomy under review; they are
 * not a verified inventory of enabled/stored series on the live Windows PC.
 */
export function buildEconomicModelInputCensus(){
 const appearances=[];
 const add=(domain,provider,sourceId,geography='US',kind='PROVIDER_SERIES')=>{
  appearances.push({domain,provider:clean(provider),sourceId:clean(sourceId),
   geography:clean(geography),kind});
 };

 INFLATION_PIT_SERIES.forEach(id=>add('inflation','FRED',id));
 Object.entries(EMPLOYMENT_R6_BLS_SERIES).forEach(([id,m])=>
  add('employment',m.provider,id,m.geographyCode));
 Object.entries(EMPLOYMENT_R4_BED_SERIES).forEach(([id,m])=>
  add('employment','BLS_BED',id,m.geographyCode));
 ['DOL:UI:InitialClaims:SA','DOL:UI:InitialClaims:SA4WK',
  'DOL:UI:ContinuedClaims:SA','DOL:UI:IUR:SA'].forEach(id=>
   add('employment','DOL_ETA',id));
 EMPLOYMENT_R4_CORE_STATES.forEach(state=>add('employment','DOL_ETA','ETA539:C3',state));

 // The first three fields are extracted from ONE NY Fed EFFR API response.
 [['NYFED_EFFR','EFFR','PROVIDER_FIELD'],
  ['NYFED_EFFR','DFEDTARL','PROVIDER_FIELD'],
  ['NYFED_EFFR','DFEDTARU','PROVIDER_FIELD'],
  ['FRB_H15','RIFLGFCM03_N.B','PROVIDER_SERIES'],
  ['FRB_H15','RIFLGFCY02_N.B','PROVIDER_SERIES'],
  ['FRB_H15','RIFLGFCY10_N.B','PROVIDER_SERIES'],
  ['FRB_H15','RIFLGFCY10_XII_N.B','PROVIDER_SERIES']].forEach(([p,id,kind])=>
   add('rate',p,id,'US',kind));
 [['NYFED_CMDI','HY CMDI'],['NYFED_CMDI','IG CMDI'],['FRED','NFCICREDIT'],
  ...['DGS2','DGS5','DGS10','DGS30'].map(id=>['FRED',id])].forEach(([p,id])=>
   add('credit',p,id));

 // Census M3 uses data_type_code + category code; Fed G.17 uses disk+series.
 ['MTM:NO','MDM:NO','NXA:NO','MTM:VS','NXA:VS','MTM:UO','MTM:TI']
  .forEach(id=>add('growth','CENSUS_M3',id));
 ['BA_BA','BA_HBA','BA_WBA'].forEach(id=>add('growth','CENSUS_BFS',id));
 ['IP:B50001','IP:GMF','IP:G21','IP:G2211A2','UTL:B50001','UTL:GMF']
  .forEach(id=>add('growth','FRB_G17',id));
 ['CES0000000001','CES0500000002','CES3000000009',
  'CES0500000016','CES6056132001'].forEach(id=>add('growth','BLS_CES',id));

 [1,2,13,4,5,6,7,9,10,11,12,15,16,17,18,19,20,21,22]
  .forEach(line=>add('consumption','BEA','U20306:'+line));
 [37,35,40].forEach(line=>add('consumption','BEA','T20600:'+line));
 ['PCEC96','EMRATIO','USPRIV','CES0500000011',
  'CPIAUCSL','CDSP','DRCLACBS'].forEach(id=>add('consumption','FRED',id));

 PROJECTION_MACRO_SERIES.liquidityCrisis.forEach(id=>add('liquidity','FRED',id));
 Object.values(OFR_MNEMONICS).forEach(id=>add('liquidity','OFR',id));
 // These are four SEC-derived model signals, NOT four independent SEC files.
 ['fund-flow-54-1','fund-flow-54-2','fund-flow-54-3','fund-flow-54-4']
  .forEach(id=>add('fundFlows','SEC_REGISTERED_FUND_MODEL_INPUT',id,'US','DERIVED_SIGNAL'));
 add('dollar','FRED','DTWEXBGS');
 ['MCOILWTICO','MCOILBRENTEU','GASREGCOVM'].forEach(id=>add('commodity','FRED',id));
 add('commodity','WORLD_BANK','PINK_SHEET_COPPER');

 const domainAppearances=Object.fromEntries(Object.keys(EXPECTED_DOMAIN_APPEARANCES)
  .map(domain=>[domain,appearances.filter(x=>x.domain===domain).length]));
 for(const [domain,count]of Object.entries(EXPECTED_DOMAIN_APPEARANCES)){
  if(domainAppearances[domain]!==count)throw Error(`DOMAIN_COUNT_DRIFT:${domain}`);
 }
 const grouped=new Map();
 for(const entry of appearances){const k=key(entry);grouped.set(k,[...(grouped.get(k)??[]),entry]);}
 const unique=[...grouped.values()].map(entries=>({
  provider:entries[0].provider,sourceId:entries[0].sourceId,
  geography:entries[0].geography,kind:entries[0].kind,
  usedByDomains:[...new Set(entries.map(e=>e.domain))].sort(),
 })).sort((a,b)=>key(a).localeCompare(key(b)));
 const duplicates=unique.filter(x=>x.usedByDomains.length>1);
 const manifestSha256=sha256(JSON.stringify(unique));
 return {status:'CODE_MODEL_INPUT_INVENTORY_ONLY',
  sourceVersion:'CODE_ECONOMIC_MODEL_INPUT_AUDIT_R1',
  modelInputsNotIndependentRawSources:true,
  appearances:appearances.length,uniqueCount:unique.length,
  duplicateAppearances:appearances.length-unique.length,
  domainAppearances,manifestSha256,duplicates,unique};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const report=buildEconomicModelInputCensus();
 const {unique,...summary}=report;
 console.log(JSON.stringify(process.argv.includes('--ids')?report:summary,null,2));
}
