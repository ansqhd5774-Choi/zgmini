"use client";
import {useEffect,useId,useRef,useState,type ReactNode} from 'react';
import {Activity,ArrowRight,ChevronLeft,ChevronRight,Info,Radar,Coins,Users,Percent,Droplet} from 'lucide-react';
import {Line,LineChart,ResponsiveContainer,Tooltip} from 'recharts';
export type DashboardPoint={label:string;value:number};
export type Summary={label:string;score:number;value:string;note:string;data:DashboardPoint[]};
export function DashboardTip({label,children}:{label:string;children:ReactNode}){
 const [open,setOpen]=useState(false),id=useId(),timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const root=useRef<HTMLSpanElement>(null);
 const [coords,setCoords]=useState({left:12,top:0});
 const clear=()=>{if(timer.current){clearTimeout(timer.current);timer.current=null}};
 const close=()=>{clear();setOpen(false)};
 const show=()=>{clear();const r=root.current?.getBoundingClientRect();setCoords({left:Math.max(12,Math.min((r?.right??252)-240,window.innerWidth-252)),top:Math.min(r?.bottom??0,window.innerHeight-180)});setOpen(true)};
 useEffect(()=>()=>clear(),[]);
 useEffect(()=>{if(!open)return;const dismiss=(e:PointerEvent)=>{if(!root.current?.contains(e.target as Node))close()};document.addEventListener('pointerdown',dismiss);return()=>document.removeEventListener('pointerdown',dismiss)},[open]);
 return <span
  ref={root}
  className="zg-tip-wrap"
  onMouseEnter={()=>{clear();timer.current=setTimeout(show,250)}}
  onMouseLeave={()=>{clear();timer.current=setTimeout(close,100)}}
  onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget))close()}}
  onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();close()}}}
 >
  <button
   type="button"
   className="zg-info"
   aria-label={label}
   aria-expanded={open}
   aria-controls={open?id:undefined}
   aria-describedby={open?id:undefined}
   onFocus={show}
   onClick={()=>open?close():show()}
  >
   <Info size={16}/>
  </button>
  {open&&<span id={id} role="tooltip" className="zg-tip" style={{position:"fixed",right:"auto",...coords}}>{children}</span>}
 </span>;
}
export function ScoreScale({score,label,color}:{score:number|null;label:string;color:string}){const band=score===null?'unknown':score<25?'danger':score<40?'caution':score<60?'neutral':score<75?'positive':'strong';return <div className={`zg-scale zg-scale-${band}`} data-score-band={band} role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={score??undefined}><div style={{width:`${score??0}%`,background:color}}/>{score!==null&&<i style={{left:`${score}%`,borderColor:color}}/>}</div>}
const scoreColor=(score:number)=>score<25?'#ef4444':score<40?'#f59e0b':score<60?'#94a3b8':score<75?'#22c55e':'#10b981';
function Sparkline({data,label}:{data:DashboardPoint[];label:string}){return <div className="zg-spark" aria-label={`${label} 관측 추이`}><ResponsiveContainer width="100%" height="100%" initialDimension={{width:1,height:1}}><LineChart data={data} accessibilityLayer margin={{top:6,right:6,left:6,bottom:6}}><Tooltip offset={10} cursor={{stroke:'#AAB2BC',strokeWidth:1}} formatter={v=>[v,'점수']} contentStyle={{fontSize:13,borderRadius:4,border:'1px solid #D7DCE2'}}/><Line type="linear" dataKey="value" stroke="#3478D4" strokeWidth={2} dot={false} activeDot={{r:4}} isAnimationActive={false}/></LineChart></ResponsiveContainer></div>}
// Stage 12 R2 / W05.2:
// R55 responsive/interaction shell adapted to the real React market section.
// Existing public score semantics are preserved. No new score formula is created.
// Domains without an approved public score contract render an explicit unavailable state.
const model=[
 {label:'물가',weight:30,basis:'Core PCE · CPI · PPI 평균'},
 {label:'고용',weight:30,basis:'실업률 · 비농업 고용'},
 {label:'금리',weight:25,basis:'미국 10년물 금리'},
 {label:'유가',weight:15,basis:'WTI 가격 · 변동폭'}
];

const r55Cards=[
 {label:'물가',sourceLabel:'물가',Icon:Coins,basis:'현재 공개 경제점수의 물가 영역을 그대로 표시합니다.',details:['근원 소비지출물가','근원 소비자물가','소비자물가','기대물가']},
 {label:'고용',sourceLabel:'고용',Icon:Users,basis:'현재 공개 경제점수의 고용 영역을 그대로 표시합니다.',details:['비농업고용','실업률','실업수당','임금상승률']},
 {label:'금리',sourceLabel:'금리',Icon:Percent,basis:'현재 공개 경제점수의 금리 영역을 그대로 표시합니다.',details:['정책금리','2년물','10년 실질','10년물']},
 {label:'채권신용',sourceLabel:null,Icon:Activity,basis:'12영역 공개 점수 계약이 아직 확정되지 않아 숫자를 생성하지 않습니다.',details:['HY 신용 스트레스','IG 신용 스트레스','채권 변동성','회사채 시장위험']},
 {label:'경기',sourceLabel:null,Icon:Activity,basis:'12영역 공개 점수 계약이 아직 확정되지 않아 숫자를 생성하지 않습니다.',details:['실질 국내총생산','제조업','서비스업','산업생산']},
 {label:'소비',sourceLabel:null,Icon:Coins,basis:'12영역 공개 점수 계약이 아직 확정되지 않아 숫자를 생성하지 않습니다.',details:['실질 소비지출','소매판매','가처분소득','저축률']},
 {label:'기업실적',sourceLabel:null,Icon:Activity,basis:'12영역 공개 점수 계약이 아직 확정되지 않아 숫자를 생성하지 않습니다.',details:['주당이익 성장','매출 성장률','이익 성장비','영업·순이익률']},
 {label:'유동성',sourceLabel:null,Icon:Droplet,basis:'12영역 공개 점수 계약이 아직 확정되지 않아 숫자를 생성하지 않습니다.',details:['은행 준비금','통화량 증가','재무부 계정변화','익일 역레포']},
 {label:'자금흐름',sourceLabel:null,Icon:Activity,basis:'12영역 공개 점수 계약이 아직 확정되지 않아 숫자를 생성하지 않습니다.',details:['외국인 주식','펀드 자금흐름','국제자본 흐름','위험자산 비중']},
 {label:'수급·폭',sourceLabel:null,Icon:Activity,basis:'12영역 공개 점수 계약이 아직 확정되지 않아 숫자를 생성하지 않습니다.',details:['200일선 상회','상승·하락선','52주 신고가-신저가','동일가중']},
 {label:'달러환율',sourceLabel:null,Icon:Percent,basis:'12영역 공개 점수 계약이 아직 확정되지 않아 숫자를 생성하지 않습니다.',details:['광의 달러지수','3개월 변화율','신흥국 달러지수','달러 변동성']},
 {label:'유가원자재',sourceLabel:null,Icon:Droplet,basis:'현재 공개 API의 유가 점수를 원자재 통합점수로 확대 해석하지 않습니다.',details:['서부텍사스유','브렌트유','구리','휘발유']}
] as const;

const diagnosticSubscores=[
 {name:'인플레이션',components:'근원 PCE, 근원 CPI, CPI, 기대물가'},
 {name:'경기 침체',components:'비농업고용, 실질 GDP, 산업생산, 실질 소비지출, 실업률, 소매판매, 가처분소득'},
 {name:'유동성 위기',components:'단기자금시장 스트레스, 은행준비금, TGA 변화, ON RRP, M2, 채권변동성'},
 {name:'신용 위험',components:'HY CMDI, IG CMDI, Total CMDI, 채권변동성'},
 {name:'실적 침체',components:'EPS 성장, 영업·순이익률, 매출성장, 이익성장 폭'},
 {name:'자산 버블',components:'밸류에이션 압력, 가격가속, 위험자산비중, 투기성 자금흐름, 시장폭 괴리, 과잉유동성'},
 {name:'부채 위험',components:'Debt Service Ratio, 부채/GDP, 금리부담, 신용스트레스, 실적상환능력'},
 {name:'공급 충격',components:'NY Fed GSCPI, 유가충격, 휘발유, 구리, 산업생산, Headline-Core 물가괴리'}
] as const;

const marketStage=(score:number|null)=>{
 if(score===null)return '데이터 준비 중';
 if(score<=24.9)return '매우 부담';
 if(score<=44.9)return '부담';
 if(score<=55)return '중립';
 if(score<=75)return '양호';
 return '매우 양호';
};
const marketBand=(score:number|null)=>{
 if(score===null)return 'unknown';
 if(score<=24.9)return 'extreme-fear';
 if(score<=44.9)return 'fear';
 if(score<=55)return 'neutral';
 if(score<=75)return 'greed';
 return 'extreme-greed';
};

export function CompositeMarketSection({items,points,demo,loading,onDetail}:{items:Summary[];points:number;demo:boolean;loading:boolean;onDetail:(label:string)=>void}){
 const [active,setActive]=useState<string|null>(null);
 const [expanded,setExpanded]=useState(false);
 const master=items.find(x=>x.label==='종합')??items[0];
 const masterScore=loading||!master?null:master.score;
 const toggle=()=>setExpanded(v=>!v);
 const keyToggle=(e:React.KeyboardEvent<HTMLElement>)=>{
  if(e.currentTarget!==e.target)return;
  if(e.key==='Enter'||e.key===' '){e.preventDefault();toggle()}
 };

 return <section id="market" className="zg-section">
  <div className="zg-section-heading zg-r55-heading">
   <div>
    <h2><Activity/>종합 시장 점수</h2>
    <span className="zg-brand-tag">ZGmini 독자 지표{demo?' · 예시':''}</span>
   </div>
   <button type="button" className="zg-r55-expand" aria-expanded={expanded} onClick={toggle}>
    {expanded?'전체 접기':'전체 펼침'}
   </button>
  </div>

  <div className="zg-r55-shell zg-macro-row" data-testid="macro-row" data-expanded={expanded?'true':'false'}>
   <div className="zg-r55-body">
    <article className="zg-r55-summary zg-master" data-testid="composite-panel" aria-busy={loading}>
     <div className="zg-r55-summary-top">
      <span className="zg-eyebrow">시장 환경 · 공포탐욕과 별개</span>
      <div className="zg-r55-master-number">
       <strong style={{color:masterScore===null?'#94a3b8':scoreColor(masterScore)}}>{masterScore===null?'—':masterScore}</strong>
       <span>{loading?'불러오는 중':master?.value??'데이터 확인 중'}</span>
      </div>
      <ScoreScale score={masterScore} label="종합 시장 점수" color={masterScore===null?'#64748b':scoreColor(masterScore)}/>
      <div className="zg-scale-labels"><span>0</span><span>50</span><span>100</span></div>
     </div>

     <div className="zg-r55-summary-chart">
      <h3>현재 시장 해석</h3>
      <p>{loading?'시장 자료를 불러오고 있습니다.':master?.note??'데이터 확인 중'}</p>
      {master?.data?.length?<Sparkline data={loading?[]:master.data.slice(-points)} label="종합"/>:<div className="zg-r55-empty-spark" aria-label="종합 추이 데이터 준비 중">추이 데이터 준비 중</div>}
     </div>

     <div className="zg-weights zg-r55-weights">
      <h3>현재 공개 구성 비중 <DashboardTip label="종합 산출 근거">현재 Production 경제점수 모델의 기존 4개 구성 비중을 그대로 표시합니다. R55의 12영역 후보 비중을 새 종합 산식으로 사용하지 않습니다.</DashboardTip></h3>
      {model.map(m=><button key={m.label} className={active===m.label?'is-linked':''} onMouseEnter={()=>setActive(m.label)} onMouseLeave={()=>setActive(null)} onFocus={()=>setActive(m.label)} onBlur={()=>setActive(null)} onClick={()=>onDetail(m.label)}><span>{m.label}</span><b>{m.weight}%</b></button>)}
     </div>

     <div className="zg-r55-subscore-area" aria-label="진단 세부점수">
      <div className="zg-r55-subscore-grid">
       {diagnosticSubscores.map((s,index)=><div key={s.name} className="zg-r55-subscore" data-index={index}>
        <div className="zg-r55-subscore-head">
         <span className="zg-r55-subscore-title">
          <span onClick={e=>e.stopPropagation()}><DashboardTip label={`${s.name} 반영 항목`}>{s.components}. 현재 public 점수 계약이 없어 숫자는 표시하지 않습니다.</DashboardTip></span>
          <b>{s.name}</b>
         </span>
         <strong>—</strong>
        </div>
        <div className="zg-r55-subscore-foot">
         <span className="zg-r55-subscore-meter" aria-hidden="true"><i/></span>
         <span>준비 중</span>
        </div>
       </div>)}
      </div>
     </div>
    </article>

    <div className="zg-r55-component-panel zg-component-panel" data-testid="component-panel">
     <div className="zg-r55-card-grid zg-component-grid" data-testid="component-grid">
      {r55Cards.map(m=>{
       const item=m.sourceLabel?items.find(x=>x.label===m.sourceLabel):undefined;
       const score=loading||!item?null:item.score;
       const Icon=m.Icon;
       const state=loading?'불러오는 중':item?.value??'데이터 준비 중';
       const note=loading?'시장 자료를 불러오고 있습니다.':item?.note??'공개 점수 계약 준비 중';
       const canDetail=Boolean(item&&m.sourceLabel);
       return <article
        key={m.label}
        className={`zg-r55-card band-${marketBand(score)} ${active===m.sourceLabel?'is-linked':''}`}
        data-status={score===null?'unavailable':'ready'}
        tabIndex={0}
        role="button"
        aria-expanded={expanded}
        aria-label={`${m.label} ${score===null?'데이터 준비 중':`${score}점 ${state}`}`}
        onClick={toggle}
        onKeyDown={keyToggle}
        onMouseEnter={()=>m.sourceLabel&&setActive(m.sourceLabel)}
        onMouseLeave={()=>setActive(null)}
        onFocus={()=>m.sourceLabel&&setActive(m.sourceLabel)}
        onBlur={()=>setActive(null)}
       >
        <div className="zg-r55-card-head">
         <span className="zg-r55-card-icon"><Icon size={18} aria-hidden="true"/></span>
         <h3>{m.label}</h3>
         <span className="zg-r55-badge">{score===null?'준비 중':marketStage(score)}</span>
         <span onClick={e=>e.stopPropagation()}><DashboardTip label={`${m.label} 산출 근거`}>{m.basis}</DashboardTip></span>
        </div>
        <div className="zg-r55-card-mid">
         <div className="zg-r55-card-number">
          <strong style={{color:score===null?'#94a3b8':scoreColor(score)}}>{score===null?'—':score}</strong>
          <span>{state}</span>
         </div>
         {item?.data?.length?<Sparkline data={item.data.slice(-points)} label={m.label}/>:<div className="zg-r55-card-spark-empty" aria-label={`${m.label} 추이 데이터 준비 중`}>—</div>}
        </div>
        <ScoreScale score={score} label={`${m.label} 점수`} color={score===null?'#64748b':scoreColor(score)}/>
        <p className="zg-r55-note">{note}</p>
        <div className="zg-r55-details" aria-hidden={!expanded}>
         {m.details.map(label=><div className="zg-r55-detail" key={label}><span>{label}</span><i/><b>—</b></div>)}
        </div>
        <button
         type="button"
         className="zg-detail zg-r55-detail-button"
         disabled={!canDetail}
         onClick={e=>{e.stopPropagation();if(canDetail)onDetail(m.sourceLabel!)}}
        >{canDetail?'상세 분석':'데이터 준비 중'} <ArrowRight size={14}/></button>
       </article>
      })}
     </div>
    </div>
   </div>
  </div>
 </section>
}
export type Scenario={id:string;title:string;category:string;probability:number|null;previous?:number;updatedAt?:string;confidence?:string;reason?:string};
export function ScenarioSection({items=[]}:{items?:Scenario[]}){const ref=useRef<HTMLDivElement>(null),[position,setPosition]=useState({left:false,right:items.length>4});useEffect(()=>{const el=ref.current;if(!el)return;const measure=()=>setPosition({left:el.scrollLeft>4,right:el.scrollLeft+el.clientWidth<el.scrollWidth-4});const observer=new ResizeObserver(measure);observer.observe(el);measure();return()=>observer.disconnect();},[items.length]);const move=(dir:number)=>ref.current?.scrollBy({left:dir*ref.current.clientWidth,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});return <section id="scenarios" className="zg-section"><div className="zg-section-heading"><h2><Radar/>아웃브레이크</h2><p>주요 사건의 가능성을 추적하는 모델</p></div>{!items.length?<div className="zg-scenario-empty"><Radar size={28}/><div><h3>모델 준비 중</h3><p>검증된 시나리오가 연결되면 확률과 산출 근거를 제공합니다. 현재 공개된 확률은 없습니다.</p></div><span>—</span></div>:<div className="zg-carousel-wrap">{position.left&&<button className="zg-prev" aria-label="이전 아웃브레이크" onClick={()=>move(-1)}><ChevronLeft/></button>}<div ref={ref} className="zg-scenario-track" onScroll={()=>{const e=ref.current!;setPosition({left:e.scrollLeft>4,right:e.scrollLeft+e.clientWidth<e.scrollWidth-4})}}>{items.map(s=><article className="zg-scenario-card" key={s.id}><div className="zg-card-heading"><span className="zg-neutral-tag">{s.category}</span>{s.confidence&&<span>{s.confidence}</span>}</div><h3>{s.title}</h3><div className="zg-scenario-number">{s.probability===null?'—':`${s.probability}%`}{s.previous!==undefined&&s.probability!==null&&<small>{s.probability-s.previous>=0?'+':''}{s.probability-s.previous}%p</small>}</div><ScoreScale score={s.probability} label={s.title} color="#FABC42"/><small>기준 {s.updatedAt??'확인 중'}</small>{s.reason&&<DashboardTip label="아웃브레이크 근거">{s.reason}</DashboardTip>}</article>)}</div>{position.right&&<button className="zg-next" aria-label="다음 아웃브레이크" onClick={()=>move(1)}><ChevronRight/></button>}</div>}</section>}
export function StrengthPanel({title,items,points,onAll,onFavorite,isFavorite}:{title:string;items:{name:string;score:number;data:DashboardPoint[]}[];points:number;onAll:()=>void;onFavorite?:(name:string)=>void;isFavorite?:(name:string)=>boolean}){return <section className="zg-strength"><div className="zg-card-heading"><h2>{title}</h2><button className="zg-detail" onClick={onAll}>전체 보기 <ArrowRight size={14}/></button></div><p>표시용 예시 순위 · 실제 지수 아님</p><ol>{[...items].sort((a,b)=>b.score-a.score).slice(0,5).map((item,index)=>{const series=item.data.slice(-points),delta=series.length>1?series.at(-1)!.value-series[0].value:null;return <li key={item.name}><span>{index+1}</span><b>{item.name}</b><strong className="zg-strength-score">예시 {item.score}</strong><DashboardTip label={`${item.name} 기간 비교`}>{item.name} · 현재 예시 점수 {item.score} · 선택 구간 변화 {delta===null?'확인 불가':`${delta>=0?'+':''}${delta}p`}</DashboardTip>{onFavorite&&<button className="zg-detail" onClick={()=>onFavorite(item.name)} aria-label={`${item.name} 즐겨찾기`}>{isFavorite?.(item.name)?'해제':'추가'}</button>}</li>})}</ol></section>}
