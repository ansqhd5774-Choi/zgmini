"use client";
import {useStoredIndex} from './use-stored-index';
export type LatestStagflation={status:string;phase:string;score:number;methodologyVersion:string;evaluationMode:string;inputCount:number;inputMonths:Record<string,string>;oldestInputMonth:string;newestInputMonth:string;observedAt:string;calculatedAt:string;history:{observedAt:string;score:number}[]};
export function readyLatestStagflation(p:LatestStagflation|null){return p?.status==='READY'&&p.phase==='PROVISIONAL'&&p.methodologyVersion==='STAGFLATION_LATEST_PUBLISHED_R1'&&p.evaluationMode==='LATEST_PUBLISHED_INPUTS_NOT_COMMON_MONTH_OR_FORECAST'&&typeof p.score==='number'&&Number.isFinite(p.score)&&p.score>=0&&p.score<=100&&p.inputCount===8;}
export default function StagflationLatestSummary(){
 const {payload,error}=useStoredIndex<LatestStagflation>('/api/stagflation-risk-provisional');
 if(error||!payload||!readyLatestStagflation(payload))return null;
 return <a href="/stagflation-risk/" className="zg-earnings-provisional-summary" title={`최신 발표 조합 · 관측 월 ${payload.oldestInputMonth.slice(0,7)}~${payload.newestInputMonth.slice(0,7)}. 같은 월의 완성 점수나 미발표 값의 예측이 아닙니다.`}>잠정 {payload.score.toFixed(1)} <span>· 최신 발표</span></a>;
}
