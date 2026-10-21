"use client";
import {CalendarDays, ChevronDown, CircleHelp, Lightbulb, ShieldAlert, TrendingDown} from "lucide-react";
import {useEffect,useState} from "react";
import "./outbreak-beginner-r53.css";

export type RateScorePoint={label:string;value:number};
export type RateStoredSnapshot={status:"READY";score:number;observationDate:string;version:string;sourceStoredAt:number;week:RateScorePoint[];oneMonth:RateScorePoint[]};
export function rateBand(value:number|null):{label:string;className:string;color:string}{
 if(value===null||!Number.isFinite(value))return {label:"자료 없음",className:"missing",color:"#94a3b8"};
 if(value<25)return {label:"매우 부정",className:"very-negative",color:"#ef4444"};
 if(value<40)return {label:"부정",className:"negative",color:"#f59e0b"};
 if(value<60)return {label:"중립",className:"neutral",color:"#94a3b8"};
 if(value<75)return {label:"긍정",className:"positive",color:"#22c55e"};
 return {label:"매우 긍정",className:"very-positive",color:"#10b981"};
}
// The 14-calendar-day window ends on the stored observation date.
// Missing dates remain missing. Never backfill points from the last-known score.
export function stored14DayWindow(rate:RateStoredSnapshot|null){
 if(!rate||!Array.isArray(rate.oneMonth))return null;
 const end=Date.parse(rate.observationDate+"T00:00:00Z");
 if(!Number.isFinite(end))return null;
 const start=end-13*86_400_000;
 const daily=new Map<number,RateScorePoint>();
 for(const row of rate.oneMonth){
  if(!row||typeof row.label!=="string"||!Number.isFinite(row.value)||row.value<0||row.value>100)continue;
  const at=Date.parse(row.label+"T00:00:00Z");
  if(Number.isFinite(at)&&at>=start&&at<=end&&new Date(at).toISOString().slice(0,10)===row.label)daily.set(at,row);
 }
 return {start,end,points:[...daily.entries()].sort((a,b)=>a[0]-b[0]).map(([at,row])=>({at,label:row.label,value:row.value}))};
}
function shortDate(timestamp:number){return new Date(timestamp).toISOString().slice(5,10).replace("-",".");}
function ScoreScale({score}:{score:number|null}){
 const segments=[{label:"매우 부정",key:"very-negative"},{label:"부정",key:"negative"},{label:"중립",key:"neutral"},{label:"긍정",key:"positive"},{label:"매우 긍정",key:"very-positive"}];
 return <div className="ob53-score-scale" role="img" aria-label={score===null?"평가 없음":"0~100점, 현재 "+score.toFixed(1)+"점 · "+rateBand(score).label}>
  <div className="ob53-scale-colors">{segments.map(x=><span key={x.key} data-band={x.key}/>)}
   {score!==null&&<span className="ob53-scale-pointer" style={{left:Math.max(0,Math.min(100,score))+"%"}}/>}
  </div>
  <div className="ob53-scale-labels">{segments.map(x=><span key={x.key}>{x.label}</span>)}</div>
 </div>;
}
function Rate14Chart({rate}:{rate:RateStoredSnapshot|null}){
 const [mobile,setMobile]=useState(false);
 useEffect(()=>{
  const query=window.matchMedia("(max-width: 600px)");
  const update=()=>setMobile(query.matches);
  update();query.addEventListener("change",update);
  return()=>query.removeEventListener("change",update);
 },[]);
 const period=stored14DayWindow(rate);
 const data=window?.points??[];
 const axis=[0,25,50,75,100];
 const chartLeft=mobile?34:42,chartWidth=mobile?296:606,chartRight=chartLeft+chartWidth;
 const x=(at:number)=>chartLeft+(period?(at-period.start)/(13*86_400_000)*chartWidth:0);
 const y=(score:number)=>202-score*1.52;
 const points=data.map(row=>x(row.at).toFixed(2)+","+y(row.value).toFixed(2)).join(" ");
 const ticks=period?(mobile?[0,4,8,13]:[0,2,4,6,8,10,13]).map(day=>period.start+day*86_400_000):[];
 const hasData=data.length>=2;
 return <section className="ob53-chart ob-panel" aria-labelledby="ob53-chart-title">
   <div className="ob53-chart-heading"><h3 id="ob53-chart-title">14일 추이 <CircleHelp size={13} aria-hidden="true"/></h3>
    <span>{rate?"관측 "+data.length+"일 / 14일":"저장 데이터 대기"}</span></div>
   {period&&hasData?<svg className="ob53-trend-svg" viewBox={mobile?"0 0 350 240":"0 0 700 240"} role="img" aria-label={"금리 심리 최근 14일, 저장된 "+data.length+"개 날짜의 관측값만 표시"}>
    <title>금리 심리 최근 14일 저장 점수, 미관측 날짜는 점을 생성하지 않음</title>
    {axis.map(value=><g key={value}>
     <line x1={chartLeft} y1={y(value)} x2={chartRight} y2={y(value)} stroke="#365468" strokeDasharray="3 5"/>
     <text x={chartLeft-10} y={y(value)+4} textAnchor="end" fill="#9db6c8" fontSize="11">{value}</text>
    </g>)}
    <polyline points={points} fill="none" stroke={rateBand(rate?.score??null).color} strokeWidth="3" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round"/>
    {data.map(row=><circle key={row.label} cx={x(row.at)} cy={y(row.value)} r="3.7" fill={rateBand(rate?.score??null).color}><title>{row.label+" · "+row.value.toFixed(1)+"점"}</title></circle>)}
    {ticks.map(t=><text key={t} x={x(t)} y="224" textAnchor="middle" fill="#9db6c8" fontSize="10.5">{shortDate(t)}</text>)}
   </svg>:<div className="ob53-no-trend" role="status">14일 범위에 저장된 점수가 2개 미만입니다. 임의의 그래프를 만들지 않습니다.</div>}
   <p className="ob53-chart-footnote">기준일 포함 최근 14일 · 저장된 날짜만 표시 · 비거래일·미수집일은 추정하지 않음</p>
  </section>;
}
export default function OutbreakBeginnerFed({rate,deltaWeek}:{rate:RateStoredSnapshot|null;deltaWeek:number|null}){
 const score=rate?.score??null;
 const band=rateBand(score);
 const negative=deltaWeek!==null&&deltaWeek<0;
 const positive=deltaWeek!==null&&deltaWeek>0;
 const date=rate?.observationDate??"미확인";
 const description=score===null?"금리 심리 점수를 확인할 수 없습니다.":"현재 금리 관련 시장 심리는 "+band.label+" 구간입니다.";
 const interpretation=score===null?"현재 점수가 없어 방향을 판단하지 않습니다.":score<40?"금리 부담이 커지는 방향의 신호가 상대적으로 우세합니다.":score<60?"금리 부담 완화와 악화 어느 한쪽으로 크게 기울지 않은 구간입니다.":"금리 부담이 완화되는 방향의 신호가 상대적으로 우세합니다.";
 return <article className="ob-detail ob-beginner-detail" aria-labelledby="ob-detail-title">
   <header className="ob53-title"><div><span className="ob-eyebrow">선택한 이벤트 · 통화 정책</span>
     <h2 id="ob-detail-title">금리 심리 <span className="ob53-tone-pill" data-tone={band.className}>{band.label}</span></h2>
     <p>{description}</p></div>
    <span className="ob-stage">금리 심리 · 저장 자료</span>
   </header>
   <div className="ob53-intro-grid">
    <section className="ob53-score-card ob-panel" aria-label="현재 금리 심리">
     <div className="ob53-metric-row">
      <div className="ob53-current"><span>금리 심리 점수</span><strong>{score===null?"—":score.toFixed(1)}<small>점</small></strong></div>
      <div className="ob53-week"><span>주간 변화</span><strong data-change={negative?"down":positive?"up":"flat"}>{deltaWeek===null?"—":(deltaWeek>0?"+":"")+deltaWeek.toFixed(1)}<small>점</small>{negative?<TrendingDown size={15} aria-label="하락"/>:null}</strong></div>
      <div className="ob53-asof"><span>분석 기준일</span><strong><CalendarDays size={15} aria-hidden="true"/>{date}</strong></div>
     </div>
     <ScoreScale score={score}/>
    </section>
    <section className="ob53-explain ob-panel" aria-labelledby="ob53-meaning">
     <h3 id="ob53-meaning"><Lightbulb size={17} aria-hidden="true"/> 이 숫자는 무슨 뜻인가요?</h3>
     <p>점수가 높으면 금리 부담 완화 신호가, 낮으면 부담 확대 신호가 상대적으로 강하다는 뜻입니다.</p>
     <p>{interpretation}</p>
    </section>
   </div>
   <div className="ob53-main-grid">
    <Rate14Chart rate={rate}/>
    <div className="ob53-beginner-stack">
     <section className="ob53-guide ob-panel" aria-labelledby="ob53-beginners">
      <h3 id="ob53-beginners">주식 초보자용 해석</h3>
      <dl>
       <div><dt>지금 상황</dt><dd><strong>{band.label}</strong><span>{description}</span></dd></div>
       <div><dt>시장 영향</dt><dd><strong>관련 금리·채권·주가를 함께 확인</strong><span>심리 점수 하나로 주가 방향을 단정할 수 없습니다.</span></dd></div>
       <div><dt>주의할 점</dt><dd><strong><ShieldAlert size={13} aria-hidden="true"/> 금리 인하 확률이 아닙니다</strong><span>실제 정책 결정 여부는 별도로 확인해야 합니다.</span></dd></div>
      </dl>
     </section>
     <section className="ob53-assets ob-panel" aria-label="관련 자산"><h3>관련 자산</h3><div><span>미국 국채</span><span>달러</span><span>주식</span></div></section>
    </div>
   </div>
   <details className="ob53-details"><summary>분석 질문 · 판정 기준 <ChevronDown aria-hidden="true" size={15}/></summary>
    <div><p>분석 질문: 최근 미국 시장금리 움직임은 얼마나 우호적인가?</p><p>기준: 기존 미국 연준 H.15 국채금리 기반 금리차·RSI·변동성 점수입니다.</p></div>
   </details>
   <details className="ob53-details"><summary>자세한 산식·근거 보기 <ChevronDown aria-hidden="true" size={15}/></summary>
    <div><p>0.50P + 0.20R₂ + 0.20R₁₀ + 0.10V</p><p>P: 2Y−3M 금리차 5일 변화의 완화 백분위 · R: 국채금리 RSI(14) 반전 · V: 10년물 20일 변동성 백분위 반전</p><p>입력: 미국 연준 H.15 DGS2·DGS3MO·DGS10 · R1 시범 산식 · PC 계산 및 저장된 점수 표시</p></div>
   </details>
   <p className="ob53-note">시장금리 기반 심리 점수이며 FedWatch 확률이나 금리 인하 예측값이 아닙니다. 현재 표시되는 점수는 기존 저장 자료를 사용합니다.</p>
  </article>;
}
