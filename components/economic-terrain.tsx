'use client';

import {useState,type CSSProperties} from 'react';
import {Activity,ArrowUpRight,ChevronDown,Info,Search} from 'lucide-react';
import {useStoredIndex} from './use-stored-index';
import {LiveScoreValue} from './live-score-value';
import {ECONOMIC_CARDS} from './market-explorer-catalog';
import './economic-terrain.css';

type Indicator={id?:string;name?:string;label?:string;status?:string;score?:number|null;observationDate?:string;asOfDate?:string};
type Observation={date?:string;label?:string;score?:number;value?:number};
type Domain={id:string;status:string;score:number|null;trend?:Observation[];indicators?:Indicator[]};
type Snapshot={status:string;domains?:Domain[]};
type Period='1M'|'3M'|'6M'|'1Y';

const isScore=(value:unknown):value is number=>typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=100;
const readyScore=(domain?:{status?:string;score?:number|null}|null)=>domain?.status==='READY'&&isScore(domain.score)?domain.score:null;
const BANDS=[
 {name:'취약',min:0,max:25,range:'0–25',width:25,color:'#fa628b'},
 {name:'주의',min:25,max:45,range:'25–45',width:20,color:'#ffc64b'},
 {name:'중립',min:45,max:55,range:'45–55',width:10,color:'#a6bdd0'},
 {name:'양호',min:55,max:75,range:'55–75',width:20,color:'#2de0c4'},
 {name:'우수',min:75,max:100,range:'75–100',width:25,color:'#13bfa7'},
] as const;
const bandOf=(score:number|null)=>score===null?null:BANDS.find(b=>score<b.max)??BANDS.at(-1)!;
const PERIOD_DAYS:Record<Period,number>={'1M':31,'3M':93,'6M':183,'1Y':366};

function historyRows(domain:Domain|undefined,period:Period){
 const unique=new Map<string,number>();
 for(const point of domain?.trend??[]){
  const date=point.date??point.label,value=point.value??point.score;
  if(date&&/^\d{4}-\d{2}-\d{2}$/.test(date)&&Number.isFinite(Date.parse(date))&&isScore(value))unique.set(date,value);
 }
 const rows=[...unique].map(([date,value])=>({date,value})).sort((a,b)=>a.date.localeCompare(b.date));
 if(!rows.length)return [];
 const last=Date.parse(rows.at(-1)!.date),cutoff=last-PERIOD_DAYS[period]*86400000;
 return rows.filter(point=>Date.parse(point.date)>=cutoff);
}

function TerrainHistory({domain,period}:{domain?:Domain;period:Period}){
 const rows=historyRows(domain,period);
 if(rows.length<2)return <p className="zg-terrain-chart-empty">선택한 기간의 저장된 점수 이력이 부족합니다.</p>;
 const start=Date.parse(rows[0].date),end=Date.parse(rows.at(-1)!.date),accent=bandOf(readyScore(domain))?.color??'#a6bdd0';
 const px=(date:string)=>42+(Date.parse(date)-start)/(end-start||1)*598;
 const ticks=[0,25,50,75,100];
 return <figure className="zg-terrain-history"><svg viewBox="0 0 680 194" role="img" aria-label={`${rows[0].date}부터 ${rows.at(-1)!.date}까지 저장된 점수 추이`} preserveAspectRatio="none">
  {ticks.map(v=><g key={v}><line x1="42" x2="640" y1={153-v*1.25} y2={153-v*1.25} stroke="#234156" strokeDasharray="3 5"/><text x="31" y={157-v*1.25} textAnchor="end" fill="#9db6c8" fontSize="12">{v}</text></g>)}
  <polyline points={rows.map(p=>`${px(p.date)},${153-p.value*1.25}`).join(' ')} fill="none" stroke={accent} strokeWidth="2.25" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round"/>
  <text x="42" y="183" fontSize="12" fill="#819aac">{rows[0].date.slice(0,7)}</text><text x="640" y="183" textAnchor="end" fontSize="12" fill="#819aac">{rows.at(-1)!.date.slice(0,7)}</text>
 </svg><figcaption>실제 저장 관측일 기준 · 관측 사이를 연결한 추이</figcaption></figure>;
}

function SelectedDetail({name,href,description,score,domain}:{name:string;href:string;description:string;score:number|null;domain?:Domain}){
 const [period,setPeriod]=useState<Period>('1Y');
 const band=bandOf(score);
 const indicators=domain?.indicators??[];
 return <div className="zg-terrain-detail" aria-label={`${name} 선택 지표 상세`}>
  <div className="zg-terrain-detail-summary"><span className="zg-terrain-kicker">선택 지표</span><h3>{name}</h3><p>현재 안정 점수</p><div className="zg-terrain-detail-score" style={{color:band?.color??'#a6bdd0'}}><strong>{score===null?'—':score.toFixed(1)}</strong><span>/ 100</span></div><span className="zg-terrain-pill" style={{'--terrain-accent':band?.color??'#a6bdd0'} as CSSProperties}>{band?.name??'확인 대기'}</span></div>
  <div className="zg-terrain-detail-trend"><div className="zg-terrain-chart-heading"><strong>{name} 안정 점수 · 저장 추이</strong><div role="group" aria-label="차트 기간 선택">{(['1M','3M','6M','1Y'] as Period[]).map(p=><button key={p} type="button" aria-pressed={period===p} onClick={()=>setPeriod(p)}>{p}</button>)}</div></div><TerrainHistory domain={domain} period={period}/></div>
  <div className="zg-terrain-detail-explain"><strong>지표 해설</strong><p>{description}</p>{indicators.length>0?<div className="zg-terrain-components"><span>구성 지표</span><ul>{indicators.slice(0,4).map((indicator,index)=><li key={indicator.id??index}>{indicator.label??indicator.name??indicator.id??'구성 지표'}<b>{readyScore(indicator)?.toFixed(1)??'—'}</b></li>)}</ul></div>:<p className="zg-terrain-no-components">구성 지표는 상세 페이지에서 확인하세요.</p>}<a href={href}>{name} 상세 보기 <ArrowUpRight size={15} aria-hidden="true"/></a></div>
 </div>;
}

export default function EconomicTerrain(){
 const {payload,loading,error}=useStoredIndex<Snapshot>('/api/market-score');
 const [selected,setSelected]=useState<string|null>('rates');
 const [query,setQuery]=useState('');
 const [sort,setSort]=useState<'low'|'high'|'original'>('low');
 const cards=ECONOMIC_CARDS.map((card,index)=>{
  const domain=payload?.domains?.find(item=>item.id===card.id);
  return {...card,index,domain,score:readyScore(domain)};
 });
 const ready=cards.filter(card=>card.score!==null).length;
 const shown=cards.filter(card=>`${card.name} ${card.description}`.includes(query.trim())).sort((a,b)=>sort==='original'?a.index-b.index:sort==='high'?(b.score??-Infinity)-(a.score??-Infinity):(a.score??Infinity)-(b.score??Infinity));
 return <section className="zg-terrain" aria-labelledby="zg-terrain-heading">
  <div className="zg-terrain-section-heading"><div className="zg-terrain-title"><Activity size={27} aria-hidden="true"/><div><h2 id="zg-terrain-heading">경제 지형도</h2><p>12개 경제 지표의 안정 점수 분포</p></div></div><div className="zg-terrain-controls"><span aria-live="polite">{loading?'불러오는 중':`${ready} / 12 점수 제공`}</span><label className="zg-terrain-search"><Search size={14} aria-hidden="true"/><input type="search" placeholder="지표 검색" aria-label="경제 지표 검색" value={query} onChange={event=>setQuery(event.target.value)}/></label><label className="zg-terrain-sort"><select aria-label="경제 지표 정렬" value={sort} onChange={event=>setSort(event.target.value as typeof sort)}><option value="low">낮은 점수 순</option><option value="high">높은 점수 순</option><option value="original">기본 순서</option></select><ChevronDown size={14} aria-hidden="true"/></label></div></div>
  {error&&<p className="zg-terrain-notice" role="status">데이터 갱신이 지연되고 있습니다. 현재 제공 가능한 저장 점수만 표시합니다.</p>}
  <div className="zg-terrain-list">
   <div className="zg-terrain-axis" aria-hidden="true"><div className="zg-terrain-axis-label"># <span>지표</span><span>현재 안정 점수</span></div><div className="zg-terrain-axis-plot"><div className="zg-terrain-axis-bands">{BANDS.map(b=><div key={b.name} style={{width:`${b.width}%`}}><strong style={{color:b.color}}>{b.name}</strong><span>{b.range}</span><i style={{background:b.color}}/></div>)}</div><div className="zg-terrain-axis-ticks">{[0,25,45,55,75,100].map(v=><span key={v} style={{left:`${v}%`}}>{v}</span>)}</div></div></div>
   {shown.map((card,index)=>{
    const band=bandOf(card.score),active=selected===card.id;
    return <div className="zg-terrain-item" key={card.id} id={card.id} style={{'--terrain-accent':band?.color??'#8fa4b8'} as CSSProperties}>
     <button className={`zg-terrain-row${active?' is-selected':''}`} type="button" aria-expanded={active} aria-controls={`terrain-detail-${card.id}`} onClick={()=>setSelected(active?null:card.id)}>
      <span className="zg-terrain-row-index">{sort==='original'?card.index+1:index+1}</span><span className="zg-terrain-row-name">{card.name}</span><LiveScoreValue className="zg-terrain-row-score" value={card.score}>{card.score===null?'—':card.score.toFixed(1)}</LiveScoreValue><span className="zg-terrain-track" aria-hidden="true">{card.score!==null&&<><i className="zg-terrain-line" style={{width:`${card.score}%`}}/><i className="zg-terrain-dot" style={{left:`${card.score}%`}}/><em style={{left:`${card.score}%`}}>{card.score.toFixed(1)}</em></>}</span><ChevronDown className="zg-terrain-row-chevron" size={17} aria-hidden="true"/>
     </button>
     {active&&<div id={`terrain-detail-${card.id}`}><SelectedDetail key={card.id} name={card.name} href={card.href} description={card.description} score={card.score} domain={card.domain}/></div>}
    </div>;
   })}
   {!shown.length&&<p className="zg-terrain-notice" role="status">검색 결과가 없습니다. 다른 지표 이름을 입력하세요.</p>}
  </div>
  <p className="zg-terrain-footnote"><Info size={13} aria-hidden="true"/>높은 점수일수록 안정적인 상태를 의미합니다. 점수는 실제 위험 발생 확률이 아닙니다.</p>
 </section>;
}
