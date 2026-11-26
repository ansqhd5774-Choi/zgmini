// Shared Worker/PC validation; no Node imports or runtime side effects.
export const CONFIGURED_R32='ETF_ONLY_T40_R20_V40_ADAPTIVE_R2_DATED_ISSUER_AUM_R32';
export const CONFIGURED_V2='ZGMINI_CONFIGURED_THEME_PUBLIC_V2';
export const CONFIGURED_PROVISIONAL_MODE='PROVISIONAL_UNAVAILABLE_PROVIDER_REMOVED';
export function validConfiguredProvisional(){return false;}
export const isDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
export function validR32History(record){
 if(!Array.isArray(record.history)||!record.history.length||record.history.length>252||
  !Array.isArray(record.etfs)||!record.etfs.length||new Set(record.etfs).size!==record.etfs.length)return false;
 let previous='';
 for(const p of record.history){
  if(!p||Object.keys(p).some(k=>!['date','score','mode','contributingETFs','weightsPercent','issuerAumAsOf','datedOfficialAumUsed','excluded'].includes(k)))return false;
  if(!isDate(p.date)||p.date<=previous||typeof p.mode!=='string'||!Array.isArray(p.contributingETFs)||new Set(p.contributingETFs).size!==p.contributingETFs.length||
   p.contributingETFs.some(s=>!record.etfs.includes(s))||!Array.isArray(p.excluded)||p.excluded.some(r=>!r||typeof r!=='object'||Array.isArray(r)||
    Object.keys(r).length!==2||!record.etfs.includes(r.ticker)||typeof r.reason!=='string'))return false;
  previous=p.date;
  if(p.score===null){if(p.mode!=='NO_REAL_SCORED_ETF'||p.contributingETFs.length||p.weightsPercent!==null) return false;continue;}
  if(typeof p.score!=='number'||!Number.isFinite(p.score)||p.score<0||p.score>100||!p.contributingETFs.length||!p.weightsPercent||!p.issuerAumAsOf)return false;
  const keys=Object.keys(p.weightsPercent);
  if(keys.length!==p.contributingETFs.length||keys.some(s=>!p.contributingETFs.includes(s)||
   !Number.isFinite(p.weightsPercent[s])||p.weightsPercent[s]<=0||p.weightsPercent[s]>100||
   !isDate(p.issuerAumAsOf[s])||p.issuerAumAsOf[s]>record.observationDate))return false;
  if(Math.abs(Object.values(p.weightsPercent).reduce((a,b)=>a+b,0)-100)>keys.length*0.000001)return false;
 }
 return previous===record.observationDate&&record.history.at(-1).score===record.score;
}
