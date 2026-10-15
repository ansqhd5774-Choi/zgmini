import {completeLegacyFiveRawR3,SECTOR_FEAR_GREED_R3_REFERENCE_OBSERVATIONS,SECTOR_FEAR_GREED_R3_VERSION} from './sector-fear-greed-r3-five-axis-complete.mjs';

export const SECTOR_FEAR_GREED_R3_PUBLIC_VERSION='SECTOR-FEAR-GREED-R3-PUBLIC-V1';
export const SECTOR_FEAR_GREED_R3_EXPECTED_SOURCE_STATUS='SHADOW_R21332_FULL_252_HISTORICAL_VALIDATION_COMPLETE';
export const SECTOR_FEAR_GREED_R3_REQUIRED_HISTORY=252;
export const SECTOR_FEAR_GREED_R3_SECTORS=Object.freeze([
 {id:'technology',name:'정보기술'},
 {id:'communication',name:'커뮤니케이션'},
 {id:'discretionary',name:'임의소비재'},
 {id:'industrials',name:'산업재'},
 {id:'financials',name:'금융'},
 {id:'utilities',name:'유틸리티'},
 {id:'healthcare',name:'헬스케어'},
 {id:'materials',name:'소재'},
 {id:'energy',name:'에너지'},
 {id:'staples',name:'필수소비재'},
 {id:'realEstate',name:'부동산'},
]);

const finite=x=>typeof x==='number'&&Number.isFinite(x);
const validDate=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&Number.isFinite(Date.parse(`${x}T00:00:00Z`));
const round=x=>Math.round(x*10000)/10000;

function normalizeFiveRaw(rows,sectorId){
 if(!Array.isArray(rows)||rows.length!==SECTOR_FEAR_GREED_R3_REQUIRED_HISTORY)throw Error(`SECTOR_FEAR_GREED_R3_HISTORY_COUNT:${sectorId}:${Array.isArray(rows)?rows.length:'NA'}`);
 const out=[];
 for(const row of rows){
  const date=String(row?.date??'').slice(0,10),score=Number(row?.score);
  if(!validDate(date)||!finite(score)||score<0||score>85+Number.EPSILON*85)throw Error(`SECTOR_FEAR_GREED_R3_INVALID_HISTORY:${sectorId}:${date||'NA'}`);
  out.push({date,score});
 }
 out.sort((a,b)=>a.date.localeCompare(b.date));
 if(new Set(out.map(x=>x.date)).size!==out.length)throw Error(`SECTOR_FEAR_GREED_R3_DUPLICATE_DATE:${sectorId}`);
 return out;
}

export function buildSectorFearGreedR3Public(source,{now=Date.now()}={}){
 if(source?.status!==SECTOR_FEAR_GREED_R3_EXPECTED_SOURCE_STATUS)throw Error('SECTOR_FEAR_GREED_R3_SOURCE_NOT_VALIDATED');
 if(source?.approvedR1ReferenceRequirement!==SECTOR_FEAR_GREED_R3_REFERENCE_OBSERVATIONS)throw Error('SECTOR_FEAR_GREED_R3_REFERENCE_MISMATCH');
 if(source?.summary?.allReady252!==true)throw Error('SECTOR_FEAR_GREED_R3_SOURCE_NOT_252_READY');
 const series={};
 for(const meta of SECTOR_FEAR_GREED_R3_SECTORS){
  const sector=source?.sectors?.[meta.id];
  series[meta.id]=normalizeFiveRaw(sector?.fiveRaw,meta.id);
 }
 const dates=series[SECTOR_FEAR_GREED_R3_SECTORS[0].id].map(x=>x.date);
 for(const meta of SECTOR_FEAR_GREED_R3_SECTORS){
  const actual=series[meta.id].map(x=>x.date);
  if(actual.length!==dates.length||actual.some((date,index)=>date!==dates[index]))throw Error(`SECTOR_FEAR_GREED_R3_DATE_ALIGNMENT:${meta.id}`);
 }
 const history=dates.map((date,index)=>{
  const row={date};
  for(const meta of SECTOR_FEAR_GREED_R3_SECTORS)row[meta.id]=round(completeLegacyFiveRawR3(series[meta.id][index].score));
  return row;
 });
 const observationDate=dates.at(-1);
 const current=history.at(-1);
 const sectors=SECTOR_FEAR_GREED_R3_SECTORS.map(meta=>({id:meta.id,name:meta.name,score:current[meta.id]}));
 const updatedAt=new Date(now).toISOString();
 return {
  version:SECTOR_FEAR_GREED_R3_PUBLIC_VERSION,
  status:'READY',
  updatedAt,
  observationDate,
  methodologyVersion:SECTOR_FEAR_GREED_R3_VERSION,
  referenceObservations:SECTOR_FEAR_GREED_R3_REFERENCE_OBSERVATIONS,
  sourceVersion:String(source.version??'R2.13.32'),
  sourceGeneratedAt:typeof source.generatedAt==='string'?source.generatedAt:null,
  sectors,
  history,
 };
}
