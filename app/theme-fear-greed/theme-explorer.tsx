'use client';
import {useState} from 'react';
import {Layers3,Search,ArrowUpRight} from 'lucide-react';
import {THEME_GROUPS} from '../../components/market-explorer-catalog';
// R21 PC research evidence observed 2026-10-16. This identifies only three
// price-axis histories, not licensed or completed five-axis scores.
const THREE_PRICE_AXIS_RESEARCH_ASOF='2026.10.16';
const THREE_PRICE_AXIS_READY_THEMES=new Set([
 'AI 반도체','사이버보안','블록체인·디지털자산','핀테크',
 '클라우드·SaaS','로봇·자동화','자율주행','방산',
 '원전·SMR','바이오테크','AI 신약개발','게임·e스포츠',
]);
// R105 approved staging: keep nine researched themes moving while three known
// problem cases are deferred. These are *not* public five-axis score approvals.
const FIRST_NINE_THEMES=[
 '로봇·자동화','클라우드·SaaS','자율주행','바이오테크',
 '게임·e스포츠','원전·SMR','방산','핀테크','사이버보안',
];
const FIRST_NINE_ORDER=new Map(FIRST_NINE_THEMES.map((name,index)=>[name,index]));
const DEFERRED_THREE_THEMES=new Set(['AI 반도체','AI 신약개발','블록체인·디지털자산']);
const priorityOf=name=>FIRST_NINE_ORDER.has(name)?FIRST_NINE_ORDER.get(name):DEFERRED_THREE_THEMES.has(name)?1000:100;
export default function ThemeExplorer(){
 const [group,setGroup]=useState('전체'),[query,setQuery]=useState('');
 const themes=THEME_GROUPS.flatMap(g=>g.items.map(name=>({name,group:g.name,priceAxesReady:THREE_PRICE_AXIS_READY_THEMES.has(name)}))).filter(t=>(group==='전체'||t.group===group)&&t.name.includes(query.trim())).sort((a,b)=>priorityOf(a.name)-priorityOf(b.name));
 return <><div className="zg-explorer-guide"><div><Layers3 size={22}/><p><strong>가격 3축 확보 12개 중 9개 우선 진행</strong><span>{THREE_PRICE_AXIS_RESEARCH_ASOF} 관측 · 나머지 3개 검증 보류 · 5축 종합 점수는 검증 전입니다.</span></p></div><span className="zg-explorer-ready">우선 9 · 보류 3</span></div>
 <div className="zg-explorer-toolbar"><div className="zg-explorer-filters" role="group" aria-label="테마 분류">{['전체',...THEME_GROUPS.map(g=>g.name)].map(name=><button key={name} aria-pressed={group===name} onClick={()=>setGroup(name)}>{name}</button>)}</div><label className="zg-explorer-search"><Search size={17}/><input aria-label="테마 검색" type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="관심 테마 찾기"/></label></div>
 <div className="zg-explorer-theme-grid">{themes.map(t=><article key={t.name} className="zg-explorer-theme"><span>{t.group}</span><h2>{t.name}</h2><p>공포·탐욕 지수</p><div><strong>—</strong><small>{FIRST_NINE_ORDER.has(t.name)?`가격 3축 확보 · ${THREE_PRICE_AXIS_RESEARCH_ASOF}`:DEFERRED_THREE_THEMES.has(t.name)?'3축 연구 이력 확보 · 검증 보류':'데이터 준비 중'}</small></div></article>)}</div>
 {!themes.length&&<p className="zg-explorer-notice" role="status">검색한 테마가 없습니다. 다른 분류나 검색어를 선택해 주세요.</p>}
 <a className="zg-explorer-crosslink" href="/sector-fear-greed/"><span><strong>지금 제공되는 업종별 점수를 찾으시나요?</strong><small>11개 섹터의 공포·탐욕과 기간별 차트를 비교하세요.</small></span><span>섹터 공포·탐욕 <ArrowUpRight size={18}/></span></a></>;
}
