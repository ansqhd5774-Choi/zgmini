// Shared PC/Worker contract. No provider requests or Node imports.
export const PAID_THEME_KEY='theme-fear-greed-paid-hourly-v1';
export const PAID_THEME_VERSION='ZGMINI_THEME_PAID_HOURLY_V1';
export const PAID_HOURLY_MODE='MARKETPARQUET_PAID_SPLIT_ADJUSTED_1H_NY_PROXY_V1';
const day=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
const score=s=>typeof s==='number'&&Number.isFinite(s)&&s>=0&&s<=100;
const sha=s=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s);
const methods=new Set(['ETF_ONLY_T40_R20_V40_PAIR50','ETF_ONLY_T40_R20_V40_ADAPTIVE_R2_DATED_ISSUER_AUM_R32','ETF_ONLY_T40_R20_V40_ADAPTIVE_R2_AUM_DATE_ELIGIBLE_SINGLE_R32','ADAPTIVE_R2_PAIR_R3']);
export function validPaidThemeRecord(b){
 if(b?.version!==PAID_THEME_VERSION||b.status!=='READY'||b.sourcePriceMode!==PAID_HOURLY_MODE||!sha(b.sourceVersion)||!sha(b.registrySha256)||
  !day(b.observationDate)||b.confirmedObservationDate!==b.observationDate||!day(b.sourceLatestDate)||b.sourceLatestDate<b.observationDate||
  b.phasePolicy?.confirmedLagHours!==48||b.phasePolicy?.provisionalLagHours!==24||b.phasePolicy?.clockBasis!=='ACTUAL_NY_PROXY_BAR_END'||
  !Array.isArray(b.themes)||!b.themes.length||!Array.isArray(b.provisional?.points)||!['PROVISIONAL','CONFIRMED'].includes(b.phase))return false;
 const ids=new Set(),names=new Set();
 for(const t of b.themes){
  if(typeof t.id!=='string'||!/^[a-z][a-z0-9-]*$/.test(t.id)||ids.has(t.id)||typeof t.theme!=='string'||!t.theme||names.has(t.theme)||!methods.has(t.methodologyVersion)||
   t.sourcePriceMode!==PAID_HOURLY_MODE||t.confirmedObservationDate!==b.observationDate||!Array.isArray(t.etfs)||!t.etfs.length||new Set(t.etfs).size!==t.etfs.length||
   !t.etfs.every(s=>typeof s==='string'&&/^[A-Z][A-Z0-9.-]*$/.test(s))||!Array.isArray(t.history)||!t.history.length||t.history.length>252||!score(t.score)||
   t.history.some((p,i)=>!day(p?.date)||!score(p.score)||i>0&&p.date<=t.history[i-1].date)||t.history.at(-1).date!==t.confirmedObservationDate||t.history.at(-1).score!==t.score)return false;
  ids.add(t.id);names.add(t.theme);
 }
 const quality=b.dataQuality;
 if(!Array.isArray(quality?.expectedPublicIds)||new Set(quality.expectedPublicIds).size!==quality.expectedPublicIds.length||
  !quality.expectedPublicIds.every(id=>typeof id==='string')||!Array.isArray(quality.readyPublicIds)||quality.readyPublicIds.length!==ids.size||
  !quality.readyPublicIds.every(id=>ids.has(id)&&quality.expectedPublicIds.includes(id))||!Array.isArray(quality.pendingPublicIds)||
  new Set([...quality.readyPublicIds,...quality.pendingPublicIds]).size!==quality.expectedPublicIds.length||
  !quality.pendingPublicIds.every(id=>quality.expectedPublicIds.includes(id)&&!ids.has(id)))return false;
 let previous=b.observationDate;
 for(const p of b.provisional.points){if(!day(p?.date)||p.date<=previous||p.date>b.sourceLatestDate||!p.scores||typeof p.scores!=='object'||Array.isArray(p.scores)||
  Object.keys(p.scores).length!==names.size||![...names].every(n=>score(p.scores[n])))return false;previous=p.date;}
 return b.phase===(b.provisional.points.length?'PROVISIONAL':'CONFIRMED');
}
