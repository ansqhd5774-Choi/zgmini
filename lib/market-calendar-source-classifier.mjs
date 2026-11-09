// Map existing model inputs to existing official release IDs or to an explicit
// non-event cadence. No invented dates and no mutation of the public event feed.
const release=(source,id)=>({eligibility:'OFFICIAL_RELEASE',officialLinks:[{source,id}]});
const prefix=(source,idPrefix)=>({eligibility:'OFFICIAL_RELEASE',officialLinks:[{source,idPrefix}]});
const other=eligibility=>({eligibility,officialLinks:[]});

const fredRelease=Object.freeze({
 CPIAUCSL:['bls','cpi'],CPILFESL:['bls','cpi'],
 PCEPI:['bea','pce'],PCEPILFE:['bea','pce'],PCEC96:['bea','pce'],
 PPIFIS:['bls','ppi'],WPSFD49116:['bls','ppi'],
 ECIALLCIV:['bls','eci'],PRS85006111:['bls','productivity'],
 INDPRO:['fed','industrial-production'],IREXFUELS:['bls','import-export-prices'],
 CES0500000003:['bls','employment'],CES0500000011:['bls','employment'],
 EMRATIO:['bls','employment'],USPRIV:['bls','employment'],
});
const fredDaily=new Set([
 'DGS2','DGS5','DGS10','DGS30','SOFR','IORB','OBFR','RRPONTSYD',
 'DTWEXBGS','EXPINF5YR','MCOILWTICO','MCOILBRENTEU',
]);
const fredCadence=new Set([
 'CDSP','DRCLACBS','GASREGCOVM','MEDCPIM094SFRBCLE','TRMMEANCPIM094SFRBCLE',
 'M2SL','NFCICREDIT','H41RESPPALDKNWW','TLAACBM027NBOG','WLCFLPCL',
 'WLCFLSCL','WLCFOCEL','WRESBAL','WTREGEN',
]);

export function classifyEconomicModelInput({provider,sourceId,kind}){
 if(kind==='DERIVED_SIGNAL'){
  if(provider!=='SEC_REGISTERED_FUND_MODEL_INPUT')throw Error('SOURCE_DERIVED_PROVIDER_UNKNOWN');
  return other('UNSCHEDULED');
 }
 if(provider==='FRED'){
  if(Object.hasOwn(fredRelease,sourceId))return release(...fredRelease[sourceId]);
  if(fredDaily.has(sourceId))return other('MARKET_DAILY');
  if(fredCadence.has(sourceId))return other('CADENCE_POLICY');
  throw Error('SOURCE_FRED_MAPPING_REQUIRED:'+sourceId);
 }
 if(provider==='BLS_CPS'||provider==='BLS_CES')return release('bls','employment');
 if(provider==='BLS_JOLTS')return release('bls','jolts');
 if(provider==='BLS_ECI')return release('bls','eci');
 if(provider==='BLS_BED')return release('bls','bls-business-employment-dynamics');
 if(provider==='BLS_CES_SAE'){
  if(sourceId==='SMS00000000000000022')return release('bls','bls-state-employment-and-unemployment');
  if(sourceId==='SMS99999990000000022')return release('bls','bls-metropolitan-area-employment-and-unemployment');
  throw Error('SOURCE_BLS_SAE_MAPPING_REQUIRED');
 }
 if(provider==='DOL_ETA')return other('CADENCE_POLICY');
 if(provider==='BEA')return release('bea','pce');
 if(provider==='CENSUS_M3')return prefix('census','census-full-report-manufacturers-shipments-inventories-and-orders-');
 if(provider==='CENSUS_BFS')return prefix('census','census-business-formation-statistics-');
 if(provider==='FRB_G17')return release('fed','industrial-production');
 if(provider==='NYFED_EFFR'||provider==='FRB_H15'||provider==='OFR')return other('MARKET_DAILY');
 if(provider==='NYFED_CMDI'||provider==='WORLD_BANK')return other('CADENCE_POLICY');
 throw Error('SOURCE_PROVIDER_MAPPING_REQUIRED:'+provider);
}
