import type {ReactNode} from 'react';
import SiteHeader from './site-header';
import './market-explorer.css';

export default function MarketExplorerShell({eyebrow,title,description,count,label,children}:{eyebrow:string;title:string;description:string;count:string;label:string;children:ReactNode}){
 return <><SiteHeader/><main className="zg-explorer"><div className="zg-explorer-inner">
  <a className="zg-explorer-back" href="/">대시보드 <span aria-hidden="true">/</span> {title}</a>
  <header className="zg-explorer-hero"><div><p className="zg-explorer-eyebrow">{eyebrow}</p><h1>{title}</h1><p className="zg-explorer-lead">{description}</p></div><div className="zg-explorer-count"><strong>{count}</strong><span>{label}</span></div></header>
  {children}
  <footer className="zg-explorer-footer"><span>ZGmini · 데이터로 읽는 시장</span><a href="/about/">지표 소개와 이용 안내 ↗</a></footer>
 </div></main></>;
}
