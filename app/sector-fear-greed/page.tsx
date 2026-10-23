import type {Metadata} from 'next';
import SiteHeader from '../../components/site-header';
import {WebPageJsonLd} from '../seo-jsonld';
import SectorDetailCharts from './sector-detail-charts';
import './sector-detail.css';

const title='미국 섹터별 공포·탐욕 지수 | 11개 업종 투자심리 분석 - ZGmini';
const description='미국 주식 11개 섹터의 공포·탐욕 지수를 5개 핵심 신호와 252거래일 데이터로 분석합니다. 기술·금융·에너지·헬스케어 등 업종별 투자심리와 강세·약세 흐름을 비교하세요.';
const url='https://zgmini.kr/sector-fear-greed/';
const image='https://zgmini.kr/zgmini-search-share.png';

export const metadata:Metadata={
 title,
 description,
 alternates:{canonical:url},
 robots:{index:true,follow:true},
 openGraph:{title,description,url,type:'website',siteName:'ZGmini',images:[{url:image,width:1200,height:630,alt:'ZGmini 미국 11개 섹터 공포·탐욕 지수'}]},
 twitter:{card:'summary_large_image',title,description,images:[image]},
};

export default function SectorFearGreedPage(){
 return <><SiteHeader/><main className="zg-sector-detail">
  <WebPageJsonLd name={title} description={description} path="/sector-fear-greed/"/>
  <div className="zg-sector-detail-inner">
   <header className="zg-sector-detail-hero">
    <h1>섹터별 공포·탐욕</h1>
    <p>미국 11개 GICS 섹터의 투자심리를 한눈에 비교합니다.</p>
   </header>
   <SectorDetailCharts/>
   <nav aria-label="관련 분석" className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm">
    <a className="underline" href="/fear-greed/usa/">미국 공포탐욕지수 →</a>
    <a className="underline" href="/recession/">미국 경기침체 지표 →</a>
    <a className="underline" href="/asset-bubble/">미국 자산 버블 지표 →</a>
   </nav>
  </div>
 </main></>;
}
