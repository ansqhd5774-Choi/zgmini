"use client";
import {useStoredIndex} from '../../components/use-stored-index';
import {readyLatestStagflation,type LatestStagflation} from '../../components/stagflation-latest-summary';
import {MarketFearGreedChart} from '../market-fear-greed-chart';
const labels:Record<string,string>={PCEPI:'PCE 물가',PCEPILFE:'근원 PCE',INDPRO:'산업생산',DPCERA3M086SBEA:'실질소비',DSPIC96:'실질소득',PAYEMS:'비농업고용',EXPINF5YR:'기대인플레이션',MCOILWTICO:'WTI 유가'};
const time=(s:string)=>new Date(s).toLocaleString('ko-KR',{timeZone:'Asia/Seoul',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'});
export default function StagflationLatestPanel(){
 const {payload,error}=useStoredIndex<LatestStagflation>('/api/stagflation-risk-provisional');
 if(error||!payload||!readyLatestStagflation(payload))return null;
 const points=payload.history.map(p=>({date:p.observedAt,score:p.score}));
 const ticks=points.filter((_,i)=>i%Math.max(1,Math.ceil(points.length/5))===0||i===points.length-1).map(p=>p.date);
 return <section className="inflation-explainer stagflation-latest" data-testid="stagflation-latest-provisional">
  <div className="stagflation-latest-heading"><div><p className="cnn-eyebrow">LATEST PUBLISHED INPUTS</p><h2>최신 발표 조합 · 잠정 평가</h2></div><strong>{payload.score.toFixed(1)}<small>점 · 잠정</small></strong></div>
  <p>산업생산·고용 등 먼저 발표된 정보를 반영합니다. <b>높을수록 고물가·둔화의 동시 위험이 낮은 방향</b>입니다.</p>
  <p className="stagflation-latest-meta">관측 월 {payload.oldestInputMonth.slice(0,7)}~{payload.newestInputMonth.slice(0,7)} · 8종 반영 · 점수 관측 {time(payload.observedAt)} KST</p>
  {points.length>=2?<div className="stagflation-latest-chart"><MarketFearGreedChart data={points} axisTicks={ticks} axisLabels={new Map(ticks.map(t=>[t,time(t)]))} latestPoint={points.at(-1)??null} color="#fbbf24" dashed showExtrema={false} formatTooltipLabel={time} instanceKey="stagflation-latest-provisional" gradientId="stagflation-latest-provisional-fill"/></div>:<p className="stagflation-latest-meta">첫 실제 관측을 저장했습니다. 새 발표로 점수가 바뀌면 변화선을 표시합니다.</p>}
  <details><summary>원자료별 관측 월 확인</summary><ul>{Object.entries(payload.inputMonths).map(([id,month])=><li key={id}><span>{labels[id]??id}</span><b>{month.slice(0,7)}</b></li>)}</ul></details>
  <p className="stagflation-latest-note">원자료의 관측 월이 서로 다른 잠정 조합입니다. 특정 월의 완성 점수나 미발표 값의 예측이 아닙니다. 위 월별 확정 평가·1년 이력과 구분해 읽으세요.</p>
 </section>;
}
