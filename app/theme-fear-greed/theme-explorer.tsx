'use client';
import {useState} from 'react';
import {Layers3,Search,ArrowUpRight} from 'lucide-react';
import {THEME_GROUPS} from '../../components/market-explorer-catalog';
// R21: price three-axis research in 12 themes. R120 PC: ETF-pair five-axis
// Shadow computed for eight themes as of 2026-10-16. Neither research result
// approves production scores or licenses public index publication.
const THREE_PRICE_AXIS_RESEARCH_ASOF='2026.10.16';
const THREE_PRICE_AXIS_READY_THEMES=new Set([
 'AI 반도체','사이버보안','블록체인·디지털자산','핀테크',
 '클라우드·SaaS','로봇·자동화','자율주행','방산',
 '원전·SMR','바이오테크','AI 신약개발','게임·e스포츠',
]);
// R121 staging: prioritize the eight R120 research-computable themes; defer
// game/e-sports due to zero ETF pair turnover on 2024-10-03. Retain the
// original three R115 deferred themes. Neither is a production score.
const FIRST_NINE_THEMES: string[]=[
 '로봇·자동화','클라우드·SaaS','자율주행','바이오테크',
 '원전·SMR','방산','핀테크','사이버보안','게임·e스포츠',
];
const FIRST_NINE_ORDER=new Map<string,number>(FIRST_NINE_THEMES.map((name,index)=>[name,index]));
const R120_EIGHT_SHADOW_READY=new Set(FIRST_NINE_THEMES.filter(name=>name!=='게임·e스포츠'));
const DEFERRED_THREE_THEMES=new Set(['AI 반도체','AI 신약개발','블록체인·디지털자산']);
const priorityOf=(name:string):number=>FIRST_NINE_ORDER.get(name)??(DEFERRED_THREE_THEMES.has(name)?1000:100);
export default function ThemeExplorer(){
 const [group,setGroup]=useState('전체'),[query,setQuery]=useState('');
 const themes=THEME_GROUPS.flatMap(g=>g.items.map(name=>({name,group:g.name,priceAxesReady:THREE_PRICE_AXIS_READY_THEMES.has(name)}))).filter(t=>(group==='전체'||t.group===group)&&t.name.includes(query.trim())).sort((a,b)=>priorityOf(a.name)-priorityOf(b.name));
 return <><div className="zg-explorer-guide"><div><Layers3 size={22}/><p><strong>ETF 기반 5축 연구 산출 8개</strong><span>{THREE_PRICE_AXIS_RESEARCH_ASOF} 기준 · 게임·e스포츠 1개 추가 보류 · 5축 종합 점수는 검증 전입니다.</span></p></div><span className="zg-explorer-ready">연구 8 · 보류 4</span></div>
 <div className="zg-explorer-toolbar"><div className="zg-explorer-filters" role="group" aria-label="테마 분류">{['전체',...THEME_GROUPS.map(g=>g.name)].map(name=><button key={name} aria-pressed={group===name} onClick={()=>setGroup(name)}>{name}</button>)}</div><label className="zg-explorer-search"><Search size={17}/><input aria-label="테마 검색" type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="관심 테마 찾기"/></label></div>
 <div className="zg-explorer-theme-grid">{themes.map(t=><article key={t.name} className="zg-explorer-theme"><span>{t.group}</span><h2>{t.name}</h2><p>공포·탐욕 지수</p><div><strong>—</strong><small>{R120_EIGHT_SHADOW_READY.has(t.name)?`ETF 5축 연구 산출 · ${THREE_PRICE_AXIS_RESEARCH_ASOF}`:t.name==='게임·e스포츠'?'거래대금 검증 보류':DEFERRED_THREE_THEMES.has(t.name)?'3축 연구 이력 확보 · 검증 보류':'데이터 준비 중'}</small></div></article>)}</div>
 {!themes.length&&<p className="zg-explorer-notice" role="status">검색한 테마가 없습니다. 다른 분류나 검색어를 선택해 주세요.</p>}
 <a className="zg-explorer-crosslink" href="/sector-fear-greed/"><span><strong>지금 제공되는 업종별 점수를 찾으시나요?</strong><small>11개 섹터의 공포·탐욕과 기간별 차트를 비교하세요.</small></span><span>섹터 공포·탐욕 <ArrowUpRight size={18}/></span></a></>;
}
