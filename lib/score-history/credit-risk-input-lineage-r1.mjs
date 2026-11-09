import {createHash} from 'node:crypto';
import {scoreInputLineage} from './input-lineage-r1.mjs';

// Shadow-only adapter for the actual stored input shape consumed by
// worker/projection-builders/creditRisk.ts. No DB access or publication.
const BOND_SERIES=Object.freeze(['DGS2','DGS5','DGS10','DGS30']);
const DATE=/^\d{4}-\d{2}-\d{2}$/;
const finite=value=>typeof value==='number'&&Number.isFinite(value);
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const pick=(row,keys)=>row&&typeof row==='object'
 ?Object.fromEntries(keys.filter(key=>Object.hasOwn(row,key)).map(key=>[key,row[key]]))
 :row;
const latestDate=rows=>(rows??[]).map(row=>row?.observationDate).filter(date=>typeof date==='string'&&DATE.test(date)).sort().at(-1)??null;

function source(key,state,body,observationId){
 return {key,state,observationId,bodySha256:body===null?null:digest(body)};
}

/**
 * Compute an observational input signature from the PRELOADED source object
 * returned by loadProjectionSource('creditRisk', ...). This is not an
 * historical score and must not be used to replace the existing checkpoint.
 */
export function creditRiskInputLineage({inputs,snapshot,nowIso}={}){
 const body=snapshot?.body??{};
 const asOf=typeof body.asOfDate==='string'&&DATE.test(body.asOfDate)
  ?body.asOfDate
  :typeof nowIso==='string'&&DATE.test(nowIso.slice(0,10))?nowIso.slice(0,10):null;
 if(!asOf)throw Error('CREDIT_RISK_ASOF_REQUIRED');

 const series=inputs?.series??{};
 const bond=Object.fromEntries(BOND_SERIES.map(key=>[
  key,Array.isArray(series[key])?series[key].map(row=>pick(row,['observationDate','value'])):null,
 ]));
 const presentBond=BOND_SERIES.filter(key=>bond[key]?.length).length;
 const bondDates=BOND_SERIES.flatMap(key=>bond[key]??[]);
 const bondState=presentBond===BOND_SERIES.length?'READY':presentBond?'PARTIAL':'MISSING';

 const rawCmdi=inputs?.external?.cmdiRows;
 const cmdi=Array.isArray(rawCmdi)?rawCmdi.map(row=>pick(row,['observationDate','hy','ig','market'])):null;
 const completeCmdi=cmdi?.some(row=>DATE.test(row?.observationDate)
  &&[row?.hy,row?.ig,row?.market].every(finite));
 const cmdiState=completeCmdi?'READY':cmdi?.length?'PARTIAL':'MISSING';

 const diag=body?.diagnostics8?.creditRiskDefense??null;
 const diagnostic=diag?pick(diag,['status','score']):null;
 const diagnosticState=diag?.status==='READY'&&finite(diag.score)?'READY':diag?'PARTIAL':'MISSING';

 const credit=Array.isArray(body?.domains)?body.domains.find(domain=>domain?.id==='credit'):null;
 const nfci=Array.isArray(credit?.indicators)
  ?credit.indicators.find(item=>item?.id==='credit-43')??null:null;
 const nfciDisplay=nfci?pick(nfci,['score','value','unit','observationDate','asOfDate','source']):null;

 return scoreInputLineage({
  scoreId:'creditRisk',methodologyVersion:'CREDIT_RISK_DIAGNOSTIC_R1',
  eligibilityState:diagnosticState==='READY'?'READY':'PARTIAL',
  // As-of is the actual builder cutoff, not today's publication clock.
  evaluationKey:asOf,
  sources:[
   source('macroBondTenors',bondState,presentBond?bond:null,latestDate(bondDates)),
   source('creditCmdi',cmdiState,cmdi?.length?cmdi:null,latestDate(cmdi)),
   source('publicCreditDiagnostic',diagnosticState,diagnostic,asOf),
   source('publicNfciSupplemental',nfciDisplay?'READY':'MISSING',nfciDisplay,nfci?.observationDate??nfci?.asOfDate??null),
  ],
 });
}
