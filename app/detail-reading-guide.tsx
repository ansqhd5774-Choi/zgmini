import {ArrowUpRight,BookOpen,ExternalLink} from "lucide-react";
import type {ReactNode} from "react";
type GuideSection = { title: string; text: string; bold?: string; highlight?: string };

// Highlight only the exact, editor-approved phrases; never mark arbitrary API text.
function BeginnerEmphasis({text,bold,highlight}:{text:string;bold?:string;highlight?:string}){
  const phrases=[
    ...(highlight?[{value:highlight,kind:"mark" as const}]:[]),
    ...(bold?[{value:bold,kind:"strong" as const}]:[]),
  ].filter(item=>item.value&&text.includes(item.value));
  if(!phrases.length)return <>{text}</>;
  const parts:ReactNode[]=[];
  let start=0;
  while(start<text.length){
    const next=phrases.map(item=>({...item,index:text.indexOf(item.value,start)}))
      .filter(item=>item.index>=0).sort((a,b)=>a.index-b.index||Number(a.kind==="strong")-Number(b.kind==="strong"))[0];
    if(!next){parts.push(text.slice(start));break;}
    if(next.index>start)parts.push(text.slice(start,next.index));
    parts.push(next.kind==="mark"
      ?<mark key={parts.length} className="zg-beginner-reading-mark">{next.value}</mark>
      :<strong key={parts.length} className="zg-beginner-reading-strong">{next.value}</strong>);
    start=next.index+next.value.length;
  }
  return <>{parts}</>;
}
type GuideLink = { href: string; label: string; description?: string };

const seoRelatedOverrides:Record<string,GuideLink[]|undefined>={
  "한국 지수의 출처와 관측일":[],
  "미국 공포탐욕지수 확인 순서":[],
  "미국 인플레이션 점수를 읽는 방법":[],
  "미국 경기침체 지표와 방어점수를 읽는 방법":[],
  "한국 시장심리와 다른 지표를 함께 읽기":[
    {href:"/fear-greed/usa/",label:"미국 CNN 공포탐욕지수"},
    {href:"/sector-fear-greed/",label:"미국 섹터별 공포·탐욕 지수"},
  ],
  "공포탐욕지수를 상황별로 읽는 방법":[
    {href:"/sector-fear-greed/",label:"미국 섹터별 공포·탐욕 지수"},
    {href:"/recession/",label:"미국 경기침체 지표"},
    {href:"/inflation/",label:"미국 CPI·PCE와 물가 지표"},
  ],
  "CPI·PCE 현재값과 물가 점수를 구분하기":[
    {href:"/guides/cpi-pce-release/",label:"CPI·PCE 발표 가이드"},
    {href:"/guides/fomc/",label:"FOMC 가이드"},
    {href:"/recession/",label:"미국 경기침체 지표"},
  ],
  "경기침체 점수와 고용·소비 신호 읽기":[
    {href:"/credit-risk/",label:"회사채·신용 위험 지표"},
    {href:"/liquidity-crisis/",label:"유동성 위기 지표"},
    {href:"/debt-risk/",label:"부채 위험 지표"},
  ],
  "회사채와 신용 위험 지표 읽기":[
    {href:"/liquidity-crisis/",label:"유동성 위기 지표"},
    {href:"/debt-risk/",label:"부채 위험 지표"},
    {href:"/recession/",label:"미국 경기침체 지표"},
  ],
  "자산 버블 안전점수를 읽는 방법":[
    {href:"/sector-fear-greed/",label:"미국 섹터별 공포·탐욕 지수"},
    {href:"/credit-risk/",label:"회사채·신용 위험 지표"},
  ],
};

export default function DetailReadingGuide({ title, sections, sources, related, variant="default", displayTitle, intro }: {
  title: string;
  sections: GuideSection[];
  sources: GuideLink[];
  related: GuideLink[];
  variant?:"default"|"beginner";
  displayTitle?:string;
  intro?:string;
}) {
  const relatedLinks=seoRelatedOverrides[title]?.slice(0,4)??related.slice(0,4);
  if(variant==="beginner")return <section className="zg-beginner-reading" aria-label={title}>
    <header className="zg-beginner-reading-head">
      <span className="zg-beginner-reading-eyebrow"><BookOpen size={14} aria-hidden="true"/> 쉽게 알아보기</span>
      <h2>{displayTitle??title}</h2>
      {intro?<p>{intro}</p>:null}
    </header>
    <div className="zg-beginner-reading-grid">
      {sections.map((section,index)=><article className="zg-beginner-reading-item" key={section.title}>
        <span className="zg-beginner-reading-number" aria-hidden="true">{String(index+1).padStart(2,"0")}</span>
        <h3>{section.title}</h3>
        <p><BeginnerEmphasis text={section.text} bold={section.bold} highlight={section.highlight}/></p>
      </article>)}
    </div>
    {sources.length>0?<div className="zg-beginner-reading-resources">
      <h3>공식 자료 확인하기</h3>
      <p>숫자와 발표 날짜는 자료를 발표하는 기관에서 직접 확인할 수 있어요.</p>
      <ul className="zg-beginner-reading-links">
        {sources.map(link=><li key={link.href}><a className="zg-beginner-reading-link" href={link.href} target="_blank" rel="noopener noreferrer">
          <ExternalLink size={16} aria-hidden="true" className="zg-beginner-reading-link-icon"/>
          <span className="zg-beginner-reading-link-body"><strong>{link.label}</strong><small>{link.description??"공식 홈페이지에서 확인하기"}</small></span>
          <ArrowUpRight size={17} aria-hidden="true" className="zg-beginner-reading-arrow"/>
        </a></li>)}
      </ul>
    </div>:null}
    {relatedLinks.length>0?<nav className="zg-beginner-reading-resources" aria-label="함께 읽을 지표">
      <h3>이어서 알아보기</h3>
      <ul className="zg-beginner-reading-links">
        {relatedLinks.map(link=><li key={link.href}><a className="zg-beginner-reading-link" href={link.href}>
          <BookOpen size={16} aria-hidden="true" className="zg-beginner-reading-link-icon"/>
          <span className="zg-beginner-reading-link-body"><strong>{link.label}</strong><small>{link.description??"쉽게 이어서 읽기"}</small></span>
          <ArrowUpRight size={17} aria-hidden="true" className="zg-beginner-reading-arrow"/>
        </a></li>)}
      </ul>
    </nav>:null}
  </section>;
  return <section className="mt-12 space-y-6 text-sm leading-7 text-slate-300 sm:text-base" aria-label={title}>
    <h2 className="text-xl font-bold text-white">{title}</h2>
    {sections.map(section => <div key={section.title}>
      <h3 className="mb-2 font-bold text-white">{section.title}</h3>
      <p>{section.text}</p>
    </div>)}
    {sources.length>0&&<div>
      <h3 className="mb-2 font-bold text-white">출처와 확인 경로</h3>
      <ul className="flex flex-wrap gap-x-6 gap-y-2">{sources.map(link => <li key={link.href}>
        <a className="inline-flex min-h-11 items-center text-blue-200 underline" href={link.href}>{link.label} →</a>
      </li>)}</ul>
    </div>}
    {relatedLinks.length>0&&<nav aria-label="함께 읽을 지표" className="flex flex-wrap gap-x-6 gap-y-2">{relatedLinks.map(link =>
      <a key={link.href} className="inline-flex min-h-11 items-center text-blue-200 underline" href={link.href}>{link.label} →</a>
    )}</nav>}
  </section>;
}
