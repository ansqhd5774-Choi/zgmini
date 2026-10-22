'use client';
import {useState} from 'react';
import {Layers3,Search,ArrowUpRight} from 'lucide-react';
import {THEME_GROUPS} from '../../components/market-explorer-catalog';
import {useStoredIndex} from '../../components/use-stored-index';

const RESEARCH_ASOF='2026.10.16';
const FIRST_NINE_THEMES=[
 '로봇·자동화','클라우드·SaaS','자율주행','바이오·신약',
 '원전·SMR','방산','핀테크','사이버보안','게임·e스포츠',
];
const FIRST_NINE_ORDER=new Map(FIRST_NINE_THEMES.map((name,index)=>[name,index]));
const ETF_ONLY_SEVEN=new Set(['로봇·자동화','클라우드·SaaS','자율주행','원전·SMR','방산','핀테크','사이버보안']);
const DEFERRED_THREE=new Set(['AI 반도체','AI 신약개발','블록체인·디지털자산']);
const priorityOf=(name:string)=>FIRST_NINE_ORDER.get(name)??(DEFERRED_THREE.has(name)?1000:100);
type Point={date:string;score:number};
type ThemeScore={theme:string;etfs:string[];score:number;history:Point[]};
type PublicThemeFeed={status:string;observationDate?:string;themes?:ThemeScore[]};
function InlineHistory({points,label}:{points:Point[];label:string}){
 if(points.length!==252)return null;
 const path=points.map((p,i)=>(i===0?'M':'L')+(i/251*249).toFixed(2)+','+(37-p.score*.34).toFixed(2)).join(' ');
 return <svg aria-label={label+' 252거래일 점수 추이'} role="img" viewBox="0 0 250 40" preserveAspectRatio="none" style={{display:'block',width:'100%',height:40,marginTop:5}}>
  <path d={path} fill="none" stroke="#60a5fa" strokeWidth="1.8" vectorEffect="non-scaling-stroke"/>
  <circle cx="249" cy={37-points[251].score*.34} r="2.4" fill="#60a5fa"/>
 </svg>;
}
export default function ThemeExplorer(){
 const [group,setGroup]=useState('전체'),[query,setQuery]=useState('');
 const {payload,error}=useStoredIndex<PublicThemeFeed>('/api/theme-fear-greed');
 // Hide even previously cached scores when the stored-only API becomes unavailable.
 const ready=!error&&payload?.status==='READY'&&Array.isArray(payload.themes)?new Map(payload.themes.map(x=>[x.theme,x])):new Map<string,ThemeScore>();
 const themes=THEME_GROUPS.flatMap(g=>g.items.map(name=>({name,group:g.name}))).filter(t=>(group==='전체'||t.group===group)&&t.name.includes(query.trim())).sort((a,b)=>priorityOf(a.name)-priorityOf(b.name));
 return <><div className="zg-explorer-guide"><div><Layers3 size={22}/><p><strong>{ready.size?'ETF 전용 3축 연구 · '+ready.size+'개 테마':'ETF 전용 3축 연구 · 공개 데이터 대기'}</strong><span>{ready.size?(payload?.observationDate??'관측일 미확인')+' 기준 252거래일 공개 점수 · 승인된 저장 데이터만 표시합니다.':RESEARCH_ASOF+' 기준 252거래일 Shadow 검증 완료 · 승인된 공개 저장 데이터가 있을 때만 점수를 표시합니다.'}</span></p></div><span className="zg-explorer-ready">{ready.size?'ETF '+ready.size+' · 저장 점수':'ETF · 공개 대기'}</span></div>
 <div className="zg-explorer-toolbar"><div className="zg-explorer-filters" role="group" aria-label="테마 분류">{['전체',...THEME_GROUPS.map(g=>g.name)].map(name=><button key={name} aria-pressed={group===name} onClick={()=>setGroup(name)}>{name}</button>)}</div><label className="zg-explorer-search"><Search size={17}/><input aria-label="테마 검색" type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="관심 테마 찾기"/></label></div>
 <div className="zg-explorer-theme-grid">{themes.map(t=>{const item=ready.get(t.name);return <article key={t.name} className="zg-explorer-theme"><span>{t.group}</span><h2>{t.name}</h2><p>공포·탐욕 지수</p><div><strong>{item?item.score.toFixed(1):'—'}</strong><small>{item?'ETF 3축 · '+(payload?.observationDate??''):ETF_ONLY_SEVEN.has(t.name)?'ETF 3축 252일 검증 · '+RESEARCH_ASOF:t.name==='바이오·신약'||t.name==='게임·e스포츠'?'ETF 입력 보완 중':DEFERRED_THREE.has(t.name)?'ETF 연구 대상 · 데이터 준비 중':'데이터 준비 중'}</small></div>{item?<InlineHistory points={item.history} label={t.name}/>:null}</article>})}</div>
 {!themes.length&&<p className="zg-explorer-notice" role="status">검색한 테마가 없습니다. 다른 분류나 검색어를 선택해 주세요.</p>}
 <a className="zg-explorer-crosslink" href="/sector-fear-greed/"><span><strong>지금 제공되는 업종별 점수를 찾으시나요?</strong><small>11개 섹터의 공포·탐욕과 기간별 차트를 비교하세요.</small></span><span>섹터 공포·탐욕 <ArrowUpRight size={18}/></span></a></>;
}
