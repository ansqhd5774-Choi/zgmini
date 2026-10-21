import {STAGFLATION_LATEST_VERSION,STAGFLATION_LATEST_MODE} from './stagflation-latest-provisional.mjs';
import {STAGFLATION_S21_SERIES} from './stagflation-s21.mjs';
export const STAGFLATION_LATEST_KEY='detail:stagflation-risk:latest-published-r1';
const score=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=100;
const month=x=>typeof x==='string'&&/^\d{4}-(0[1-9]|1[0-2])-01$/.test(x);
const time=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))&&new Date(x).toISOString()===x;
export function validLatestStagflation(r){
 if(r?.publicationAuthorized!==true||r.status!=='READY'||r.phase!=='PROVISIONAL'||r.methodologyVersion!==STAGFLATION_LATEST_VERSION||r.evaluationMode!==STAGFLATION_LATEST_MODE||r.historyPolicy!=='ACTUAL_CALCULATION_OBSERVATIONS_ONLY'||!score(r.score)||r.inputCount!==8)return false;
 if(!time(r.sourceStoredAt)||!time(r.calculatedAt)||Date.parse(r.sourceStoredAt)>Date.parse(r.calculatedAt)||typeof r.inputSignature!=='string'||!/^[a-f0-9]{64}$/.test(r.inputSignature))return false;
 if(Object.keys(r.inputMonths??{}).length!==8||STAGFLATION_S21_SERIES.some(id=>!month(r.inputMonths[id])||r.inputMonths[id]>r.calculatedAt.slice(0,10)))return false;
 const months=Object.values(r.inputMonths).sort();
 const [year,mon]=r.calculatedAt.slice(0,7).split('-').map(Number);
 if(months[0]<new Date(Date.UTC(year,mon-4,1)).toISOString().slice(0,10))return false;
 if(r.oldestInputMonth!==months[0]||r.newestInputMonth!==months.at(-1)||!month(r.confirmedObservationMonth)||r.confirmedObservationMonth!==months[0]||r.newestInputMonth<=r.confirmedObservationMonth)return false;
 if(!['inflation','realEconomy','labor','expectationsEnergy','slowdown'].every(k=>score(r.axes?.[k])))return false;
 if(!Array.isArray(r.jointRisks)||r.jointRisks.length!==3||!r.jointRisks.every(score))return false;
 const D=.65*r.axes.realEconomy+.35*r.axes.labor;
 const J=Math.min(100,Math.sqrt(r.axes.inflation*D)*(1+r.axes.expectationsEnergy/1000));
 if(Math.abs(D-r.axes.slowdown)>1e-8||Math.abs(J-r.jointRisks[2])>1e-8||Math.abs(r.score-(100-(13*r.jointRisks[2]+r.jointRisks[1]+r.jointRisks[0])/15))>1e-8)return false;
 if(!Array.isArray(r.history)||r.history.length<1||r.history.length>370)return false;
 return r.history.every((p,i)=>score(p.score)&&time(p.observedAt)&&Date.parse(p.observedAt)<=Date.parse(r.calculatedAt)&&(!i||Date.parse(p.observedAt)>Date.parse(r.history[i-1].observedAt)))&&r.history.at(-1).score===r.score;
}
