"use client";

import {useEffect,useRef,useState} from 'react';
import './outbreak-events.css';
import {Landmark, Swords, Target} from 'lucide-react';

const events = [
  {id:'fed', category:'통화 정책', title:'연준 금리 정책', question:'다음 FOMC 회의에서 기준금리를 인상할까?', outcome:'다음 회의의 목표금리 상단이 직전 회의보다 상승', signals:['물가 발표','고용 지표','연준 공식 발언'], assets:'미국 국채 · 달러 · 주식'},
  {id:'iran', category:'지정학', title:'이란 전쟁 종전', question:'향후 3개월 안에 종전 합의가 성립할까?', outcome:'당사자·합의 범위·이행 기준을 확정한 뒤 분석 시작', signals:['공식 협상','합의 발표','합의 이행'], assets:'유가 · 에너지 · 위험 자산'},
  {id:'ukraine', category:'지정학', title:'러우 전쟁 종전', question:'향후 3개월 안에 종전 합의가 성립할까?', outcome:'휴전과 종전을 구분하고 당사자·이행 기준 확정', signals:['공식 회담','협상 조건','합의 이행'], assets:'유럽 주식 · 에너지 · 곡물'},
];

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
  const [preview,setPreview]=useState(false);
  useEffect(()=>{setPreview(['localhost','127.0.0.1'].includes(location.hostname)&&new URLSearchParams(location.search).get('visual-fixture')==='1');},[]);
  const samples=[[24,28,26,34,31,39,44,40,48,51,47,55],[63,60,64,56,50,54,48,43,47,39,42,36],[18,22,20,27,24,31,29,35,39,34,46,46]];
  return <section className="ob-summary" aria-labelledby="ob-summary-title"><header><h2 id="ob-summary-title"><Target aria-hidden="true"/>아웃브레이크</h2><span className="ob-development">개발중</span></header><div className="ob-summary-track">{events.map((event,index)=>{const values=samples[index],last=values[values.length-1],delta=last-values[values.length-2],color=last<25?'#ef4444':last<40?'#f59e0b':last<60?'#94a3b8':last<75?'#22c55e':'#10b981';const points=values.map((value,i)=>`${26+i*12},${100-value*.8}`).join(' ');return <button type="button" className="ob-summary-card" key={event.id} aria-label={`${event.title} 상세 보기 · 시안용 예시 차트`} onClick={()=>onOpen(event.id)}><SummaryTitle title={event.title} war={event.id!=='fed'}/><div className="ob-summary-value"><strong style={{color:preview?color:'#94a3b8'}}>{preview?last:'—'}<small>%</small></strong>{preview&&<span className={`ob-direction ob-direction-${delta>0?'up':delta<0?'down':'flat'}`} role="img" aria-label={delta>0?'상승':delta<0?'하락':'횡보'}>{delta>0?'▲':delta<0?'▼':''}</span>}</div><svg className="ob-summary-chart" viewBox="0 0 170 124" preserveAspectRatio="none" role="img" aria-label={`${event.title} 확률 추이 예시 · 실제 분석값 아님`}><defs><linearGradient id={`ob-fill-${event.id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity=".25"/><stop offset="100%" stopColor={color} stopOpacity="0"/></linearGradient></defs>{[0,50,100].map(value=><g key={value}><text x="20" y={103-value*.8} textAnchor="end" fill="#96aabd" fontSize="8">{value}</text><line x1="26" x2="158" y1={100-value*.8} y2={100-value*.8} stroke="currentColor" strokeDasharray="2 4"/></g>)}{preview&&<><polygon points={`26,100 ${points} 158,100`} fill={`url(#ob-fill-${event.id})`}/><polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/><circle cx="158" cy={100-last*.8} r="3" fill={color}/></>}<text x="26" y="119" fill="#96aabd" fontSize="8">이전</text><text x="158" y="119" textAnchor="end" fill="#96aabd" fontSize="8">최근</text></svg></button>;})}</div></section>;
}

export default function OutbreakEvents({initialEvent='fed'}:{initialEvent?:string}){
  const [selected,setSelected]=useState(initialEvent);
  const event=events.find(item=>item.id===selected)!;
  return <section className="ob-events" aria-labelledby="ob-title">
    <header className="ob-heading"><div><span className="ob-eyebrow">EVENT OUTLOOK</span><h1 id="ob-title">아웃브레이크</h1><p>큰 이벤트의 가능성과 시장의 기대를 함께 관찰합니다.</p></div><span className="ob-stage">UI 준비 · 확률 미산출</span></header>
    <div className="ob-cards">{events.map(item=><button type="button" key={item.id} className="ob-card" aria-pressed={selected===item.id} onClick={()=>setSelected(item.id)}><span className="ob-category">{item.category}</span><h2>{item.title}</h2><p>{item.question}</p><div className="ob-probability"><strong>—<small>%</small></strong><span>확률 산출 전</span></div><div className="ob-card-footer"><span>주간 변화 <b>— %p</b></span><span>분석 보기 ↗</span></div></button>)}</div>
    <article className="ob-detail" aria-labelledby="ob-detail-title"><header><div><span className="ob-eyebrow">선택한 이벤트</span><h2 id="ob-detail-title">{event.title}</h2></div><span className="ob-stage">기간·판정 기준 초안</span></header>
      <div className="ob-definition"><div><span>분석 질문</span><p>{event.question}</p></div><div><span>발생 판정 기준</span><p>{event.outcome}</p></div></div>
      <div className="ob-detail-grid"><section className="ob-panel"><h3>확률 추이</h3><div className="ob-chart-empty"><div className="ob-chart-grid" aria-hidden="true"/><p>확률 이력이 연결되면 추이를 표시합니다.</p><span>발표·협상 등 주요 사건을 함께 표시할 공간</span></div><div className="ob-metrics"><div><span>현재 확률</span><strong>— %</strong></div><div><span>이전 대비</span><strong>— %p</strong></div><div><span>분석 기준일</span><strong>미등록</strong></div></div></section>
      <section className="ob-panel"><h3>투자 심리와 시장 반응</h3><p className="ob-muted">이벤트 기대 변화와 자산 움직임을 함께 비교할 영역입니다.</p><div className="ob-market-empty">시장 반응 데이터 연결 전</div><dl className="ob-facts"><div><dt>관찰 자산</dt><dd>{event.assets}</dd></div><div><dt>다음 관찰 신호</dt><dd>{event.signals.join(' · ')}</dd></div><div><dt>확률 출처</dt><dd>미등록</dd></div></dl></section></div>
      <section className="ob-formula"><header><div><span className="ob-eyebrow">METHODOLOGY</span><h3>확률 산식과 산출 근거</h3></div><span className="ob-stage">산식 미연결</span></header><div className="ob-formula-space">산식 표시 영역<p>승인된 계산식 · 변수 정의 · 가중치 · 계산 예시</p></div><div className="ob-formula-fields">{['입력 데이터와 출처','산출 방법과 가중치','모델 버전·검증 결과','갱신 주기와 결측 처리'].map(label=><div key={label}><span>{label}</span><p>등록 예정</p></div>)}</div></section>
      <p className="ob-note">현재는 화면 구성만 제공합니다. 실제 확률·시장 반응·산식은 연결되지 않았습니다.</p>
    </article>
  </section>;
}
