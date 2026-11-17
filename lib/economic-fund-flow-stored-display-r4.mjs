// W06 #57: presentation-only validation of the stored SEC registered-fund R54.
// The four SEC percentages are monthly observations, not retrieval timestamps.
import {FUND_FLOW_R54_WEIGHTS} from './diagnostic-layer/open-resolution-r53-components.mjs';

const METHOD='FUND_FLOW_R54_1';
const FACTORS=Object.freeze([
 Object.freeze({id:'fund-flow-54-1',name:'전체 등록펀드 순유입',weight:FUND_FLOW_R54_WEIGHTS.allNet,source:'SEC Registered Fund Statistics / Section.3_Flows_Table.3.2 / All - Net'}),
 Object.freeze({id:'fund-flow-54-2',name:'순유입 모멘텀',weight:FUND_FLOW_R54_WEIGHTS.momentum,source:'SEC Registered Fund Statistics / Section.3_Flows_Table.3.2 / All - Net MoM'}),
 Object.freeze({id:'fund-flow-54-3',name:'인덱스·비인덱스 동반 유입',weight:FUND_FLOW_R54_WEIGHTS.participation,source:'SEC Registered Fund Statistics / Section.3_Flows_Table.3.2 / Index - Net + Non-Index - Net'}),
 Object.freeze({id:'fund-flow-54-4',name:'환매 압력',weight:FUND_FLOW_R54_WEIGHTS.redemption,source:'SEC Registered Fund Statistics / Section.3_Flows_Table.3.2 / All - Outflow'}),
]);
const validScore=value=>typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=100;
const validDate=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&
 Number.isFinite(Date.parse(value+'T00:00:00Z'))&&
 new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
const monthDay=value=>validDate(value)&&value.endsWith('-01');
const close=(a,b)=>Math.abs(a-b)<=1e-6;

/** @param {any} domain @param {string|null|undefined} snapshotDate */
export function economicFundFlowSourceDate(domain,snapshotDate){
 if(domain?.id!=='fundFlows'||domain.methodologyVersion!==METHOD||!validDate(snapshotDate))return null;
 const observation=domain.observationDate??domain.updatedAt;
 // Previous published composites lacked observationDate but explicitly
 // used updatedAt=the score's SEC observation month (never retrieval time).
 if(!monthDay(observation)||observation>snapshotDate)return null;
 if(domain.observationDate!=null&&domain.updatedAt!=null&&domain.observationDate!==domain.updatedAt)return null;
 return observation;
}

/** @param {any} domain @param {string|null|undefined} snapshotDate */
export function verifiedEconomicFundFlowScore(domain,snapshotDate){
 if(domain?.status!=='READY'||!validScore(domain.score)
   ||!Array.isArray(domain.missingFactors)||domain.missingFactors.length!==0)return null;
 const period=economicFundFlowSourceDate(domain,snapshotDate);
 if(!period||!Array.isArray(domain.indicators)||domain.indicators.length!==FACTORS.length)return null;
 const rows=new Map(domain.indicators.map(row=>[row?.id,row]));
 if(rows.size!==FACTORS.length)return null;
 let weighted=0;
 for(const factor of FACTORS){
  const row=rows.get(factor.id);
  if(row?.status!=='READY'||row?.name!==factor.name||row?.source!==factor.source
   ||row?.observationDate!==period||!validScore(row.score))return null;
  weighted+=factor.weight*row.score;
 }
 return close(weighted,domain.score)?domain.score:null;
}

/** @param {any} domain @param {string|null|undefined} snapshotDate @param {number|null|undefined} headline */
export function verifiedEconomicFundFlowChart(domain,snapshotDate,headline){
 if(!validScore(headline)||verifiedEconomicFundFlowScore(domain,snapshotDate)!==headline)return [];
 const period=economicFundFlowSourceDate(domain,snapshotDate);
 const earliest=new Date(period+'T00:00:00Z');
 earliest.setUTCFullYear(earliest.getUTCFullYear()-1);
 const since=earliest.toISOString().slice(0,10);
 const points=new Map(),conflicts=new Set();
 for(const row of Array.isArray(domain.trend)?domain.trend:[]){
  const date=row?.date??row?.label??null;
  if(!monthDay(date)||date<since||date>period)continue;
  if(row?.status&&row.status!=='READY'&&row.status!=='PARTIAL')continue;
  const raw=row?.score===null?null:row?.score??row?.value;
  const score=row?.status==='PARTIAL'||raw===null?null:validScore(raw)?raw:null;
  if(points.has(date)&&points.get(date)!==score)conflicts.add(date);
  points.set(date,score);
 }
 if(conflicts.size)return [];
 const chart=[...points].sort(([a],[b])=>a.localeCompare(b)).map(([date,score])=>({date,score}));
 const last=chart.at(-1);
 if(last?.date===period&&(!validScore(last.score)||!close(last.score,headline)))return [];
 return chart;
}

/** @param {any[]} chart @param {any} domain @param {string|null|undefined} snapshotDate @param {number|null|undefined} headline */
export function isEconomicFundFlowChartCurrent(chart,domain,snapshotDate,headline){
 if(!validScore(headline)||verifiedEconomicFundFlowScore(domain,snapshotDate)!==headline)return false;
 const period=economicFundFlowSourceDate(domain,snapshotDate),last=Array.isArray(chart)?chart.at(-1):null;
 return Boolean(last?.date===period&&validScore(last?.score)&&close(last.score,headline));
}
