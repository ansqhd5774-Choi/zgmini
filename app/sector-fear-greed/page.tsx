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
   <a className="zg-sector-detail-back" href="/#strength">← 대시보드로 돌아가기</a>
   <header className="zg-sector-detail-hero">
    <p className="zg-sector-detail-kicker">DATA-DRIVEN SECTOR SENTIMENT</p>
    <h1>섹터별 공포·탐욕</h1>
    <h2>데이터로 읽는 미국 섹터 투자심리</h2>
    <p className="zg-sector-detail-lead">미국 주식 11개 섹터의 공포·탐욕 지수를 정량 분석합니다.</p>
    <p className="zg-sector-detail-copy">가격 추세·시장폭·수요·상대강도·변동성 등 <strong>5개 핵심 신호</strong>와 SPY·11개 섹터 ETF, 종목별 가격·거래량, 시점별 섹터 분류 데이터를 결합해 투자심리를 수치화합니다. <strong>252거래일 × 11개 섹터, 총 2,772개의 일별 지수 포인트</strong>를 비교해 어느 업종에 공포와 탐욕이 집중되고 있는지 한눈에 확인할 수 있습니다.</p>
    <div className="zg-sector-detail-stats" aria-label="섹터 공포 탐욕 분석 범위">
     <span><strong>11</strong><small>SECTORS</small></span>
     <span><strong>252</strong><small>TRADING DAYS</small></span>
     <span><strong>5</strong><small>CORE SIGNALS</small></span>
     <span><strong>2,772</strong><small>DAILY POINTS</small></span>
    </div>
    <p className="zg-sector-detail-hint">차트를 가리키거나 터치하면 같은 날짜의 11개 섹터 점수를 함께 볼 수 있습니다.</p>
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
