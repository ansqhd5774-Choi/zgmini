"use client";
import {useStoredIndex} from './use-stored-index';
type Payload={status:string;phase:string;score:number;quarterEnd:string;observedAt:string;universeCount:number;history:{observedAt:string;score:number;observed:{epsGrowth:number};coverage:{epsGrowth:number}}[]};
export default function EarningsProvisionalSummary(){
 const {payload,error}=useStoredIndex<Payload>('/api/earnings-risk-provisional');
 const latest=payload?.history?.at(-1);
 if(error||payload?.status!=='READY'||payload.phase!=='PROVISIONAL'||!Number.isFinite(payload.score)||payload.score<0||payload.score>100
  ||!latest||latest.score!==payload.score||latest.observedAt!==payload.observedAt||!Number.isFinite(latest.coverage?.epsGrowth))return null;
 return <a href="/earnings-recession/" className="zg-earnings-provisional-summary"
  title={`결산 ${payload.quarterEnd} · ${payload.observedAt} · EPS ${latest.observed.epsGrowth}/${payload.universeCount}개. 초기 표본 점수이며 확정 점수와 구분됩니다.`}>
  잠정 {payload.score.toFixed(1)} <span>· EPS {(latest.coverage.epsGrowth*100).toFixed(1)}%</span>
 </a>;
}
