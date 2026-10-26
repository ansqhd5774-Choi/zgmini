import type {Metadata} from 'next';
import SiteHeader from '@/components/site-header';
import {WebPageJsonLd} from '../seo-jsonld';
import MarketCalendar from './market-calendar-client';
import './market-calendar.css';

const title='시장 캘린더 | 경제지표·기업 실적 발표 일정 - ZGmini';
const description='미국 경제지표와 기업 실적 발표 일정을 주간·월간 달력으로 살펴보세요. 공식 일정 출처, 한국시간, 확인된 발표값과 남은 시간을 구분하여 표시합니다. 미연결·미확인 일정은 제공하지 않습니다.';
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
    <span className="mc-timezone">대한민국 시간 · KST</span>
   </header>
   <MarketCalendar/>
   <p className="mc-note">공식 기관에서 확인한 발표 일정과 저장된 자료만 표시합니다. 일정은 변경될 수 있으며 발표 시각이 확인되지 않은 항목에는 정확한 시간 카운트다운을 표시하지 않습니다. 기업별 실적 일정은 검증된 제공원 연결 전까지 미제공입니다.</p>
  </div>
 </main>
 </>;
}
