import type {Metadata} from 'next';
import SiteHeader from '@/components/site-header';
import {WebPageJsonLd} from '../seo-jsonld';
import MarketCalendar from './market-calendar-client';
import './market-calendar.css';

const title='시장 캘린더 | 경제지표·기업 실적 발표 일정 - ZGmini';
const description='미국 경제지표와 기업 실적 발표 예정일을 주간·월간 달력에서 확인하세요. 중요도 필터로 주요 일정을 살펴보고 공식 발표값·제공원 예정일·확인된 한국시간을 구분합니다.';
const path='/market-calendar/';

export const metadata:Metadata={
 title,description,alternates:{canonical:`https://zgmini.kr${path}`},
 openGraph:{title,description,url:`https://zgmini.kr${path}`,type:'website',siteName:'ZGmini'},
 twitter:{card:'summary_large_image',title,description,images:['https://zgmini.kr/zgmini-search-share.png']},
};

export default function MarketCalendarPage(){return <>
 <SiteHeader/>
 <main className="mc-page">
  <WebPageJsonLd name={title} description={description} path={path}/>
  <div className="mc-frame">
   <header className="mc-hero">
    <div><p className="mc-eyebrow">MARKET CALENDAR</p><h1>시장 캘린더</h1><p className="mc-lead">경제지표 · 기업 실적 발표 일정을 한눈에</p></div>
    <span className="mc-timezone">기관 발표일 · 확인 시각 KST</span>
   </header>
   <MarketCalendar/>
   <p className="mc-note">미국 기관에서 저장한 일정 날짜는 미국 현지 발표일 기준입니다. 시각이 따로 검증된 항목만 한국시간(KST)으로 표시합니다. 시각 미확정 항목의 남은 일수는 발표기관 날짜 기준으로 계산하므로 시간 단위 카운트다운은 제공하지 않습니다. 기업 실적은 EarningsAPI 제공 예정일로 기업이 확정한 발표 시각이 아니며, 날짜와 장전·장후 구분은 변경될 수 있습니다.</p>
  </div>
 </main>
 </>;
}
