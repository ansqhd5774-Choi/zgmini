import {annualizedLog3m} from "./earnings-e1-r5-contract.mjs";

const finite=value=>typeof value==="number"&&Number.isFinite(value);
const clean=value=>String(value??"").trim();
const monthKey=(year,period)=>`${year}-${String(Number(period.slice(1))).padStart(2,"0")}-01`;
const sic4=value=>{const digits=String(value??"").replace(/\D/g,"");return digits&&digits.length<=4?digits.padStart(4,"0"):null;};

function parseTsv(text){
  const lines=String(text??"").split(/\r?\n/).filter(line=>line.length>0);
  if(!lines.length)return {headers:[],rows:[]};
  const headers=lines[0].split("\t").map(clean);
  const index=Object.fromEntries(headers.map((header,i)=>[header.toLowerCase(),i]));
  const rows=lines.slice(1).map(line=>line.split("\t").map(clean));
  return {headers,index,rows};
}

export const E1_R5_R4_BLS_SOURCE_CONTRACT=Object.freeze({
  outputSeries:Object.freeze({url:"https://download.bls.gov/pub/time.series/pc/pc.series",localName:"pc.series"}),
  outputData:Object.freeze({url:"https://download.bls.gov/pub/time.series/pc/pc.data.0.Current",localName:"pc.data.0.Current"}),
  ulcSeries:Object.freeze({url:"https://download.bls.gov/pub/time.series/pr/pr.series",localName:"pr.series"}),
  ulcMeasure:Object.freeze({url:"https://download.bls.gov/pub/time.series/pr/pr.measure",localName:"pr.measure"}),
  ulcDuration:Object.freeze({url:"https://download.bls.gov/pub/time.series/pr/pr.duration",localName:"pr.duration"}),
  ulcData:Object.freeze({url:"https://download.bls.gov/pub/time.series/pr/pr.data.0.Current",localName:"pr.data.0.Current",seriesId:"PRS85006111"}),
});

export function parseBlsNetOutputSeries(seriesText){
  const table=parseTsv(seriesText);const i=table.index??{};
  for(const required of ["series_id","industry_code","product_code","seasonal"]){
    if(i[required]==null)return {status:"FAIL",reason:"BLS_PC_SERIES_HEADER_MISMATCH",missing:required,series:[]};
  }
  const rows=[];
  for(const row of table.rows){
    const seriesId=row[i.series_id],industryCode=row[i.industry_code],productCode=row[i.product_code],seasonal=row[i.seasonal];
    if(!/^PCU/.test(seriesId)||seasonal!=="U")continue;
    if(industryCode!==productCode)continue;
    const m=industryCode.match(/^(\d{3})---$/);if(!m)continue;
    const naics3=m[1];
    rows.push({
      seriesId,naics3,industryCode,productCode,
      title:i.series_title==null?null:row[i.series_title]||null,
      beginYear:i.begin_year==null?null:Number(row[i.begin_year])||null,
      beginPeriod:i.begin_period==null?null:row[i.begin_period]||null,
      endYear:i.end_year==null?null:Number(row[i.end_year])||null,
      endPeriod:i.end_period==null?null:row[i.end_period]||null,
    });
  }
  const unique=new Map();
  for(const row of rows){
    if(unique.has(row.naics3))return {status:"FAIL",reason:"BLS_PC_DUPLICATE_NAICS3_NET_OUTPUT",naics3:row.naics3,series:[]};
    unique.set(row.naics3,row);
  }
  return {status:rows.length?"PASS":"PARTIAL",reason:rows.length?null:"BLS_PC_NET_OUTPUT_3DIGIT_MISSING",series:[...unique.values()].sort((a,b)=>a.naics3.localeCompare(b.naics3)),naics3Count:unique.size};
}

function shiftMonth(month,delta){
  if(!/^\d{4}-\d{2}-01$/.test(String(month??"")))return null;
  const [year,m]=month.split("-").map(Number);const date=new Date(Date.UTC(year,m-1+delta,1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth()+1).padStart(2,"0")}-01`;
}

export function parseBlsPpiOutputData(dataText,{series,asOfMonth="9999-12-01"}={}){
  const selected=new Map((series??[]).map(row=>[row.seriesId,row]));
  if(!selected.size)return {status:"PARTIAL",reason:"BLS_PC_SERIES_REQUIRED",series:[]};
  const table=parseTsv(dataText);const i=table.index??{};
  for(const required of ["series_id","year","period","value"]){
    if(i[required]==null)return {status:"FAIL",reason:"BLS_PC_DATA_HEADER_MISMATCH",missing:required,series:[]};
  }
  const bySeries=new Map([...selected.keys()].map(key=>[key,[]]));
  for(const row of table.rows){
    const seriesId=row[i.series_id];if(!bySeries.has(seriesId))continue;
    const year=Number(row[i.year]),period=row[i.period],value=Number(row[i.value]);
    if(!Number.isInteger(year)||!/^M(0[1-9]|1[0-2])$/.test(period)||!finite(value)||value<=0)continue;
    const month=monthKey(year,period);if(month>asOfMonth)continue;
    bySeries.get(seriesId).push({month,value,footnoteCodes:i.footnote_codes==null?null:row[i.footnote_codes]||null});
  }
  const out=[];
  for(const [seriesId,observations] of bySeries){
    observations.sort((a,b)=>a.month.localeCompare(b.month));
    const latest=observations.at(-1)??null;const lagMonth=latest?shiftMonth(latest.month,-3):null;
    const lag3m=lagMonth?observations.find(row=>row.month===lagMonth)??null:null;
    const annualized3m=latest&&lag3m?annualizedLog3m(latest.value,lag3m.value):null;
    const meta=selected.get(seriesId);
    out.push({...meta,observations,observationCount:observations.length,latest,lag3m,annualized3m});
  }
  const ready=out.filter(row=>finite(row.annualized3m));
  return {status:ready.length?"PASS":"PARTIAL",reason:ready.length?null:"BLS_PC_3M_PAIR_MISSING",series:out.sort((a,b)=>a.naics3.localeCompare(b.naics3)),readyCount:ready.length,totalCount:out.length};
}

function lookupCode(tableText,codeHeader,textHeader,code){
  const table=parseTsv(tableText);const i=table.index??{};
  if(i[codeHeader]==null||i[textHeader]==null)return null;
  const row=table.rows.find(row=>row[i[codeHeader]]===code);return row?row[i[textHeader]]:null;
}

export function validateBlsUnitLaborCostSource({seriesText,measureText,durationText,dataText,seriesId="PRS85006111"}={}){
  const table=parseTsv(seriesText);const i=table.index??{};
  for(const required of ["series_id","measure_code","duration_code"]){
    if(i[required]==null)return {status:"FAIL",reason:"BLS_PR_SERIES_HEADER_MISMATCH",missing:required,seriesId};
  }
  const meta=table.rows.find(row=>row[i.series_id]===seriesId);
  if(!meta)return {status:"FAIL",reason:"BLS_PR_SERIES_MISSING",seriesId};
  const measureCode=meta[i.measure_code],durationCode=meta[i.duration_code];
  const measure=lookupCode(measureText,"measure_code","measure_text",measureCode);
  const duration=lookupCode(durationText,"duration_code","duration_text",durationCode);
  const semanticPass=measureCode==="11"&&durationCode==="1"&&/unit labor costs/i.test(measure??"")&&/% change same quarter 1 year ago/i.test(duration??"");
  if(!semanticPass)return {status:"FAIL",reason:"BLS_PR_ULC_SEMANTIC_MISMATCH",seriesId,measureCode,durationCode,measure,duration};

  const data=parseTsv(dataText);const d=data.index??{};
  for(const required of ["series_id","year","period","value"]){
    if(d[required]==null)return {status:"FAIL",reason:"BLS_PR_DATA_HEADER_MISMATCH",missing:required,seriesId};
  }
  const observations=[];let annualAverageRowsSkipped=0;
  for(const row of data.rows){
    if(row[d.series_id]!==seriesId)continue;
    const period=row[d.period];if(period==="Q05"){annualAverageRowsSkipped++;continue;}
    if(!/^Q0[1-4]$/.test(period))continue;
    const year=Number(row[d.year]),value=Number(row[d.value]);if(!Number.isInteger(year)||!finite(value))continue;
    observations.push({year,quarter:Number(period.slice(-1)),value,revised:d.footnote_codes==null?false:(row[d.footnote_codes]??"").includes("R")});
  }
  observations.sort((a,b)=>a.year-b.year||a.quarter-b.quarter);
  const latest=observations.at(-1)??null;
  return {
    status:latest?"PASS":"FAIL",reason:latest?null:"BLS_PR_ULC_DATA_MISSING",seriesId,
    measureCode,durationCode,measure,duration,transform:"DIRECT_YOY_PERCENT_NO_RECALCULATION",
    observationCount:observations.length,annualAverageRowsSkipped,latest,observations,
  };
}

function addSicSet(target,rows){
  let invalid=0;
  for(const row of rows??[]){const sic=sic4(row?.sic);if(!sic){invalid++;continue;}target.add(sic);}
  return invalid;
}

export function validateApprovedSicNaics3Mapping(document){
  if(document?.status!=="APPROVED"||!Array.isArray(document?.rows))return {status:"PARTIAL",reason:"APPROVED_SIC_NAICS3_MAPPING_REQUIRED",mapping:new Map(),ambiguousSics:new Set(),noNaicsSics:new Set(),version:document?.version??null};
  const mapping=new Map(),ambiguousSics=new Set(),noNaicsSics=new Set(),conflicts=[];let invalid=0;
  for(const row of document.rows){
    const sic=sic4(row?.sic);const naics3=String(row?.naics3??"").replace(/\D/g,"");
    if(!sic||!/^\d{3}$/.test(naics3)||row?.approved!==true){invalid++;continue;}
    const old=mapping.get(sic);if(old&&old!==naics3){conflicts.push({sic,old,naics3});continue;}mapping.set(sic,naics3);
  }
  invalid+=addSicSet(ambiguousSics,document?.ambiguous);
  invalid+=addSicSet(noNaicsSics,document?.noNaics);
  const overlaps=[];
  for(const sic of mapping.keys())if(ambiguousSics.has(sic)||noNaicsSics.has(sic))overlaps.push(sic);
  for(const sic of ambiguousSics)if(noNaicsSics.has(sic))overlaps.push(sic);
  if(conflicts.length)return {status:"FAIL",reason:"SIC_NAICS3_MAPPING_CONFLICT",mapping:new Map(),ambiguousSics:new Set(),noNaicsSics:new Set(),version:document?.version??null,conflicts,invalid};
  if(overlaps.length)return {status:"FAIL",reason:"SIC_NAICS3_CLASS_OVERLAP",mapping:new Map(),ambiguousSics:new Set(),noNaicsSics:new Set(),version:document?.version??null,overlaps:[...new Set(overlaps)].sort(),invalid};
  return {status:mapping.size?"PASS":"PARTIAL",reason:mapping.size?null:"APPROVED_SIC_NAICS3_MAPPING_EMPTY",mapping,ambiguousSics,noNaicsSics,version:document?.version??null,approvedRows:mapping.size,ambiguousRows:ambiguousSics.size,noNaicsRows:noNaicsSics.size,invalid};
}

export function buildS10CostPressureCoverage({issuerRows=[],approvedMapping,inputSeries=[],outputSeries=[]}={}){
  const mapping=approvedMapping?.status==="PASS"?approvedMapping.mapping:new Map();
  const ambiguousSics=approvedMapping?.status==="PASS"?(approvedMapping.ambiguousSics??new Set()):new Set();
  const noNaicsSics=approvedMapping?.status==="PASS"?(approvedMapping.noNaicsSics??new Set()):new Set();
  const input=new Map((inputSeries??[]).filter(row=>/^\d{3}$/.test(String(row?.naics??""))).map(row=>[String(row.naics),row]));
  const output=new Map((outputSeries??[]).filter(row=>/^\d{3}$/.test(String(row?.naics3??""))).map(row=>[String(row.naics3),row]));
  const sectors=new Map();let eligibleRevenue=0,mappedRevenue=0,eligibleIssuers=0,mappedIssuers=0;
  const reasons={NO_SIC:0,NO_APPROVED_NAICS3:0,AMBIGUOUS_NAICS3:0,NO_INPUT_PPI:0,NO_OUTPUT_PPI:0,NO_PRIOR_REVENUE:0};
  const classes={EXACT:0,AMBIGUOUS:0,NO_NAICS:0,NO_PPI:0};
  const classRevenue={EXACT:0,AMBIGUOUS:0,NO_NAICS:0,NO_PPI:0,UNAVAILABLE:0};
  const classify=(issuer,revenue)=>{
    const sic=sic4(issuer?.sic);
    if(!sic){reasons.NO_SIC++;return {className:"NO_NAICS",sic:null,naics3:null,inputRow:null,outputRow:null};}
    if(ambiguousSics.has(sic)){reasons.AMBIGUOUS_NAICS3++;return {className:"AMBIGUOUS",sic,naics3:null,inputRow:null,outputRow:null};}
    const naics3=mapping.get(sic);
    if(!naics3){reasons.NO_APPROVED_NAICS3++;return {className:"NO_NAICS",sic,naics3:null,inputRow:null,outputRow:null};}
    const inputRow=input.get(naics3),outputRow=output.get(naics3);
    const hasInput=finite(inputRow?.annualized3m),hasOutput=finite(outputRow?.annualized3m);
    if(!hasInput||!hasOutput){if(!hasInput)reasons.NO_INPUT_PPI++;if(!hasOutput)reasons.NO_OUTPUT_PPI++;return {className:"NO_PPI",sic,naics3,inputRow,outputRow};}
    return {className:"EXACT",sic,naics3,inputRow,outputRow};
  };
  for(const issuer of issuerRows??[]){
    const revenue=Number(issuer?.priorYear?.revenue);const hasRevenue=finite(revenue)&&revenue>0;
    const classified=classify(issuer,revenue);classes[classified.className]++;
    if(hasRevenue)classRevenue[classified.className]+=revenue;else classRevenue.UNAVAILABLE+=0;
    if(!hasRevenue){reasons.NO_PRIOR_REVENUE++;continue;}
    eligibleRevenue+=revenue;eligibleIssuers++;
    if(classified.className!=="EXACT")continue;
    const pressure=classified.inputRow.annualized3m-classified.outputRow.annualized3m;
    const old=sectors.get(classified.naics3)??{naics3:classified.naics3,priorRevenue:0,issuerCount:0,inputAnnualized3m:classified.inputRow.annualized3m,outputAnnualized3m:classified.outputRow.annualized3m,pressure};
    old.priorRevenue+=revenue;old.issuerCount++;sectors.set(classified.naics3,old);mappedRevenue+=revenue;mappedIssuers++;
  }
  const sectorRows=[...sectors.values()].sort((a,b)=>a.naics3.localeCompare(b.naics3));
  const raw=mappedRevenue>0?sectorRows.reduce((sum,row)=>sum+(row.priorRevenue/mappedRevenue)*row.pressure,0):null;
  const mappingReady=approvedMapping?.status==="PASS";
  const classifiedIssuers=classes.EXACT+classes.AMBIGUOUS+classes.NO_NAICS+classes.NO_PPI;
  return {
    status:mappingReady&&finite(raw)?"PASS":"PARTIAL",
    reason:!mappingReady?(approvedMapping?.reason??"APPROVED_SIC_NAICS3_MAPPING_REQUIRED"):finite(raw)?null:"S10_MAPPED_PPI_PAIR_REQUIRED",
    raw,
    issuerCoverage:eligibleIssuers?mappedIssuers/eligibleIssuers:null,
    revenueCoverage:eligibleRevenue?mappedRevenue/eligibleRevenue:null,
    classification:{classes,total:issuerRows.length,classified:classifiedIssuers,complete:classifiedIssuers===issuerRows.length,classRevenue,policy:"EXACT_AMBIGUOUS_NO_NAICS_NO_PPI"},
    eligibleIssuers,mappedIssuers,eligibleRevenue,mappedRevenue,sectors:sectorRows,reasons,
    weighting:"PRIOR_REVENUE_MAPPED_ONLY",
    formula:"SUM_PRIOR_REVENUE_WEIGHT*(INPUT_3M_ANN-OUTPUT_3M_ANN)",
  };
}
