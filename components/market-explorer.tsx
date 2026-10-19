'use client';
import {useState,type CSSProperties} from 'react';
import {ArrowDownUp,ArrowUpRight,Search,ShieldCheck,Activity} from 'lucide-react';
import {useStoredIndex} from './use-stored-index';
import {LiveScoreValue} from './live-score-value';
import {StoredScoreDirection} from './score-arrow-provider';
import {RISK_CARDS,ECONOMIC_CARDS} from './market-explorer-catalog';

type Indicator={id?:string;name?:string;label?:string;status?:string;score?:number|null;observationDate?:string;asOfDate?:string};
type Domain={id:string;score:number|null;status:string;trend?:Array<{label?:string;date?:string;score?:number;value?:number}>;indicators?:Indicator[];updatedAt?:string|null};
type Snapshot={status:string;asOfDate?:string;domains?:Domain[];diagnostics8?:Record<string,{status:string;score:number|null}>};
const valid=(n:unknown):n is number=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=100;
const scoreOf=(d?:{score:number|null;status:string}|null)=>d?.status==='READY'&&valid(d.score)?d.score:null;
const color=(n:number|null)=>n===null?'#8fa4b8':n<25?'#fb7185':n<45?'#fbbf24':n<=55?'#a8bacb':'#34d399';
const band=(n:number|null)=>n===null?'확인 대기':n<25?'취약':n<45?'주의':n<=55?'중립':'양호';

function History({domain}:{domain?:Domain}){
 const rows=(domain?.trend??[]).flatMap(p=>{const date=p.date??p.label,value=p.value??p.score;return date&&/^\d{4}-\d{2}-\d{2}$/.test(date)&&Number.isFinite(Date.parse(date))&&valid(value)?[{date,value}]:[]}).sort((a,b)=>a.date.localeCompare(b.date));
 if(rows.length<2)return <div className="zg-explorer-empty-chart">비교할 저장 이력이 아직 없습니다.</div>;
 const start=Date.parse(rows[0].date),end=Date.parse(rows.at(-1)!.date),x=(date:string)=>36+(Date.parse(date)-start)/(end-start||1)*504;
 return <figure className="zg-explorer-history"><svg viewBox="0 0 560 150" role="img" aria-label={`${rows[0].date}부터 ${rows.at(-1)!.date}까지 저장 점수 추이`}>
  {[0,50,100].map(v=><g key={v}><text x="27" y={125-v+4} textAnchor="end" fill="#8fa4b8" fontSize="10">{v}</text><line x1="36" x2="540" y1={125-v} y2={125-v} stroke="#25475e" strokeDasharray="3 5"/></g>)}
  <polyline points={rows.map(p=>`${x(p.date)},${125-p.value}`).join(' ')} fill="none" stroke={color(scoreOf(domain))} strokeWidth="2" vectorEffect="non-scaling-stroke"/>
  <text x="36" y="145" fontSize="10" fill="#8fa4b8">{rows[0].date}</text><text x="540" y="145" textAnchor="end" fontSize="10" fill="#8fa4b8">{rows.at(-1)!.date}</text>
 </svg><figcaption>저장된 관측 점수</figcaption></figure>;
}

export default function MarketExplorer({kind}:{kind:'risk'|'economic'}){
 const {payload,loading,error}=useStoredIndex<Snapshot>('/api/market-score');
 const {payload:asset}=useStoredIndex<{status:string;score:number|null}>('/api/asset-bubble-detail',null,kind==='risk');
 const {payload:supply}=useStoredIndex<{status:string;score:number|null}>('/api/supply-shock-detail',null,kind==='risk');
 const [query,setQuery]=useState(''),[sort,setSort]=useState('default');
 const catalog=kind==='risk'?RISK_CARDS:ECONOMIC_CARDS;
 const cards=catalog.map((card,index)=>{
  const domain=kind==='economic'?payload?.domains?.find(d=>d.id===card.id):undefined;
  const datum=kind==='economic'?domain:card.id==='assetBubbleSafety'?asset:card.id==='supplyShockSafety'?supply:payload?.diagnostics8?.[card.id];
  return {...card,index,domain,score:scoreOf(datum)};
 });
 const ready=cards.filter(c=>c.score!==null).length;
 const shown=cards.filter(c=>`${c.name} ${c.description}`.includes(query.trim())).sort((a,b)=>sort==='low'?(a.score??Infinity)-(b.score??Infinity):sort==='high'?(b.score??-Infinity)-(a.score??-Infinity):a.index-b.index);
 return <>
  <div className="zg-explorer-guide"><div>{kind==='risk'?<ShieldCheck size={22}/>:<Activity size={22}/>}<p><strong>높을수록 안정·우호적인 환경</strong><span>{kind==='risk'?'위험 발생 확률이 아닙니다. 점수가 낮은 영역부터 원인과 상세 자료를 확인하세요.':'원자료의 금리·물가 수치가 아닌 ZGmini의 0–100점 평가입니다. 영역마다 관측 주기가 다릅니다.'}</span></p></div><span className="zg-explorer-ready">{loading?'불러오는 중':`${ready}/${cards.length} 점수 제공`}</span></div>
  {error&&<p className="zg-explorer-notice" role="status">갱신이 지연되고 있습니다. 수신한 저장 자료가 있으면 유지합니다.</p>}
  <div className="zg-explorer-toolbar"><label className="zg-explorer-search"><Search size={17}/><input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="지표 이름으로 찾기" aria-label="지표 검색"/></label><label className="zg-explorer-sort"><ArrowDownUp size={16}/><select aria-label="지표 정렬" value={sort} onChange={e=>setSort(e.target.value)}><option value="default">기본 순서</option><option value="low">낮은 점수부터</option><option value="high">높은 점수부터</option></select></label></div>
  <div className={`zg-explorer-grid is-${kind}`}>{shown.map(card=><article key={card.id} className="zg-explorer-card" id={card.id} style={{'--explorer-accent':color(card.score)} as CSSProperties}>
   <div className="zg-explorer-card-top"><span className="zg-explorer-index">{String(card.index+1).padStart(2,'0')}</span><span className="zg-explorer-band">{band(card.score)}</span></div>
   <h2>{card.name}</h2><p className="zg-explorer-description">{card.description}</p>
   <div className="zg-explorer-score"><LiveScoreValue value={card.score}>{card.score===null?'—':card.score.toFixed(1)}</LiveScoreValue><span> / 100</span><StoredScoreDirection id={(kind==='risk'?'diagnostic:':'')+card.id} score={card.score}/></div>
   <div className="zg-explorer-meter" aria-hidden="true"><i style={{width:`${card.score??0}%`}}/></div>
   {kind==='risk'&&'href'in card?<><div className="zg-explorer-tags">{card.tags.map(tag=><span key={tag}>{tag}</span>)}</div><a className="zg-explorer-detail-link" href={card.href}>{card.name} 자세히 보기 <ArrowUpRight size={17}/></a></>:<details className="zg-explorer-details"><summary>추이·구성 지표 보기 <span aria-hidden="true">＋</span></summary><History domain={card.domain}/><p className="zg-explorer-observation">차트는 저장된 관측 사이를 연결합니다. 현재 점수와 마지막 추이 관측일은 다를 수 있습니다.</p><ul>{card.domain?.indicators?.map((item,i)=><li key={item.id??i}><span>{item.label??item.name??item.id??'구성 지표'}<small>{item.observationDate??item.asOfDate??'관측일 미제공'}</small></span><b>{scoreOf({status:item.status??'',score:item.score??null})?.toFixed(1)??'—'}</b></li>)}</ul>{!card.domain?.indicators?.length&&<p>구성 지표가 아직 제공되지 않았습니다.</p>}</details><a className="zg-explorer-detail-link" href={card.href}>{card.name} 상세페이지 열기 <ArrowUpRight size={17}/></a></>}
  </article>)}</div>
  {!shown.length&&<p className="zg-explorer-notice" role="status">일치하는 지표가 없습니다. 검색어를 바꿔 주세요.</p>}
 </>;
}
