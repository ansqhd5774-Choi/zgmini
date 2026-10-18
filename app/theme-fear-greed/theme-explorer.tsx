'use client';
import {useState} from 'react';
import {Layers3,Search,ArrowUpRight} from 'lucide-react';
import {THEME_GROUPS} from '../../components/market-explorer-catalog';
export default function ThemeExplorer(){
 const [group,setGroup]=useState('전체'),[query,setQuery]=useState('');
 const themes=THEME_GROUPS.flatMap(g=>g.items.map(name=>({name,group:g.name}))).filter(t=>(group==='전체'||t.group===group)&&t.name.includes(query.trim()));
 return <><div className="zg-explorer-guide"><div><Layers3 size={22}/><p><strong>테마 지수는 데이터 연결 준비 중입니다</strong><span>현재 제공하는 것은 테마 탐색 목록입니다. 검증된 점수·차트가 없어 임의 수치나 순위를 표시하지 않습니다.</span></p></div><span className="zg-explorer-ready">점수 미제공</span></div>
 <div className="zg-explorer-toolbar"><div className="zg-explorer-filters" role="group" aria-label="테마 분류">{['전체',...THEME_GROUPS.map(g=>g.name)].map(name=><button key={name} aria-pressed={group===name} onClick={()=>setGroup(name)}>{name}</button>)}</div><label className="zg-explorer-search"><Search size={17}/><input aria-label="테마 검색" type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="관심 테마 찾기"/></label></div>
 <div className="zg-explorer-theme-grid">{themes.map(t=><article key={t.name} className="zg-explorer-theme"><span>{t.group}</span><h2>{t.name}</h2><p>공포·탐욕 지수</p><div><strong>—</strong><small>데이터 준비 중</small></div></article>)}</div>
 {!themes.length&&<p className="zg-explorer-notice" role="status">검색한 테마가 없습니다. 다른 분류나 검색어를 선택해 주세요.</p>}
 <a className="zg-explorer-crosslink" href="/sector-fear-greed/"><span><strong>지금 제공되는 업종별 점수를 찾으시나요?</strong><small>11개 섹터의 공포·탐욕과 기간별 차트를 비교하세요.</small></span><span>섹터 공포·탐욕 <ArrowUpRight size={18}/></span></a></>;
}
