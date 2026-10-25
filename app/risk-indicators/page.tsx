import InvestorSearchGuide from '../../components/investor-search-guide';
import {RISKHUB_INVESTOR_SEARCH} from '../../lib/investor-search-content';
import type {Metadata} from 'next';
import SiteHeader from '../../components/site-header';
import {WebPageJsonLd} from '../seo-jsonld';
import RiskIndicatorsClient from './risk-indicators-client';
import './risk-indicators.css';

const title='미국 경제 위험 지표 8가지 | 경기침체·인플레이션·신용위기 - ZGmini';
const description='미국 경제 위기 신호를 8대 위험 지표의 안정 점수로 비교하세요. 주식 투자자가 함께 확인하는 경기침체·리세션, 인플레이션, 스태그플레이션, 신용경색, 실적 침체, 자산 버블, 부채 위험, 공급 충격과 저장 이력 차트를 제공합니다.';
export const metadata:Metadata={title,description,alternates:{canonical:'https://zgmini.kr/risk-indicators/'},openGraph:{title,description,url:'https://zgmini.kr/risk-indicators/'},twitter:{card:'summary_large_image',title,description,images:['https://zgmini.kr/zgmini-search-share.png']}};
export default function RiskIndicatorsPage(){return <><SiteHeader/><WebPageJsonLd name={title} description={description} path="/risk-indicators/"/><RiskIndicatorsClient/><div className="mx-auto max-w-6xl px-4 pb-8 sm:px-8"><InvestorSearchGuide id="investor-search-risk-hub" copy={RISKHUB_INVESTOR_SEARCH}/></div></>}
