import InvestorSearchGuide from '../../components/investor-search-guide';
import {SECTOR_INVESTOR_SEARCH} from '../../lib/investor-search-content';
import type {Metadata} from 'next';
import SiteHeader from '../../components/site-header';
import {WebPageJsonLd} from '../seo-jsonld';
import SectorDetailCharts from './sector-detail-charts';
import './sector-detail.css';

const title='미국 섹터별 공포탐욕지수·공탐 | 11개 업종 투자심리 - ZGmini';
const description='미국 주식 11개 섹터의 공포·탐욕 지수를 5개 핵심 신호와 252거래일 데이터로 분석합니다. 기술·금융·에너지·헬스케어 등 업종별 공탐 지수와 섹터 ETF 투자심리, 강세·약세 흐름을 비교하세요.';
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
    <p>미국 11개 GICS 섹터의 공포탐욕지수(공탐 지수)를 업종별로 비교합니다. 섹터 공탐은 ETF 기반 자체 투자심리 점수이며 CNN 미국 전체 시장 지수와 다릅니다.</p>
   </header>
   <SectorDetailCharts/>
 <InvestorSearchGuide id="investor-search-sector-fear-greed" copy={SECTOR_INVESTOR_SEARCH} collapsible wideLast/>
  </div>
 </main></>;
}
