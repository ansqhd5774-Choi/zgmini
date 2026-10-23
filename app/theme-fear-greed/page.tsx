import type {Metadata} from 'next';
import SiteHeader from '../../components/site-header';
import ThemeDetailCharts from './theme-detail-charts';
import {WebPageJsonLd} from '../seo-jsonld';
import '../sector-fear-greed/sector-detail.css';
import './theme-detail.css';
const title='테마별 공포·탐욕 | AI·로봇·에너지·바이오 투자 테마 - ZGmini';
const description='AI 반도체·로봇·에너지·바이오 등 30개 투자 테마 중 공개된 ETF 기반 공포·탐욕 점수와 252거래일 추이, 기간별 변화를 비교합니다.';
export const metadata:Metadata={title,description,alternates:{canonical:'https://zgmini.kr/theme-fear-greed/'},openGraph:{title,description,url:'https://zgmini.kr/theme-fear-greed/'},twitter:{card:'summary_large_image',title,description,images:['https://zgmini.kr/zgmini-search-share.png']}};
export default function ThemeFearGreedPage(){return <><SiteHeader/><main className="zg-sector-detail zg-theme-detail"><WebPageJsonLd name={title} description={description} path="/theme-fear-greed/"/><div className="zg-sector-detail-inner">
 <header className="zg-sector-detail-hero"><h1>테마별 공포·탐욕</h1><p>ETF 기반 투자 테마의 심리 점수와 1년 추이를 비교합니다.</p></header>
 <ThemeDetailCharts/>
 <nav aria-label="관련 분석" className="zg-sector-related-nav">
  <a className="zg-sector-related-link" href="/sector-fear-greed/"><span>미국 섹터 공포·탐욕</span><span aria-hidden="true">→</span></a>
  <a className="zg-sector-related-link" href="/fear-greed/usa/"><span>미국 공포탐욕지수</span><span aria-hidden="true">→</span></a>
  <a className="zg-sector-related-link" href="/asset-bubble/"><span>미국 자산 버블 지표</span><span aria-hidden="true">→</span></a>
 </nav>
 </div></main></>;}
