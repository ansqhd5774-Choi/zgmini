"use client";
import {LiveScoreValue} from '../components/live-score-value';
import ChartAxisLabels from '../components/chart-axis-labels';
import '../components/chart-axis-labels.css';


import {useStoredIndex} from '../components/use-stored-index';
import {useEffect,useRef,useState} from 'react';
import './outbreak-events.css';
import {OutbreakChange} from './outbreak-change';
import {ContentHelp} from './content-help';
import {HELP,HelpText} from './help-copy';
import {useIranProgress,IranSummaryCard,IranDetail} from './iran-progress';
import {Landmark, Swords, Target, TrendingUp, TrendingDown, Minus} from 'lucide-react';

const events = [
  {id:'fed', category:'통화 정책', title:'금리 심리', question:'최근 미국 시장금리 움직임은 얼마나 우호적인가?', outcome:'기존 H.15 국채금리 기반 RSI·금리차·변동성 점수', signals:['2년물·3개월물 금리차','2년물·10년물 RSI','10년물 금리 변동성'], assets:'미국 국채 · 달러 · 주식'},
  {id:'iran', category:'지정학', title:'이란 전쟁', question:'검증된 현재 증거에서 종전은 얼마나 진전됐는가?', outcome:'이란–이스라엘·이란–미국의 공식 합의와 실제 이행을 독립 검증', signals:['공식 협상','합의 발표','합의 이행'], assets:'유가 · 에너지 · 위험 자산'},
  {id:'ukraine', category:'지정학', title:'러우 전쟁 종전', question:'향후 3개월 안에 종전 합의가 성립할까?', outcome:'휴전과 종전을 구분하고 당사자·이행 기준 확정', signals:['공식 회담','협상 조건','합의 이행'], assets:'유럽 주식 · 에너지 · 곡물'},
];

type RateSentimentPoint={label:string;value:number};
type RateSentimentSnapshot={status:'READY';score:number;observationDate:string;version:string;sourceStoredAt:number;week:RateSentimentPoint[];oneMonth:RateSentimentPoint[]};
function useRateSentiment(){
 const {payload}=useStoredIndex<RateSentimentSnapshot>('/api/rate-sentiment');
 return payload?.status==='READY'&&Number.isFinite(payload.score)&&Array.isArray(payload.week)&&payload.week.length===5&&payload.week.every(point=>Number.isFinite(point.value))?payload:null;
}

function SummaryTitle({title,war}:{title:string;war:boolean}){
  const ref=useRef<HTMLHeadingElement>(null);
  const [size,setSize]=useState(11);
  useEffect(()=>{
    const heading=ref.current;
    if(!heading)return;
    const measure=()=>{
      const text=heading.querySelector('span');
      if(!text)return;
      const style=getComputedStyle(heading);
      const available=heading.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight)-16;
      const natural=text.getBoundingClientRect().width/parseFloat(style.fontSize)*11;
      if(natural>0)setSize(Math.min(11,11*available/natural));
    };
    const observer=new ResizeObserver(measure);
    observer.observe(heading);
    measure();
    document.fonts.ready.then(measure);
    return()=>observer.disconnect();
  },[title]);
  return <h3 className="ob-fit-title" ref={ref} style={{fontSize:size}}>{war?<Swords aria-hidden="true"/>:<Landmark aria-hidden="true"/>}<span style={{fontSize:'inherit',display:'inline-block'}}>{title}</span></h3>;
}

export function OutbreakSummary({onOpen}:{onOpen:(id:string)=>void}){
 const rate=useRateSentiment();
 const iran=useIranProgress();
 const [preview,setPreview]=useState(false);
 useEffect(()=>{setPreview(['localhost','127.0.0.1'].includes(location.hostname)&&new URLSearchParams(location.search).get('visual-fixture')==='1');},[]);
 const samples=[[24,28,26,34,31,39,44,40,48,51,47,55],[63,60,64,56,50,54,48,43,47,39,42,36],[18,22,20,27,24,31,29,35,39,34,46,46]];
 return <section className="ob-summary" aria-labelledby="ob-summary-title"><header><h2 id="ob-summary-title"><Target aria-hidden="true"/>아웃브레이크<ContentHelp label="아웃브레이크 도움말"><HelpText copy={HELP.outbreak}/></ContentHelp><span className="ob-period">최근 14일</span></h2><span className="ob-development">개발중</span></header><div className="ob-summary-track">{events.map((event,index)=>{
  if(event.id==='iran')return <IranSummaryCard key={event.id} view={iran} onOpen={()=>onOpen(event.id)}/>;
  const fed=event.id==='fed',visible=fed?!!rate:preview;
  const cutoff=rate?Date.parse(rate.observationDate+'T00:00:00Z')-13*86400000:null;
  const rows=rate&&cutoff!==null?(rate.oneMonth??[]).filter(row=>{const at=Date.parse(row.label+'T00:00:00Z');return Number.isFinite(row.value)&&at>=cutoff&&at<=Date.parse(rate.observationDate+'T00:00:00Z');}):[];
  const values=fed?rows.map(row=>row.value):samples[index];
  const last=visible&&values.length?values[values.length-1]:null;
  const previous=visible&&values.length>1?values[values.length-2]:null;
  const delta=last!==null&&previous!==null?last-previous:null;
  const color=last===null?'#94a3b8':last<25?'#ef4444':last<40?'#f59e0b':last<60?'#94a3b8':last<75?'#22c55e':'#10b981';
  const points=values.map((value,i)=>`${26+(values.length>1?132*i/(values.length-1):0)},${54-value*.44}`).join(' ');
  return <div className="ob-help-card" key={event.id}><ContentHelp label={`${event.title} 도움말`}><HelpText copy={HELP[event.id]}/></ContentHelp><button type="button" className="ob-summary-card" aria-label={fed?`${event.title} 상세 보기 · ${rate?'저장 데이터':'데이터 대기'}`:`${event.title} 상세 보기 · 시안용 예시 차트`} onClick={()=>onOpen(event.id)}><SummaryTitle title={event.title} war={!fed}/><div className="ob-summary-value"><LiveScoreValue value={last} style={{color:visible?color:'#94a3b8'}}>{last!==null?(fed?<>{last.toFixed(1).split('.')[0]}<small className="ob-score-fraction">.{last.toFixed(1).split('.')[1]}</small></>:last):'—'}{!fed&&<small>%</small>}</LiveScoreValue><OutbreakChange series={fed?"rate":event.id} current={last} previous={previous} comparison={fed?'직전 거래일':'전일'}/></div><div className="ob-summary-chart ob-summary-chart-frame"><ChartAxisLabels dates/><svg viewBox="0 0 170 68" preserveAspectRatio="none" role="img" aria-label={fed?'금리 심리 최근 14일 저장 점수 추이':`${event.title} 확률 추이 예시 · 실제 분석값 아님`}><defs><linearGradient id={`ob-fill-${event.id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity=".25"/><stop offset="100%" stopColor={color} stopOpacity="0"/></linearGradient></defs>{[0,50,100].map(value=><g key={value}><text x="20" y={57-value*.44} textAnchor="end" fill="#96aabd" fontSize="9">{value}</text><line x1="26" x2="158" y1={54-value*.44} y2={54-value*.44} stroke="currentColor" strokeDasharray="2 4"/></g>)}{visible&&values.length>1&&last!==null&&<><polygon points={`26,54 ${points} 158,54`} fill={`url(#ob-fill-${event.id})`}/><polyline points={points} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round"/></>}<text x="26" y="66" fill="#96aabd" fontSize="9">0</text><text x="158" y="66" textAnchor="end" fill="#96aabd" fontSize="9">14</text></svg>{visible&&values.length>1&&last!==null&&<span aria-hidden="true" className="ob-chart-endpoint" style={{left:`${158/170*100}%`,top:`${(54-last*.44)/68*100}%`,background:color}}/>}</div></button></div>;
 })}</div></section>;
}

export default function OutbreakEvents({initialEvent='fed'}:{initialEvent?:string}){
  const [selected,setSelected]=useState(initialEvent);
  const event=events.find(item=>item.id===selected)!;
  const rate=useRateSentiment();
  const iran=useIranProgress();
  const fed=event.id==='fed';
  const deltaWeek=rate&&rate.week.length>1?rate.week.at(-1)!.value-rate.week[0].value:null;
  return <section className="ob-events" aria-labelledby="ob-title">
    <header className="ob-heading"><div><span className="ob-eyebrow">EVENT OUTLOOK</span><h1 id="ob-title">아웃브레이크</h1><p>큰 이벤트의 가능성과 시장의 기대를 함께 관찰합니다.</p></div><span className="ob-stage">{rate?"금리 심리 · 저장 자료":"금리 심리 데이터 대기"}</span></header>
    <div className="ob-cards">{events.map(item=><button type="button" key={item.id} className="ob-card" aria-pressed={selected===item.id} onClick={()=>setSelected(item.id)}><span className="ob-category">{item.category}</span><h2>{item.title}</h2><p>{item.question}</p><div className="ob-probability"><strong>{item.id==="fed"&&rate?rate.score.toFixed(1):item.id==="iran"&&iran.score!==null?iran.score.toFixed(1):"—"}<small>{item.id==="ukraine"?"%":"점"}</small></strong><span>{item.id==="fed"?(rate?"금리 심리 점수":"저장 점수 대기"):item.id==="iran"?iran.message:"확률 산출 전"}</span></div><div className="ob-card-footer"><span>주간 변화 <b>{item.id==="fed"&&deltaWeek!==null?`${deltaWeek>=0?"+":""}${deltaWeek.toFixed(1)}점`:"—"}</b></span><span>분석 보기 ↗</span></div></button>)}</div>
    {event.id==='iran'?<IranDetail view={iran}/>:<article className="ob-detail" aria-labelledby="ob-detail-title"><header><div><span className="ob-eyebrow">선택한 이벤트</span><h2 id="ob-detail-title">{event.title}</h2></div><span className="ob-stage">기간·판정 기준 초안</span></header>
      <div className="ob-definition"><div><span>분석 질문</span><p>{event.question}</p></div><div><span>발생 판정 기준</span><p>{event.outcome}</p></div></div>
      <div className="ob-detail-grid"><section className="ob-panel"><h3>{fed?"금리 심리 추이":"확률 추이"}</h3><div className="ob-chart-empty">{fed&&rate?<svg viewBox="0 0 300 150" className="ob-live-rate-chart" role="img" aria-label="금리 심리 최근 5거래일 점수">{[0,50,100].map(v=><g key={v}><line x1="20" x2="280" y1={120-v} y2={120-v} stroke="#355469" strokeDasharray="2 4"/><text x="2" y={124-v} fontSize="9" fill="#96aabd">{v}</text></g>)}<polyline fill="none" stroke="#22c55e" strokeWidth="2.5" points={rate.week.map((row,i)=>`${20+i*65},${120-row.value}`).join(" ")}/>{rate.week.map((row,i)=><circle key={row.label} cx={20+i*65} cy={120-row.value} r="3" fill="#22c55e"/>)}<text x="20" y="142" fill="#96aabd" fontSize="9">{rate.week[0].label.slice(5)}</text><text x="280" y="142" textAnchor="end" fill="#96aabd" fontSize="9">{rate.week.at(-1)!.label.slice(5)}</text></svg>:<><div className="ob-chart-grid" aria-hidden="true"/><p>{fed?"금리 심리 점수 연결 대기":"확률 이력이 연결되면 추이를 표시합니다."}</p><span>{fed?"PC 저장 H.15 데이터 기준":"발표·협상 등 주요 사건을 함께 표시할 공간"}</span></>}</div><div className="ob-metrics"><div><span>{fed?"금리 심리":"현재 확률"}</span><strong>{fed&&rate?rate.score.toFixed(1):"—"} {fed?"점":"%"}</strong></div><div><span>{fed?"주간 변화":"이전 대비"}</span><strong>{fed&&deltaWeek!==null?`${deltaWeek>=0?"+":""}${deltaWeek.toFixed(1)}`:"—"} {fed?"점":"%p"}</strong></div><div><span>분석 기준일</span><strong>{fed?rate?.observationDate??"미등록":"미등록"}</strong></div></div></section>
      <section className="ob-panel"><h3>투자 심리와 시장 반응</h3><p className="ob-muted">이벤트 기대 변화와 자산 움직임을 함께 비교할 영역입니다.</p><div className="ob-market-empty">{fed?"국채금리 방향·변동성 기반 심리 점수이며 금리 결정 확률은 아닙니다.":"시장 반응 데이터 연결 전"}</div><dl className="ob-facts"><div><dt>관찰 자산</dt><dd>{event.assets}</dd></div><div><dt>다음 관찰 신호</dt><dd>{event.signals.join(' · ')}</dd></div><div><dt>{fed?"점수 출처":"확률 출처"}</dt><dd>{fed?"미국 연준 H.15 저장자료":"미등록"}</dd></div></dl></section></div>
      <section className="ob-formula"><header><div><span className="ob-eyebrow">METHODOLOGY</span><h3>{fed?"금리 심리 산식과 산출 근거":"확률 산식과 산출 근거"}</h3></div><span className="ob-stage">{fed?"금리 심리 R1":"산식 미연결"}</span></header><div className="ob-formula-space">{fed?<><strong>0.50P + 0.20R₂ + 0.20R₁₀ + 0.10V</strong><p>P: 2Y−3M 금리차 5일 변화의 완화 백분위 · R: 국채금리 RSI(14) 반전 · V: 10년물 20일 변동성 백분위 반전</p></>:"산식 표시 영역"}{!fed&&<p>승인된 계산식 · 변수 정의 · 가중치 · 계산 예시</p>}</div><div className="ob-formula-fields">{['입력 데이터와 출처','산출 방법과 가중치','모델 버전·검증 결과','갱신 주기와 결측 처리'].map((label,i)=><div key={label}><span>{label}</span><p>{fed?['H.15 DGS2·DGS3MO·DGS10','금리차 50 · 2Y RSI 20 · 10Y RSI 20 · 변동성 10','R1 · 기존 저장 자료 기반 시범 산식','PC 계산·D1 저장 · 결측/지연 시 미표시'][i]:'등록 예정'}</p></div>)}</div></section>
      <p className="ob-note">{fed?"시장 금리 심리 점수는 FedWatch 확률이 아니며, 과거 금리 자료의 현행 수정본을 사용합니다.":"현재는 화면 구성만 제공합니다. 실제 확률·시장 반응·산식은 연결되지 않았습니다."}</p>
    </article>}
  </section>;
}
